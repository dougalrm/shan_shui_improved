import Range from "../classes/Range";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { IScrollableCanvas } from "../interfaces/IScrollableCanvas";
import { RenderedLayer } from "../classes/Renderer";
import { runWhenIdle } from "../utils/idle";
import { usePanGestures } from "./usePanGestures";
import {
    HORIZON_BOTTOM,
    HORIZON_TOP,
    inkDefs,
    WATER_FADE_TOP,
} from "../utils/ink";
import { config } from "../config";
import { Weather } from "./Weather";

const SVG_NS = "http://www.w3.org/2000/svg";
const WORLD_HEIGHT = config.world.height;

/** Size (px) of the paper grain tile */
const GRAIN_TILE = 256;

/**
 * The paper's grain: lit fractal noise made seamless (stitchTiles), turned into translucent
 * dark speckle so it darkens whatever is under it the way the paper would, without needing to
 * blend. Gentler and finer than it used to be.
 */
const GRAIN = (() => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${GRAIN_TILE}' height='${GRAIN_TILE}'><filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.035' numOctaves='4' stitchTiles='stitch'/><feDiffuseLighting lighting-color='white' surfaceScale='1.2'><feDistantLight azimuth='45' elevation='60'/></feDiffuseLighting><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.42 0 0 0 0.42'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

/** Only show the loader if rendering takes longer than this (ms) */
const LOADER_DELAY = 150;
/** Layers are thousands of elements. They are added a slice at a time, about this many characters each */
const CHUNK_SIZE = 16000;
/** Roughly how long (ms) it takes to parse and add one slice of a layer */
const CHUNK_COST = 1;
/** Roughly how long (ms) it takes to remove a layer from the page */
const REMOVE_COST = 3;

/** Split markup that has one element per line into pieces of roughly `size` characters, never cutting an element */
function* chunkLines(content: string, size: number) {
    let start = 0;

    while (start < content.length) {
        let end = Math.min(start + size, content.length);
        if (end < content.length) {
            const newline = content.indexOf("\n", end);
            end = newline === -1 ? content.length : newline + 1;
        }
        yield content.slice(start, end);
        start = end;
    }
}

export const ScrollableCanvas = ({
    windowHeight,
    newPosition,
    engine,
    windowWidth,
    viewWidth,
    scale,
    renderer,
    reloadCount,
}: IScrollableCanvas) => {
    /** Receives drags and wheel movement */
    const canvasRef = useRef<HTMLDivElement>(null);
    /** What the engine moves */
    const worldRef = useRef<HTMLDivElement>(null);
    /** Holds one <svg> per layer */
    const pictureRef = useRef<HTMLDivElement>(null);
    /** Layer elements currently in the DOM, so only the changes are touched when scrolling */
    const nodesRef = useRef(new Map<string, SVGSVGElement>());
    const reloadRef = useRef(reloadCount);
    const syncRef = useRef({ running: false, pending: null as RenderedLayer[] | null });
    /** Bumped on reload, so a sync that is still under way knows it is for the old picture */
    const epochRef = useRef(0);

    usePanGestures(canvasRef, engine);

    // Where the grain strip starts: a window behind the view, snapped to whole tiles
    const grainLeft =
        Math.floor((newPosition * scale - windowWidth) / GRAIN_TILE) * GRAIN_TILE;

    // The engine moves the picture with an animation the browser runs off the main thread
    useLayoutEffect(() => {
        if (worldRef.current) engine.attach(worldRef.current);
        return () => engine.detach();
    }, [engine]);

    // Add, remove and reorder only the layers that changed since the last render. Every step is
    // queued up front as a small job that runs in spare time, so no single frame has to absorb a
    // whole layer and the scheduler can fit several jobs into one idle period. Jobs run in order.
    // `shouldStop` is asked before each layer, so a newer request can take over between layers.
    const syncLayers = (
        layers: RenderedLayer[],
        epoch: number,
        shouldStop: () => boolean
    ): Promise<unknown> => {
        const picture = pictureRef.current;
        if (!picture) return Promise.resolve();

        const nodes = nodesRef.current;
        const wanted = new Set(layers.map(({ key }) => key));
        const jobs: Promise<unknown>[] = [];
        let aborted = false;
        /** Where the next layer belongs: the node it has to go in front of */
        let next: ChildNode | null = null;

        const queue = (job: () => void, cost: number) =>
            jobs.push(
                runWhenIdle(() => {
                    // A reload makes the rest of this plan pointless
                    if (epoch !== epochRef.current) aborted = true;
                    if (!aborted) job();
                }, cost)
            );

        nodes.forEach((node, key) => {
            if (wanted.has(key)) return;
            queue(() => {
                node.remove();
                nodes.delete(key);
            }, REMOVE_COST);
        });

        queue(() => {
            next = picture.firstChild;
        }, 0);

        const place = (key: string, tag: string) => () => {
            if (shouldStop()) {
                aborted = true;
                return;
            }
            const existing = nodes.get(key);

            if (existing) {
                if (existing === next) {
                    next = existing.nextSibling;
                } else {
                    picture.insertBefore(existing, next);
                }
            } else {
                // An empty layer goes into its place first, then it is filled slice by slice
                // Each layer is its own <svg>, so Chrome only repaints the layer that changed.
                // Inside one big <svg> any change repainted every element of the picture.
                const created = document.createElementNS(SVG_NS, "svg");
                created.classList.add("Layer", `is-${tag}`);
                if (tag === "clouds") {
                    // Each band drifts at its own pace, from its own point in the cycle
                    const hash = Array.from(key).reduce((h, c) => h * 31 + c.charCodeAt(0), 7);
                    created.style.animationDuration = `${70 + (Math.abs(hash) % 60)}s`;
                    created.style.animationDelay = `-${Math.abs(hash >> 3) % 60}s`;
                }
                created.id = `${key}-${tag}`;
                picture.insertBefore(created, next);
                nodes.set(key, created);
            }
        };

        const fill = (key: string, chunk: string) => () =>
            nodes.get(key)?.insertAdjacentHTML("beforeend", chunk);

        for (const { key, tag, content } of layers) {
            const isNew = !nodes.has(key);

            queue(place(key, tag), CHUNK_COST);

            if (!isNew) continue;

            for (const chunk of chunkLines(content, CHUNK_SIZE)) {
                queue(fill(key, chunk), CHUNK_COST);
            }
        }

        return Promise.all(jobs);
    };

    // Only one sync runs at a time. Requests that arrive meanwhile replace each other, so the
    // one that finally runs is always the latest
    const requestSync = (layers: RenderedLayer[]) => {
        const state = syncRef.current;
        state.pending = layers;
        if (state.running) return;

        state.running = true;
        (async () => {
            try {
                while (state.pending) {
                    const next = state.pending;
                    state.pending = null;
                    await syncLayers(next, epochRef.current, () => state.pending !== null);
                }
            } catch (error) {
                console.error(error);
            } finally {
                state.running = false;
            }
        })();
    };

    // Render the visible range plus a margin each side, so scrolling never outruns the content
    useEffect(() => {
        let cancelled = false;
        const loader = document.getElementById("Loader") as HTMLElement;
        const loaderText = document.getElementById("LoaderText") as HTMLElement;
        // Content is kept ready well ahead of the view, so even fast scrolling never outruns it
        const range = new Range(
            Math.max(0, newPosition - viewWidth / 2),
            newPosition + viewWidth * 2
        );

        // A reload throws the old picture away and jumps straight to the new one
        if (reloadRef.current !== reloadCount) {
            reloadRef.current = reloadCount;
            epochRef.current++;
            syncRef.current.pending = null;
            nodesRef.current.forEach((node) => node.remove());
            nodesRef.current.clear();
        }

        const loaderTimer = setTimeout(() => {
            loader.classList.remove("hidden");
            loaderText.innerText = "Creating elements...";
        }, LOADER_DELAY);

        renderer
            .renderLayers(range)
            .then((layers) => {
                if (!cancelled) requestSync(layers);
            })
            .catch(console.error)
            .finally(() => {
                clearTimeout(loaderTimer);
                loader.classList.add("hidden");
            });

        return () => {
            cancelled = true;
            clearTimeout(loaderTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderer, newPosition, viewWidth, reloadCount]);

    return (
        <div id="ScrollableCanvas">
            <div id="Canvas" ref={canvasRef}>
                {/* The sun going down at dusk, low over the far shore: a pale vermilion disc in
                    a warm glow, as ink painters add it */}
                <svg
                    id="Sun"
                    width={windowWidth}
                    height={windowHeight}
                    aria-hidden="true"
                >
                    <defs>
                        <radialGradient id="sunGlow">
                            <stop offset="0.2" style={{ stopColor: "var(--sun)", stopOpacity: 0.3 }} />
                            <stop offset="1" style={{ stopColor: "var(--sun)", stopOpacity: 0 }} />
                        </radialGradient>
                    </defs>
                    <circle
                        cx={windowWidth * 0.24}
                        cy={windowHeight * 0.235}
                        r={windowHeight * 0.16}
                        fill="url(#sunGlow)"
                    />
                    <circle
                        cx={windowWidth * 0.24}
                        cy={windowHeight * 0.235}
                        r={windowHeight * 0.036}
                        style={{ fill: "var(--sun)", fillOpacity: 0.7 }}
                    />
                </svg>
                {/* The moon, at night. It stays put in the sky while the landscape passes in
                    front of it, as a real one would */}
                <svg
                    id="Moon"
                    width={windowWidth}
                    height={windowHeight}
                    aria-hidden="true"
                >
                    <defs>
                        <radialGradient id="moonGlow">
                            <stop offset="0.3" style={{ stopColor: "var(--moon)", stopOpacity: 0.28 }} />
                            <stop offset="1" style={{ stopColor: "var(--moon)", stopOpacity: 0 }} />
                        </radialGradient>
                    </defs>
                    <circle
                        cx={windowWidth * 0.78}
                        cy={windowHeight * 0.16}
                        r={windowHeight * 0.12}
                        fill="url(#moonGlow)"
                    />
                    <circle
                        cx={windowWidth * 0.78}
                        cy={windowHeight * 0.16}
                        r={windowHeight * 0.032}
                        style={{ fill: "var(--moon)" }}
                    />
                </svg>
{/* Open water: a pale wash below the far shore. It doesn't move sideways, being
    the same everywhere; mountains hide it where they stand */}
<svg
    id="Water"
    width={windowWidth}
    height={windowHeight}
    viewBox={`0 0 100 ${WORLD_HEIGHT}`}
    preserveAspectRatio="none"
    aria-hidden="true"
>
    <rect
        x="0"
        y={WATER_FADE_TOP}
        width="100"
        height={WORLD_HEIGHT - WATER_FADE_TOP}
        fill="url(#water)"
    />
</svg>
                {/* A haze of the season's colour along the horizon */}
                <svg
                    id="Horizon"
                    width={windowWidth}
                    height={windowHeight}
                    viewBox={`0 0 100 ${WORLD_HEIGHT}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <rect
                        x="0"
                        y={HORIZON_TOP}
                        width="100"
                        height={HORIZON_BOTTOM - HORIZON_TOP}
                        fill="url(#horizon)"
                    />
                </svg>
                <div id="World" ref={worldRef}>
                    {/* Scales the painting to the window; the engine moves #World */}
                    <div
                        id="Scaled"
                        ref={pictureRef}
                        style={{ transform: `scale(${scale})` }}
                    />
                    {/* The grain of the paper moves with the picture. It is a seamless tile on
                        a strip three windows wide, re-anchored to whole tiles as the picture
                        scrolls, so it never visibly jumps */}
                    <div
                        id="Grain"
                        aria-hidden="true"
                        style={{
                            left: grainLeft,
                            width: windowWidth * 3 + GRAIN_TILE * 2,
                            height: windowHeight,
                            backgroundImage: GRAIN,
                            backgroundSize: `${GRAIN_TILE}px ${GRAIN_TILE}px`,
                        }}
                    />
                </div>
                {/* Gradients and such the picture refers to, e.g. the mist */}
                <svg
                    id="InkDefs"
                    width="0"
                    height="0"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: `<defs>${inkDefs()}</defs>` }}
                />
                <Weather />
                {/* The colour of the paper, multiplied over everything. It is the same
                    everywhere, so it can stay put while the picture scrolls */}
                <div id="PaperTint" aria-hidden="true" />
            </div>
            <div id="Loader" className="hidden">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="200"
                    height="100"
                    viewBox="0 0 200 100"
                    data-testid="infinity-spin"
                >
                    <path
                        data-testid="infinity-spin-path-1"
                        stroke="rgba(0, 0, 0, 0.4)"
                        fill="none"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeMiterlimit="10"
                        d="M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1 c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z"
                        id="InfinityLoop"
                    ></path>
                    <path
                        data-testid="infinity-spin-path-2"
                        opacity="0.07"
                        fill="none"
                        stroke="rgba(0, 0, 0, 0.4)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeMiterlimit="10"
                        d="M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1 c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z"
                    ></path>
                </svg>
                <p id="LoaderText"></p>
            </div>
        </div>
    );
};
