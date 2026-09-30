import PRNG from "./PRNG";
import Range from "./Range";
import { GeneratedFrame, GeneratorRequest } from "../workers/messages";
import { LayerType } from "../types/LayerType";
import { config } from "../config";
import { inkDefs, inkStylesheet } from "../utils/ink";

const TAG_ORDER = config.renderer.tagOrder;
const CHUNK_WIDTH = config.world.chunkWidth;

/** A layer that was rendered to SVG markup, identified by a stable key */
export interface RenderedLayer {
    key: string;
    tag: LayerType;
    /** The elements of the layer, one per line, without the wrapping <g> */
    content: string;
}

/** A finished layer with everything needed to place it and draw it */
interface PlacedLayer extends RenderedLayer {
    x: number;
    y: number;
    range: Range;
}

/** A finished frame: the layers plus the range they cover together */
interface PlacedFrame {
    range: Range;
    layers: PlacedLayer[];
}

export default class Renderer {
    /** The chunks generated so far, by chunk number (see config.world.chunkWidth) */
    frames = new Map<number, PlacedFrame>();
    /** Making sure that the new render area is at least 1500px ahead of the current frame range
     * so the user doesn't need to render the scene on every click.
     * This value get populated in App.tsx
     */
    static forwardCoverage = 0;
    /** Keeeping the current visible range so layers not within range can be hidden.
     *  This value is kept so the Frame.ts can use it without relaying on the
     *  ScrollableCanvas's newPosition parameter
     */
    static visibleRange = new Range(0, 0);

    /** Designs and builds frames off the main thread, created when first needed */
    private worker?: Worker;
    /** Chunks the worker is still busy with, by chunk number */
    private pending = new Map<
        number,
        { resolve: (frame: GeneratedFrame) => void; reject: (e: Error) => void }
    >();

    /** Renders are chained so a slow one can never be overtaken by (or interleave with) a newer one */
    private queue: Promise<unknown> = Promise.resolve();

    /**
     * Render picture based on the given range.
     * @param range - The new range of the canvas
     * @return {Promise<string>} The svg content of all layers visible in the range
     */
    public async render(range: Range): Promise<string> {
        const layers = await this.renderLayers(range);
        return layers
            .map(
                ({ key, tag, content }) =>
                    `<g id="${key}-${tag}">${content}</g>`
            )
            .join("\n");
    }

    /**
     * Render the layers visible in the given range, in painting order. Layers are only
     * rendered once, so calling this again for an overlapping range is cheap.
     * @param range - The range to render
     * @return {Promise<RenderedLayer[]>} The rendered layers sorted back to front
     */
    public renderLayers(range: Range): Promise<RenderedLayer[]> {
        const result = this.queue.then(() => this.renderRange(range));
        this.queue = result.catch(() => undefined);
        return result;
    }

    private async renderRange(range: Range): Promise<RenderedLayer[]> {
        Renderer.visibleRange = range;

        // Every chunk the range touches, plus one to the left (mountains reach over the
        // border) and enough ahead that scrolling on doesn't have to wait
        const first = Math.max(0, Math.floor(range.start / CHUNK_WIDTH) - 1);
        const last = Math.floor(
            (range.end + Renderer.forwardCoverage) / CHUNK_WIDTH
        );

        for (let index = first; index <= last; index++) {
            if (!this.frames.has(index)) {
                this.frames.set(index, await this.createChunk(index));
            }
        }

        // Collect of visible layers
        const visibleLayers: Array<{ layer: PlacedLayer }> = [];
        this.frames.forEach((frame) => {
            if (!Renderer.visibleRange.isShowing(frame.range)) return;
            for (const layer of frame.layers) {
                if (Renderer.visibleRange.isShowing(layer.range)) {
                    visibleLayers.push({ layer });
                }
            }
        });

        // Sort them by the tag order so they will be rendered in the right order
        visibleLayers.sort(({ layer: a }, { layer: b }) => {
            if (TAG_ORDER[a.tag] !== TAG_ORDER[b.tag]) {
                return TAG_ORDER[a.tag] - TAG_ORDER[b.tag];
            } else if (a.y !== b.y) {
                return a.y - b.y;
            } else {
                return a.x - b.x;
            }
        });

        return visibleLayers.map(({ layer }) => ({
            key: layer.key,
            tag: layer.tag,
            content: layer.content,
        }));
    }

    /**
     * Forget the current picture and start over with PRNG's current seed.
     * Waits for renders already under way, so none of them sees a half-reset state.
     */
    public reset(): void {
        this.queue = this.queue
            .catch(() => undefined)
            .then(() => {
                this.frames.clear();
                Renderer.visibleRange = new Range(0, 0);
                this.send({ type: "seed", seed: PRNG.rawSeed });
            });
    }

    private send(request: GeneratorRequest): void {
        if (!this.worker) {
            const worker = new Worker(
                new URL("../workers/generator.worker.ts", import.meta.url)
            );

            worker.onmessage = ({ data }: MessageEvent<GeneratedFrame>) => {
                this.pending.get(data.id)?.resolve(data);
                this.pending.delete(data.id);
            };
            worker.onerror = (event) => {
                const error = new Error(`Generator failed: ${event.message}`);
                this.pending.forEach(({ reject }) => reject(error));
                this.pending.clear();
            };

            this.worker = worker;
            worker.postMessage({ type: "seed", seed: PRNG.rawSeed });
        }
        this.worker.postMessage(request);
    }

    /**
     * Generate one chunk of the world. The work is done by the worker.
     * @private
     * @param {number} index - The chunk number
     * @returns {Promise<PlacedFrame>} the chunk as a promise
     */
    private async createChunk(index: number): Promise<PlacedFrame> {
        const generated = await new Promise<GeneratedFrame>(
            (resolve, reject) => {
                this.pending.set(index, { resolve, reject });
                this.send({ type: "chunk", index });
            }
        );

        const frameRange = new Range(Infinity, -Infinity);
        const layers = generated.layers.map((layer, layerNum) => {
            const key = `chunk${index}-layer${layerNum}`;

            frameRange.start = Math.min(frameRange.start, layer.start);
            frameRange.end = Math.max(frameRange.end, layer.end);

            return {
                key,
                tag: layer.tag,
                x: layer.x,
                y: layer.y,
                range: new Range(layer.start, layer.end),
                content: layer.svg,
            };
        });

        return { range: frameRange, layers };
    }

    /**
     * Downloads the terrain SVG based on the given parameters. The file carries the current
     * palette (day or night) with it, since it can't rely on the page's CSS.
     * @param seed - The seed for the terrain generation.
     * @param range - The range for which to generate the SVG.
     * @param windowHeight - The height of the SVG.
     */
    public async download(
        seed: string,
        range: Range,
        windowHeight: number
    ): Promise<void> {
        const filename: string = `${seed}-[${range.start}, ${range.end}].svg`;
        const viewbox = `${range.start} 0 ${range.length} ${windowHeight}`;
        const palette = getComputedStyle(document.body);
        const color = (name: string) => palette.getPropertyValue(name).trim();
        const svg = await this.render(range);
        const box = `x="${range.start}" y="0" width="${range.length}" height="${windowHeight}"`;
        const content: string = `<svg xmlns="http://www.w3.org/2000/svg" width="${range.length}" height="${windowHeight}" viewBox="${viewbox}">
    <style>
        svg { --ink: ${color("--ink")}; --silk: ${color("--silk")}; }
        ${inkStylesheet()}
    </style>
    <defs>
        ${inkDefs()}
        <filter id="roughpaper" ${box} filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" stitchTiles="stitch" baseFrequency="0.02" numOctaves="5" result="noise"/>
            <feDiffuseLighting in="noise" lighting-color="${color("--paper-light")}" surfaceScale="2" result="diffLight">
                <feDistantLight azimuth="45" elevation="60"/>
            </feDiffuseLighting>
        </filter>
    </defs>
    <rect id="Silk" ${box} fill="${color("--silk")}"/>
    <g id="main">
${svg}
    </g>
    <rect id="Background" ${box} filter="url(#roughpaper)" style="mix-blend-mode: multiply"/>
</svg>`;

        // A blob URL copes with pictures far bigger than a data: URL can hold
        const url = URL.createObjectURL(
            new Blob([content], { type: "image/svg+xml" })
        );
        const element = document.createElement("a");

        element.href = url;
        element.download = filename;
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }
}
