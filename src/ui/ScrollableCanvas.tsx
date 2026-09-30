import Range from "../classes/Range";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { IScrollableCanvas } from "../interfaces/IScrollableCanvas";
import { RenderedLayer } from "../classes/Renderer";
import { runWhenIdle } from "../utils/idle";

const SVG_NS = "http://www.w3.org/2000/svg";
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
    renderer,
    reloadCount,
}: IScrollableCanvas) => {
    /** Holds one <svg> per layer and is what the engine moves */
    const worldRef = useRef<HTMLDivElement>(null);
    /** Layer elements currently in the DOM, so only the changes are touched when scrolling */
    const nodesRef = useRef(new Map<string, SVGSVGElement>());
    const reloadRef = useRef(reloadCount);
    const syncRef = useRef({ running: false, pending: null as RenderedLayer[] | null });
    /** Bumped on reload, so a sync that is still under way knows it is for the old picture */
    const epochRef = useRef(0);

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
        const picture = worldRef.current;
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
                created.classList.add("Layer");
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
            Math.max(0, newPosition - windowWidth / 2),
            newPosition + windowWidth * 2
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
    }, [renderer, newPosition, windowWidth, reloadCount]);

    return (
        <div id="ScrollableCanvas">
            <div id="Canvas">
<div id="World" ref={worldRef} />
                {/* The paper texture never moves, so it is painted once on its own layer */}
                <svg
                    id="Paper"
                    width={windowWidth}
                    height={windowHeight}
                    viewBox={`0 0 ${windowWidth} ${windowHeight}`}
                >
                    <defs>
                        <filter
                            id="roughpaper"
                            width={windowWidth}
                            height={windowHeight}
                        >
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
                    <rect
                        id="Background"
                        filter="url(#roughpaper)"
                        width={windowWidth}
                        height={windowHeight}
                    />
                </svg>
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
