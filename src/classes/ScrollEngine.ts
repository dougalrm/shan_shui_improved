/** How long (s) a change of speed takes to ease in or out */
const RAMP_TIME = 0.4;
/** How long (s) a constant-speed scroll is scheduled for. It is restarted whenever the speed changes */
const DRIFT_TIME = 3600;
/** How often (ms) the position is checked to tell React about it */
const COMMIT_INTERVAL = 100;
const EASE_IN_OUT = "cubic-bezier(0.4, 0, 0.2, 1)";
const EASE_OUT = "cubic-bezier(0.2, 0, 0, 1)";

const translate = (position: number) => `translate3d(${-position}px,0,0)`;

type Mode = "rest" | "tween" | "drift";

/**
 * Drives the horizontal scroll position of the picture.
 *
 * The motion is a Web Animation on the picture's transform, so the browser runs it on the
 * compositor thread: it stays perfectly smooth however busy the main thread is (adding new
 * scenery, React, garbage collection...). JavaScript only plans the motion, it never has to
 * move anything per frame.
 *
 * - `scrollBy` eases to a new position (buttons).
 * - `setAutoSpeed` / `setHeldSpeed` scroll at a constant speed (auto-scroll, held keys),
 *   easing in and out when the speed changes.
 *
 * React only hears about the position every `commitDistance` px and when coming to rest
 * (`onCommit`), never once per frame.
 */
export default class ScrollEngine {
    /** Called with a whole-pixel position every `commitDistance` px and when coming to rest */
    onCommit?: (position: number) => void;

    private element?: HTMLElement;
    private animation?: Animation;
    private mode: Mode = "rest";
    /** Where the running tween is heading, so repeated clicks add up */
    private target = 0;
    /** Speed (px/s) of the running constant-speed scroll */
    private velocity = 0;
    private autoSpeed = 0;
    private heldSpeed = 0;
    private committed = 0;
    private restPosition = 0;
    private timer = 0;
    private reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    /**
     * @param {number} commitDistance - How far (px) to move before telling React
     */
    constructor(private commitDistance: number = 100) {}

    /** The current position in px. Read from the animation, so it is always up to date. */
    get position(): number {
        if (!this.element) return this.restPosition;

        const transform = getComputedStyle(this.element).transform;
        return transform === "none" ? 0 : -new DOMMatrixReadOnly(transform).m41;
    }

    /** Hand over the element that gets scrolled. */
    attach(element: HTMLElement): void {
        this.element = element;
        element.style.transform = translate(this.restPosition);
        if (this.drift !== 0) this.driftChanged();
    }

    /** Let go of the element, e.g. when it goes away. */
    detach(): void {
        this.restPosition = this.position;
        this.stop();
        this.element = undefined;
    }

    /** Ease towards a position relative to where we are heading. */
    scrollBy(distance: number): void {
        const from = this.position;
        const heading = this.mode === "tween" ? this.target : from;

        this.target = Math.max(0, heading + distance);
        this.play(
            from,
            this.target,
            this.mode === "rest" ? EASE_IN_OUT : EASE_OUT
        );
    }

    /** Jump straight to a position without animating. */
    jumpTo(position: number): void {
        this.stop();
        this.restPosition = this.committed = position;
        if (this.element) this.element.style.transform = translate(position);
        if (this.drift !== 0) this.driftChanged();
    }

    /** Keep scrolling at a constant speed (px/s, negative goes left). 0 stops. */
    setAutoSpeed(speed: number): void {
        this.autoSpeed = speed;
        this.driftChanged();
    }

    /** Same as setAutoSpeed but for a held key, so both can be active at once. */
    setHeldSpeed(speed: number): void {
        this.heldSpeed = speed;
        this.driftChanged();
    }

    /** Stop everything and forget the callbacks. */
    destroy(): void {
        this.detach();
        this.onCommit = undefined;
    }

    private get drift(): number {
        return this.autoSpeed + this.heldSpeed;
    }

    /** Animate from one position to another */
    private play(from: number, to: number, easing: string): void {
        if (Math.abs(to - from) < 0.5) {
            this.settle(to);
            return;
        }

        const distance = Math.abs(to - from);
        const duration = this.reducedMotion
            ? 0
            : Math.min(1400, 450 + distance * 0.6);

        this.mode = "tween";
        this.velocity = 0;
        this.run(
            [{ transform: translate(from) }, { transform: translate(to) }],
            { duration, easing },
            to
        );
    }

    /** React to a change in the constant scroll speed, easing from the old speed to the new one. */
    private driftChanged(): void {
        const next = this.drift;
        // A tween is treated as standing still, which is close enough to ease out of
        const previous = this.mode === "drift" ? this.velocity : 0;
        const position = this.position;

        if (next === previous) return;
        if (this.mode === "tween" && next === 0) return;

        if (next === 0) {
            // Ease out: the distance covered while slowing from `previous` to 0
            const end = Math.max(
                0,
                Math.round(position + (previous * RAMP_TIME) / 2)
            );

            this.mode = "tween";
            this.target = end;
            this.velocity = 0;
            this.run(
                [
                    { transform: translate(position) },
                    { transform: translate(end) },
                ],
                {
                    duration: RAMP_TIME * 1000,
                    easing: "cubic-bezier(0.333, 0.667, 0.667, 1)",
                },
                end
            );
            return;
        }

        // Opposite directions: don't try to blend, start from standstill
        const from = previous * next < 0 ? 0 : previous;
        const rampEnd = position + ((from + next) / 2) * RAMP_TIME;
        if (rampEnd <= 0) {
            this.mode = "rest";
            this.velocity = 0;
            this.play(position, 0, EASE_OUT);
            return;
        }

        // Stop at the start of the picture if heading there
        const cruise = Math.min(
            DRIFT_TIME,
            next < 0 ? rampEnd / -next : DRIFT_TIME
        );
        const end = rampEnd + next * cruise;
        const total = RAMP_TIME + cruise;
        // A speed that changes linearly is a quadratic, which is this cubic Bézier
        const startSlope = (2 * from) / (from + next);
        const endSlope = (2 * next) / (from + next);

        this.mode = "drift";
        this.velocity = next;
        this.run(
            [
                {
                    transform: translate(position),
                    offset: 0,
                    easing: `cubic-bezier(0.333, ${startSlope / 3}, 0.667, ${
                        1 - endSlope / 3
                    })`,
                },
                {
                    transform: translate(rampEnd),
                    offset: RAMP_TIME / total,
                    easing: "linear",
                },
                { transform: translate(end), offset: 1 },
            ],
            { duration: total * 1000, easing: "linear" },
            end
        );
    }

    /** Replace whatever is moving with a new animation starting from where it is now */
    private run(
        keyframes: Keyframe[],
        options: KeyframeAnimationOptions,
        endPosition: number
    ): void {
        const element = this.element;
        if (!element) {
            this.restPosition = endPosition;
            return;
        }

        const from = this.position;
        this.animation?.cancel();
        element.style.transform = translate(from);

        const animation = element.animate(keyframes, {
            ...options,
            fill: "forwards",
        });
        animation.onfinish = () => {
            if (this.animation === animation) this.settle(endPosition);
        };

        this.animation = animation;
        if (!this.timer) {
            this.timer = window.setInterval(this.checkCommit, COMMIT_INTERVAL);
        }
    }

    /** Come to rest at a position and tell React. */
    private settle(position: number): void {
        this.stop();
        this.restPosition = this.committed = position;
        if (this.element) this.element.style.transform = translate(position);
        this.onCommit?.(Math.round(position));

        if (this.drift !== 0) this.driftChanged();
    }

    /** Cancel the animation and stop checking the position. */
    private stop(): void {
        this.animation?.cancel();
        this.animation = undefined;
        this.mode = "rest";
        this.velocity = 0;
        window.clearInterval(this.timer);
        this.timer = 0;
    }

    private checkCommit = (): void => {
        const position = this.position;

        if (Math.abs(position - this.committed) >= this.commitDistance) {
            this.committed = position;
            this.onCommit?.(Math.round(position));
        }
    };
}
