import ScrollEngine from "../classes/ScrollEngine";
import { RefObject, useEffect } from "react";

/** Only the pointer movement within this window (ms) counts towards the fling speed */
const VELOCITY_WINDOW = 100;
/** Wheel gestures count as over once no event arrived for this long (ms) */
const WHEEL_IDLE = 120;

/**
 * Trackpads send a stream of small pixel moves, mouse wheels send notches.
 * Chrome and Safari keep the old `wheelDelta` next to `delta`; for trackpads it is exactly
 * -3 times the delta, for a mouse wheel it's a multiple of 120. Elsewhere, guess from the size.
 */
const isTrackpad = (event: WheelEvent) => {
    if (event.deltaMode !== 0) return false;

    const legacy = event as WheelEvent & { wheelDeltaX?: number; wheelDeltaY?: number };
    if (legacy.wheelDeltaY !== undefined && legacy.wheelDeltaX !== undefined) {
        return legacy.wheelDeltaY
            ? legacy.wheelDeltaY === -3 * event.deltaY
            : legacy.wheelDeltaX === -3 * event.deltaX;
    }
    return Math.abs(event.deltaY) < 50 && Math.abs(event.deltaX) < 50;
};

/**
 * Pan the picture by dragging it (mouse, pen or touch) or with a wheel / trackpad.
 * Dragging follows the pointer exactly and flings on release; auto-scroll pauses while
 * the picture is held and eases back in afterwards.
 * @param {RefObject<HTMLElement>} targetRef - The element that receives the gestures
 * @param {ScrollEngine} engine - The engine that moves the picture
 */
export const usePanGestures = (
    targetRef: RefObject<HTMLElement | null>,
    engine: ScrollEngine
) => {
    useEffect(() => {
        const target = targetRef.current;
        if (!target) return;

        let pointerId: number | null = null;
        let startX = 0;
        let startPosition = 0;
        let samples: Array<{ time: number; x: number }> = [];
        let wheelTimer = 0;

        const onPointerDown = (event: PointerEvent) => {
            if (pointerId !== null || event.button !== 0) return;

            pointerId = event.pointerId;
            try {
                // Keep getting the moves when the pointer leaves the window mid-drag
                target.setPointerCapture(pointerId);
            } catch {
                // Not an active pointer (synthetic event): dragging still works without capture
            }
            target.classList.add("dragging");

            engine.grab();
            startX = event.clientX;
            startPosition = engine.position;
            samples = [{ time: event.timeStamp, x: event.clientX }];
        };

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;

            // Moving the pointer right pulls the picture right, i.e. back towards the start
            engine.dragTo(startPosition - (event.clientX - startX) / engine.scale);

            samples.push({ time: event.timeStamp, x: event.clientX });
            while (samples.length > 2 && event.timeStamp - samples[0].time > VELOCITY_WINDOW) {
                samples.shift();
            }
        };

        const onPointerUp = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;

            pointerId = null;
            target.classList.remove("dragging");

            const first = samples[0];
            const last = samples[samples.length - 1];
            const elapsed = (last.time - first.time) / 1000;
            // A pointer that stopped before letting go shouldn't fling
            const stillFor = event.timeStamp - last.time;
            const speed =
                elapsed > 0 && stillFor < 50
                    ? -(last.x - first.x) / elapsed / engine.scale
                    : 0;

            engine.release(event.type === "pointercancel" ? 0 : speed);
        };

        const onWheel = (event: WheelEvent) => {
            // Page up/down style wheel units, rarely used, are about a screen
            const unit =
                event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerWidth : 1;
            // The landscape only goes sideways, so vertical wheeling pans too
            const delta =
                ((Math.abs(event.deltaX) > Math.abs(event.deltaY)
                    ? event.deltaX
                    : event.deltaY) *
                    unit) /
                engine.scale;

            if (delta === 0) return;
            event.preventDefault();

            // A mouse wheel moves in notches: ease each one rather than jumping
            if (!isTrackpad(event)) {
                engine.scrollBy(delta);
                return;
            }

            // A trackpad sends a stream of small moves, with momentum from the OS: follow it
            if (!wheelTimer) engine.grab();
            engine.dragTo(engine.position + delta);

            window.clearTimeout(wheelTimer);
            wheelTimer = window.setTimeout(() => {
                wheelTimer = 0;
                engine.release(0);
            }, WHEEL_IDLE);
        };

        target.addEventListener("pointerdown", onPointerDown);
        target.addEventListener("pointermove", onPointerMove);
        target.addEventListener("pointerup", onPointerUp);
        target.addEventListener("pointercancel", onPointerUp);
        target.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            target.removeEventListener("pointerdown", onPointerDown);
            target.removeEventListener("pointermove", onPointerMove);
            target.removeEventListener("pointerup", onPointerUp);
            target.removeEventListener("pointercancel", onPointerUp);
            target.removeEventListener("wheel", onWheel);
            window.clearTimeout(wheelTimer);
        };
    }, [targetRef, engine]);
};
