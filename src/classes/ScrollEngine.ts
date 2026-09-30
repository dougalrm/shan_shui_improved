/** How long (s) a change of speed takes to ease in or out */
const RAMP_TIME = 0.4;
/** How long (s) a constant-speed scroll is scheduled for. It is restarted whenever the speed changes */
const DRIFT_TIME = 3600;
/** How often (ms) the position is checked to tell React about it */
const COMMIT_INTERVAL = 100;
/** How quickly (px/s²) a fling slows down after letting go of a drag */
const FLING_DECELERATION = 2500;
/** Fastest fling (px/s), so a wild flick doesn't throw the picture miles away */
const MAX_FLING_SPEED = 5000;
/** Slower than this (px/s) and letting go just stops */
const MIN_FLING_SPEED = 60;
const EASE_IN_OUT = "cubic-bezier(0.4, 0, 0.2, 1)";
/** Slows down evenly from the starting speed, the way a flung object would */
const DECELERATE = "cubic-bezier(0.333, 0.667, 0.667, 1)";
const EASE_OUT = "cubic-bezier(0.2, 0, 0, 1)";

type Mode = "rest" | "tween" | "drift" | "drag";

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
 * - `grab` / `dragTo` / `release` follow a pointer directly and fling on release. Constant-speed
 *   scrolling pauses while grabbed and eases back in afterwards.
 *
 * React only hears about the position every `commitDistance` px and when coming to rest
 * (`onCommit`), never once per frame.
 */
export default class ScrollEngine {
    /** Called with a whole-pixel position every `commitDistance` px and when coming to rest */
    onCommit?: (position: number) => void;
    /**
     * Screen pixels per world unit. Positions and speeds are all in world units (the painting's
     * own coordinates); only what is shown on screen is scaled.
     */
    scale = 1;

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

        if (this.mode === "drag") return this.restPosition;

        const transform = getComputedStyle(this.element).transform;
        return transform === "none"
            ? 0
            : -new DOMMatrixReadOnly(transform).m41 / this.scale;
    }

    /** Change the scale, e.g. when the window is resized. Keeps the same world position. */
    setScale(scale: number): void {
        if (scale === this.scale) return;

        const position = this.position;
        this.scale = scale;
        this.jumpTo(Math.round(position));
    }

    /** Hand over the element that gets scrolled. */
    attach(element: HTMLElement): void {
        this.element = element;
        element.style.transform = this.translate(this.restPosition);
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

    /** Ease to an absolute position. */
    scrollTo(position: number): void {
        this.target = Math.max(0, position);
        this.play(this.position, this.target, EASE_IN_OUT);
    }

    /** Take hold of the picture: stop whatever it's doing so it can follow a pointer. */
    grab(): void {
        const position = this.position;

        this.stop();
        this.mode = "drag";
        this.restPosition = position;
        if (this.element) this.element.style.transform = this.translate(position);
    }

    /** Move the grabbed picture straight to a position. */
    dragTo(position: number): void {
        if (this.mode !== "drag") return;

        this.restPosition = Math.max(0, position);
        if (this.element) {
            this.element.style.transform = this.translate(this.restPosition);
        }
        this.checkCommit();
    }

    /** Let go, carrying on at the given speed (px/s) and slowing to a stop. */
    release(speed: number = 0): void {
        if (this.mode !== "drag") return;

        const from = this.restPosition;
        const velocity = Math.max(
            -MAX_FLING_SPEED,
            Math.min(MAX_FLING_SPEED, speed)
        );

        this.mode = "rest";
        if (this.reducedMotion || Math.abs(velocity) < MIN_FLING_SPEED) {
            this.settle(Math.round(from));
            return;
        }

        // Slowing evenly from `velocity` to 0 covers half the distance it would at full speed
        const time = Math.abs(velocity) / FLING_DECELERATION;
        const end = Math.max(0, Math.round(from + (velocity * time) / 2));

        this.target = end;
        this.mode = "tween";
        this.run(
            [{ transform: this.translate(from) }, { transform: this.translate(end) }],
            { duration: time * 1000, easing: DECELERATE },
            end
        );
    }

    /** Jump straight to a position without animating. */
    jumpTo(position: number): void {
        this.stop();
        this.restPosition = this.committed = position;
        if (this.element) this.element.style.transform = this.translate(position);
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

    private translate(position: number): string {
        return `translate3d(${-position * this.scale}px,0,0)`;
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
            [{ transform: this.translate(from) }, { transform: this.translate(to) }],
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
        // Picked up again when the drag or tween ends (see settle)
        if (this.mode === "drag") return;
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
                    { transform: this.translate(position) },
                    { transform: this.translate(end) },
                ],
                { duration: RAMP_TIME * 1000, easing: DECELERATE },
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
                    transform: this.translate(position),
                    offset: 0,
                    easing: `cubic-bezier(0.333, ${startSlope / 3}, 0.667, ${
                        1 - endSlope / 3
                    })`,
                },
                {
                    transform: this.translate(rampEnd),
                    offset: RAMP_TIME / total,
                    easing: "linear",
                },
                { transform: this.translate(end), offset: 1 },
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
        element.style.transform = this.translate(from);

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
        if (this.element) this.element.style.transform = this.translate(position);
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
