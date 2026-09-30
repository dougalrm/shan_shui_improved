import PRNG from "./PRNG";
import Range from "./Range";
import { GeneratedFrame, GeneratorRequest } from "../workers/messages";
import { LayerType } from "../types/LayerType";
import { config } from "../config";

const TAG_ORDER = config.renderer.tagOrder;

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
    /** Keeping the frames array with frames ready to be render in current scenne */
    frames: PlacedFrame[] = [];
    /** Making sure that the new render area is at least 1500px ahead of the current frame range
     * so the user doesn't need to render the scene on every click.
     * This value get populated in App.tsx
     */
    static forwardCoverage = 0;
    /** Keeping the range that was already covered by renderer */
    static coveredRange = new Range(0, 0);
    /** Keeeping the current visible range so layers not within range can be hidden.
     *  This value is kept so the Frame.ts can use it without relaying on the
     *  ScrollableCanvas's newPosition parameter
     */
    static visibleRange = new Range(0, 0);

    /** Designs and builds frames off the main thread, created when first needed */
    private worker?: Worker;
    /** Frames the worker is still busy with, by frame id */
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
        // Set the new range as a visible range before adjusting it
        const newRange = new Range(range.start, range.end);

        Renderer.visibleRange = range;

        // Check if the rendering of new frame is needed based on already covered range
        if (!Renderer.coveredRange.contains(range)) {
            // Trim the newRange so it covers only the uncovered range
            if (range.start < Renderer.coveredRange.end) {
                newRange.start = Renderer.coveredRange.end;
            }

            // Expand the range so the scene it's not render every time when user clicks forward
            if (range.end >= Renderer.coveredRange.end) {
                newRange.end += Renderer.forwardCoverage;
                Renderer.coveredRange.end = newRange.end;
            }

            // Shound't happen but just in case
            if (newRange.end < newRange.start)
                console.error(
                    "Trimmed range of new frame is invalid as the end is less than the start"
                );

            const newFrame = await this.createNewFrame(newRange);
            this.frames.push(newFrame);
        }

        // Collect of visible layers
        const visibleLayers = [];
        for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            if (!Renderer.visibleRange.isShowing(frame.range)) continue;
            for (let j = 0; j < frame.layers.length; j++) {
                const layer = frame.layers[j];
                if (Renderer.visibleRange.isShowing(layer.range)) {
                    visibleLayers.push({ layer, frameNum: i, layerNum: j });
                }
            }
        }

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
                this.frames = [];
                Renderer.coveredRange = new Range(0, 0);
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
     * Design and create new frame within given range. The work is done by the worker.
     * @private
     * @param {Range} range - Designer's range
     * @returns {Promise<PlacedFrame>} newly created frame as a promise
     */
    private async createNewFrame(range: Range): Promise<PlacedFrame> {
        const id = this.frames.length + 1;
        const generated = await new Promise<GeneratedFrame>(
            (resolve, reject) => {
                this.pending.set(id, { resolve, reject });
                this.send({ type: "frame", id, start: range.start, end: range.end });
            }
        );

        const frameRange = new Range(Infinity, -Infinity);
        const layers = generated.layers.map((layer, layerNum) => {
            const key = `frame${id - 1}-layer${layerNum}`;

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
     * Downloads the terrain SVG based on the given parameters.
     * @param seed - The seed for the terrain generation.
     * @param range - The range for which to generate the SVG.
     * @param windowHeight - The height of the SVG.
     */
    public async download(
        seed: string,
        range: Range,
        windowHeight: number,
        darkMode?: boolean
    ): Promise<void> {
        const filename: string = `${seed}-[${range.start}, ${range.end}].svg`;
        const viewbox = `${range.start} 0 ${range.length} ${windowHeight}`;
        const element = document.createElement("a");
        const svg = await this.render(range);
        const content: string = `
        <svg 
            id="SVG" 
            xmlns="http://www.w3.org/2000/svg" 
            width="${range.length}" 
            height="${windowHeight}" 
            viewBox="${viewbox}"
            style="${darkMode && "filter: invert(1) sepia(1);"}">
            <defs>
                <filter 
                    width="${range.length}" 
                    height="${windowHeight}" 
                    id="roughpaper">
                          <feTurbulence
                            type="fractalNoise"
                            stitchTiles="stitch"
                            baseFrequency="0.02"
                            numOctaves="5"
                            result="noise"
                        />
                        <feDiffuseLighting
                            in="noise"
                            lightingColor="#F0E7D0"
                            surfaceScale="2"
                            result="diffLight"
                        >
                            <feDistantLight azimuth="45" elevation="60" />
                        </feDiffuseLighting>
                </filter>
            </defs>
            <g id="main">
                ${svg}       
            </g>
            <rect 
                id="Background" 
                width="${range.length}" 
                height="${windowHeight}" 
                filter="url(#roughpaper)" 
                style="mix-blend-mode: multiply">
            </rect>
        </svg>`;

        element.setAttribute(
            "href",
            `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
        );
        element.setAttribute("download", filename);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}
