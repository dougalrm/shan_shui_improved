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
import { SettingPanel } from "./ui/SettingPanel";
import ScrollEngine from "./classes/ScrollEngine";
import { debounce } from "./utils/utils";

/** A held arrow key scrolls this many times the step size per second */
const HOLD_SPEED_FACTOR = 6;

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
        if (urlSeed) {
            PRNG.seed = urlSeed;
        } else {
            const state = { info: "Updated URL with new seed" };
            const title = `{Shan, Shui}* - ${currentDate}`;
            const url = `/?seed=${currentDate}`;
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
    const [step, setStep] = useState(100);
    const [newPosition, setNewPosition] = useState<number>(0);
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
    const [windowHeight, setWindowHeight] = useState<number>(
        window.innerHeight
    );
    const [autoLoad, setAutoLoad] = useState<boolean>(false);
    const [saveRange, setSaveRange] = useState<Range>(
        new Range(0, window.innerWidth)
    );
    const [autoScroll, setAutoScroll] = useState<boolean>(false);
    const [reloadCount, setReloadCount] = useState(0);

    // Cannot be done via setSeed as it will rerender the scene. Look at Menu.tsx
    Renderer.forwardCoverage = window.innerWidth / 2;

    // Callback function to handle changes in the save range
    const onChangeSaveRange = (newRange: Range) => {
        setSaveRange(newRange);
    };

    // Toggle auto-scrolling state
    const toggleAutoScroll = () => {
        setAutoScroll((current) => !current);
    };

    // Toggle auto-loading state and set the save range
    const toggleAutoLoad = () => {
        setAutoLoad((current) => !current);
        setSaveRange(new Range(newPosition, newPosition + windowWidth));
    };

    // Perform only on mount
    useEffect(() => {
        // Handle window resize events with debounce
        const handleResize = debounce(() => {
            setWindowWidth(window.innerWidth);
            setWindowHeight(window.innerHeight);
        }, 200);

        window.addEventListener("resize", handleResize);

        // Set forwardCoverage
        Renderer.forwardCoverage = window.innerWidth / 2;

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

    // Ease the picture by the given distance
    const horizontalScroll = useCallback(
        (value: number) => engine.scrollBy(value),
        [engine]
    );

    // Jump to a position without animating, e.g. after a reload
    const jumpTo = useCallback(
        (position: number) => {
            engine.jumpTo(position);
            setNewPosition(position);
        },
        [engine]
    );

    // Keep the save range on the current view while auto-load is on
    useEffect(() => {
        if (autoLoad) {
            setSaveRange(new Range(newPosition, newPosition + windowWidth));
        }
    }, [autoLoad, newPosition, windowWidth]);

    // Auto-scroll drifts at a constant speed: the step size per second
    useEffect(() => {
        engine.setAutoSpeed(autoScroll ? step : 0);
    }, [engine, autoScroll, step]);

    // Holding an arrow key scrolls smoothly for as long as it is down
    useEffect(() => {
        const speed = step * HOLD_SPEED_FACTOR;

        const onKeyDown = (event: KeyboardEvent) => {
            // Let the arrows move the caret when typing in the menu
            if (event.target instanceof HTMLInputElement) return;
            if (event.key === "ArrowLeft") engine.setHeldSpeed(-speed);
            if (event.key === "ArrowRight") engine.setHeldSpeed(speed);
        };
        const onKeyUp = (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                engine.setHeldSpeed(0);
            }
        };
        const release = () => engine.setHeldSpeed(0);

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", release);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", release);
            release();
        };
    }, [engine, step]);

    return (
        <>
            <SettingPanel
                step={step}
                setStep={setStep}
                horizontalScroll={horizontalScroll}
                toggleAutoScroll={toggleAutoScroll}
                newPosition={newPosition}
                setNewPosition={jumpTo}
                renderer={rendererRef.current}
                windowWidth={windowWidth}
                windowHeight={windowHeight}
                saveRange={saveRange}
                onChangeSaveRange={onChangeSaveRange}
                toggleAutoLoad={toggleAutoLoad}
                onReload={() => setReloadCount((count) => count + 1)}
                initalSeed={initalSeed}
            />
            <ScrollableCanvas
                windowHeight={windowHeight}
                newPosition={newPosition}
                engine={engine}
                windowWidth={windowWidth}
                renderer={rendererRef.current}
                reloadCount={reloadCount}
            />
        </>
    );
};
