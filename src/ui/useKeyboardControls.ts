import ScrollEngine from "../classes/ScrollEngine";
import { useEffect } from "react";

/** A held arrow key scrolls this many times the step size per second */
const HOLD_SPEED_FACTOR = 6;
/** Holding Shift as well multiplies that again */
const SHIFT_FACTOR = 3;
/** Page Up / Down move this much of a screen */
const PAGE_FRACTION = 0.8;

interface IKeyboardControls {
    engine: ScrollEngine;
    /** The scroll step (px), which sets how fast held arrows scroll */
    step: number;
    togglePlay: () => void;
    changeSpeed: (direction: 1 | -1) => void;
    toggleFullscreen: () => void;
    toggleControls: () => void;
    toggleHelp: () => void;
    closeHelp: () => void;
}

/** Whether a key press belongs to something else: typing in a field or a browser shortcut */
const isForSomethingElse = (event: KeyboardEvent) =>
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement;

/**
 * Keyboard shortcuts for moving around the picture. Dark mode (D) and closing the
 * menu (Esc) live with the settings panel, which owns them.
 */
export const useKeyboardControls = ({
    engine,
    step,
    togglePlay,
    changeSpeed,
    toggleFullscreen,
    toggleControls,
    toggleHelp,
    closeHelp,
}: IKeyboardControls) => {
    useEffect(() => {
        /** -1, 0 or 1 for the arrow that is held down */
        let held = 0;
        let shift = false;

        const updateHeld = () =>
            engine.setHeldSpeed(
                held * step * HOLD_SPEED_FACTOR * (shift ? SHIFT_FACTOR : 1)
            );

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Shift") {
                shift = true;
                if (held) updateHeld();
                return;
            }
            if (isForSomethingElse(event)) return;

            switch (event.key) {
                case " ":
                    // A focused button is pressed with Space, leave that alone
                    if (event.target instanceof HTMLButtonElement) return;
                    event.preventDefault();
                    if (!event.repeat) togglePlay();
                    break;
                case "ArrowLeft":
                case "ArrowRight":
                    event.preventDefault();
                    held = event.key === "ArrowLeft" ? -1 : 1;
                    shift = event.shiftKey;
                    updateHeld();
                    break;
                case "PageUp":
                case "PageDown":
                    event.preventDefault();
                    engine.scrollBy(
                        (event.key === "PageUp" ? -1 : 1) *
                            (window.innerWidth / engine.scale) *
                            PAGE_FRACTION
                    );
                    break;
                case "Home":
                    event.preventDefault();
                    engine.scrollTo(0);
                    break;
                case "+":
                case "=":
                    changeSpeed(1);
                    break;
                case "-":
                case "_":
                    changeSpeed(-1);
                    break;
                case "f":
                case "F":
                    toggleFullscreen();
                    break;
                case "h":
                case "H":
                    toggleControls();
                    break;
                case "?":
                    toggleHelp();
                    break;
                case "Escape":
                    closeHelp();
                    break;
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            if (event.key === "Shift") {
                shift = false;
                if (held) updateHeld();
            }
            if (
                (event.key === "ArrowLeft" && held === -1) ||
                (event.key === "ArrowRight" && held === 1)
            ) {
                held = 0;
                updateHeld();
            }
        };

        // Keys released while the window is in the background never send keyup
        const release = () => {
            held = 0;
            shift = false;
            updateHeld();
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", release);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", release);
            release();
        };
    }, [
        engine,
        step,
        togglePlay,
        changeSpeed,
        toggleFullscreen,
        toggleControls,
        toggleHelp,
        closeHelp,
    ]);
};
