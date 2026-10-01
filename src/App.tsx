import PRNG from "./classes/PRNG";
import Range from "./classes/Range";
import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    ReactElement,
} from "react";
import Renderer from "./classes/Renderer";
import { ScrollableCanvas } from "./ui/ScrollableCanvas";
import { PaintingPanel } from "./ui/PaintingPanel";
import ScrollEngine from "./classes/ScrollEngine";
import { Controls } from "./ui/Controls";
import { Shortcuts } from "./ui/Shortcuts";
import { config } from "./config";
import { debounce } from "./utils/utils";
import {
    PaintingOptions,
    TimeOfDay,
    getPaintingOptions,
    optionsFromUrl,
    pictureUrl,
    setPaintingOptions,
    urlFor,
} from "./utils/style";
import { useKeyboardControls } from "./ui/useKeyboardControls";

const WORLD_HEIGHT = config.world.height;

/** Auto-scroll speeds to pick from (world units per second) */
const SPEEDS = [25, 50, 100, 200, 400];
/** 100px/s, shown as 1× */
const DEFAULT_SPEED = 2;
/** Start scrolling straight away, so the landscape unrolls on its own */
const PLAY_ON_LOAD = true;
/** The base distance the keys scroll by, see useKeyboardControls */
const KEY_STEP = 100;
/** Hide the controls and cursor after this long (ms) without the mouse moving, while playing */
const IDLE_DELAY = 2500;

/**
 * Main application component.
 * @component
 * @returns {ReactElement} The main application component.
 */
export const App = (): ReactElement => {
    const urlSeed = new URLSearchParams(window.location.search).get("seed");
    const currentDate = new Date().getTime().toString();
    const initalSeed = urlSeed || currentDate;

    if (!PRNG.alreadyPopulated) {
        setPaintingOptions(optionsFromUrl());

        if (urlSeed) {
            PRNG.seed = urlSeed;
        } else {
            const state = { info: "Updated URL with new seed" };
            const title = `{Shan, Shui}* - ${currentDate}`;
            const url = pictureUrl(currentDate);
            // Use pushState to add to the history stack
            window.history.pushState(state, title, url);
            // Use replaceState to replace the current history entry
            window.history.replaceState(state, title, url);

            PRNG.seed = currentDate;
        }
    }

    // Refs
    const rendererRef = useRef(new Renderer());
    const engineRef = useRef(new ScrollEngine());
    const engine = engineRef.current;

    // State variables
    const [seed, setSeed] = useState(initalSeed);
    const [options, setOptions] = useState<PaintingOptions>(getPaintingOptions);
    const [newPosition, setNewPosition] = useState<number>(0);
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
    const [windowHeight, setWindowHeight] = useState<number>(
        window.innerHeight
    );
    const [autoScroll, setAutoScroll] = useState<boolean>(PLAY_ON_LOAD);
    const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED);
    const [helpVisible, setHelpVisible] = useState(false);
    const [controlsHidden, setControlsHidden] = useState(false);
    const [idle, setIdle] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [reloadCount, setReloadCount] = useState(0);

    // The painting is scaled to fit the window height. Everything about positions and ranges
    // is in the painting's own (world) units; `viewWidth` is how much of it fits on screen.
    const scale = windowHeight / WORLD_HEIGHT;
    const viewWidth = Math.round(windowWidth / scale);

    // Cannot be done via setSeed as it will rerender the scene. Look at Menu.tsx
    Renderer.forwardCoverage = viewWidth / 2;

    // Toggle auto-scrolling state
    // Stable, so the keyboard shortcuts (which depend on it) aren't re-registered on every render
    const toggleAutoScroll = useCallback(() => {
        setAutoScroll((current) => !current);
    }, []);

    // Perform only on mount
    useEffect(() => {
        // Handle window resize events with debounce
        const handleResize = debounce(() => {
            setWindowWidth(window.innerWidth);
            setWindowHeight(window.innerHeight);
        }, 200);

        window.addEventListener("resize", handleResize);

        // Popup alert if window is too small
        if (window.innerWidth < 400) {
            window.alert(
                "Some mountains need space to grow.\nYour device's port view is too small for the full experience."
            );
        }

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    // The engine only reports the position every so often, so React stays out of the animation
    useEffect(() => {
        engine.onCommit = setNewPosition;
        return () => engine.destroy();
    }, [engine]);

    // Jump to a position without animating, e.g. after a reload
    const jumpTo = useCallback(
        (position: number) => {
            engine.jumpTo(position);
            setNewPosition(position);
        },
        [engine]
    );

    useEffect(() => engine.setScale(scale), [engine, scale]);

    // Auto-scroll drifts at a constant speed
    useEffect(() => {
        engine.setAutoSpeed(autoScroll ? SPEEDS[speedIndex] : 0);
    }, [engine, autoScroll, speedIndex]);

    const changeSpeed = useCallback((direction: 1 | -1) => {
        setSpeedIndex((index) =>
            Math.max(0, Math.min(SPEEDS.length - 1, index + direction))
        );
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen?.();
        } else {
            document.documentElement.requestFullscreen?.();
        }
    }, []);

    const toggleControls = useCallback(
        () => setControlsHidden((hidden) => !hidden),
        []
    );
    const toggleHelp = useCallback(() => setHelpVisible((shown) => !shown), []);
    const closeHelp = useCallback(() => setHelpVisible(false), []);

    useKeyboardControls({
        engine,
        step: KEY_STEP,
        togglePlay: toggleAutoScroll,
        changeSpeed,
        toggleFullscreen,
        toggleControls,
        toggleHelp,
        closeHelp,
    });

    // Follow fullscreen changes, including leaving it with Esc
    useEffect(() => {
        const onChange = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    // While playing, get the controls and cursor out of the way until the mouse moves
    useEffect(() => {
        if (!autoScroll) {
            setIdle(false);
            return;
        }

        let timer = 0;
        const wake = () => {
            setIdle(false);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                // Not while the settings or the shortcut list are open
                const menuOpen = document.querySelector("#Menu:not(.hidden)");
                if (!menuOpen && !document.getElementById("Shortcuts")) {
                    setIdle(true);
                }
            }, IDLE_DELAY);
        };

        wake();
        window.addEventListener("pointermove", wake);
        window.addEventListener("pointerdown", wake);
        window.addEventListener("keydown", wake);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("pointermove", wake);
            window.removeEventListener("pointerdown", wake);
            window.removeEventListener("keydown", wake);
        };
    }, [autoScroll]);

    // Season, weather and time of day restyle the page (palette, snow, rain, fog, the sun, the
    // night), see style.css
    useEffect(() => {
        const { season, weather, time } = options;
        const body = document.body.classList;
        Array.from(body)
            .filter((name) => /^(season|weather|time)-/.test(name))
            .forEach((name) => body.remove(name));
        body.add(`season-${season}`, `weather-${weather}`, `time-${time}`);
        body.toggle("darkmode", time === "night");
    }, [options]);

    const redraw = useCallback(() => {
        rendererRef.current.reset();
        setReloadCount((count) => count + 1);
    }, []);

    // Change some of the painting's options. The URL follows, so the link always paints what is
    // on screen. The picture is redrawn where it is, unless only the light changed.
    const changeOptions = useCallback(
        (changes: Partial<PaintingOptions>) => {
            const next = { ...getPaintingOptions(), ...changes };
            const repaint = (["style", "season", "weather"] as const).some(
                (key) => next[key] !== getPaintingOptions()[key]
            );

            setPaintingOptions(next);
            setOptions(next);
            window.history.replaceState(null, "", urlFor(PRNG.rawSeed.toString(), next));
            if (repaint) redraw();
        },
        [redraw]
    );

    // Night and back to the light before it
    const dayTime = useRef<TimeOfDay>(options.time === "night" ? "day" : options.time);
    const toggleNight = useCallback(() => {
        const { time } = getPaintingOptions();
        if (time !== "night") dayTime.current = time;
        changeOptions({ time: time === "night" ? dayTime.current : "night" });
    }, [changeOptions]);

    // Paint another seed, from the start. A new history entry, so Back returns to the last one.
    const changeSeed = useCallback(
        (next: string) => {
            PRNG.seed = next;
            setSeed(next);
            window.history.pushState(null, "", pictureUrl(next));
            redraw();
            jumpTo(0);
        },
        [redraw, jumpTo]
    );

    // Back and Forward go to the picture in the URL
    useEffect(() => {
        const onPopState = () => {
            const urlSeed = new URLSearchParams(window.location.search).get("seed");
            const next = optionsFromUrl();
            setPaintingOptions(next);
            setOptions(next);
            if (urlSeed) {
                PRNG.seed = urlSeed;
                setSeed(urlSeed);
            }
            redraw();
            jumpTo(0);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [redraw, jumpTo]);

    const download = useCallback(
        (views: number) =>
            rendererRef.current.download(
                seed,
                new Range(newPosition, newPosition + viewWidth * views),
                WORLD_HEIGHT
            ),
        [seed, newPosition, viewWidth]
    );

    useEffect(() => {
        document.body.classList.toggle("ui-idle", idle);
        document.body.classList.toggle("ui-hidden", controlsHidden);
    }, [idle, controlsHidden]);

    return (
        <>
            <PaintingPanel
                seed={seed}
                options={options}
                onSeed={changeSeed}
                onOptions={changeOptions}
                onDownload={download}
                onToggleNight={toggleNight}
            />
            <ScrollableCanvas
                windowHeight={windowHeight}
                newPosition={newPosition}
                engine={engine}
                windowWidth={windowWidth}
                viewWidth={viewWidth}
                scale={scale}
                renderer={rendererRef.current}
                reloadCount={reloadCount}
            />
            <Controls
                playing={autoScroll}
                onTogglePlay={toggleAutoScroll}
                speedLabel={`${SPEEDS[speedIndex] / SPEEDS[DEFAULT_SPEED]}×`}
                onSlower={speedIndex > 0 ? () => changeSpeed(-1) : undefined}
                onFaster={
                    speedIndex < SPEEDS.length - 1
                        ? () => changeSpeed(1)
                        : undefined
                }
                onStart={() => engine.scrollTo(0)}
                fullscreen={fullscreen}
                onToggleFullscreen={toggleFullscreen}
                onHelp={toggleHelp}
            />
            <Shortcuts visible={helpVisible} onClose={closeHelp} />
        </>
    );
};
