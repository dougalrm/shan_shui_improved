import Range from "../classes/Range";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { IScrollableCanvas } from "../interfaces/IScrollableCanvas";
import { RenderedLayer } from "../classes/Renderer";
import { runWhenIdle } from "../utils/idle";

const SVG_NS = "http://www.w3.org/2000/svg";
/** Only show the loader if rendering takes longer than this (ms) */
const LOADER_DELAY = 150;
/** Roughly how long (ms) it takes to parse and insert one layer */
const INSERT_COST = 5;

export const ScrollableCanvas = ({
    windowHeight,
    newPosition,
    engine,
    windowWidth,
    renderer,
    reloadCount,
}: IScrollableCanvas) => {
    const worldRef = useRef<SVGSVGElement>(null);
    const pictureRef = useRef<SVGGElement>(null);
    /** Layer elements currently in the DOM, so only the changes are touched when scrolling */
    const nodesRef = useRef(new Map<string, SVGGElement>());
    const reloadRef = useRef(reloadCount);

    const applyPosition = (position: number) => {
        if (worldRef.current) {
            // Moving a composited layer is free, the paths aren't repainted
            worldRef.current.style.transform = `translate3d(${-position}px,0,0)`;
        }
    };

    // Follow the engine every frame, bypassing React
    useLayoutEffect(() => {
        engine.onFrame = applyPosition;
        applyPosition(engine.position);
        return () => {
            engine.onFrame = undefined;
        };
    }, [engine]);

    // Add, remove and reorder only the layers that changed since the last render
    const syncLayers = async (
        layers: RenderedLayer[],
        isCancelled: () => boolean
    ) => {
        const picture = pictureRef.current;
        if (!picture) return;

        const nodes = nodesRef.current;
        const wanted = new Set(layers.map(({ key }) => key));

        nodes.forEach((node, key) => {
            if (!wanted.has(key)) {
                node.remove();
                nodes.delete(key);
            }
        });

        let next: ChildNode | null = picture.firstChild;

        for (const { key, svg } of layers) {
            const existing = nodes.get(key);

            if (existing) {
                if (existing === next) {
                    next = next.nextSibling;
                } else {
                    picture.insertBefore(existing, next);
                }
                continue;
            }

            // Parsing a big layer takes a few ms, so do it in spare time between frames
            const before = next;
            const added = await runWhenIdle(() => {
                if (isCancelled()) return false;
                const parser = document.createElementNS(SVG_NS, "g");
                parser.innerHTML = svg;
                const node = parser.firstElementChild as SVGGElement;
                nodes.set(key, node);
                picture.insertBefore(node, before);
                return true;
            }, INSERT_COST);

            if (!added) return;
        }
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
                if (!cancelled) return syncLayers(layers, () => cancelled);
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
                <svg
                    id="SVG"
                    ref={worldRef}
                    width={windowWidth}
                    height={windowHeight}
                    viewBox={`0 0 ${windowWidth} ${windowHeight}`}
                >
                    <g id="Picture" ref={pictureRef} />
                </svg>
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
