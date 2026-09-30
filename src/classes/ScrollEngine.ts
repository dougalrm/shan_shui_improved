/**
 * Drives the horizontal scroll position outside of React, one animation frame at a time.
 *
 * The position chases a target with a critically damped spring ("smooth damp"), so pressing a
 * button eases in and out, and holding a key or auto-scrolling just moves the target at a
 * constant speed, which the spring follows without any ripple. React only hears about the
 * position every now and then (see `onCommit`), never once per frame.
 */
export default class ScrollEngine {
    /** Current, possibly fractional, position in px */
    position = 0;
    /** Called every frame the position changes. Must be cheap, it is the hot path */
    onFrame?: (position: number) => void;
    /** Called with a whole-pixel position every `commitDistance` px and when coming to rest */
    onCommit?: (position: number) => void;

    private target = 0;
    private velocity = 0;
    private committed = 0;
    private autoSpeed = 0;
    private heldSpeed = 0;
    private frame = 0;
    private lastTime = 0;
    private reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    /**
     * @param {number} smoothTime - Roughly how long (s) it takes to catch up with the target
     * @param {number} commitDistance - How far (px) to move before telling React
     */
    constructor(
        private smoothTime: number = 0.35,
        private commitDistance: number = 100
    ) {}

    /** Ease towards a position relative to where we are heading. */
    scrollBy(distance: number): void {
        this.target = Math.max(0, this.target + distance);
        this.wake();
    }

    /** Jump straight to a position without animating. */
    jumpTo(position: number): void {
        this.position = this.target = this.committed = position;
        this.velocity = 0;
        this.onFrame?.(position);
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

    /** Stop the animation loop and forget the callbacks. */
    destroy(): void {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
        this.onFrame = this.onCommit = undefined;
    }

    private get drift(): number {
        return this.autoSpeed + this.heldSpeed;
    }

    private driftChanged(): void {
        // Come to rest on a whole pixel, otherwise thin strokes look blurry
        if (this.drift === 0) this.target = Math.max(0, Math.round(this.target));
        this.wake();
    }

    private wake(): void {
        if (this.frame) return;
        this.lastTime = performance.now();
        this.frame = requestAnimationFrame(this.tick);
    }

    private tick = (time: number): void => {
        // Clamped so a stalled frame doesn't make the picture leap
        const dt = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;

        if (this.drift !== 0) {
            this.target = Math.max(0, this.target + this.drift * dt);
        }

        if (this.reducedMotion) {
            this.position = this.target;
            this.velocity = 0;
        } else {
            this.smoothDamp(dt);
        }

        const atRest =
            this.drift === 0 &&
            Math.abs(this.target - this.position) < 0.1 &&
            Math.abs(this.velocity) < 1;

        if (atRest) {
            this.position = this.target;
            this.velocity = 0;
            this.frame = 0;
        } else {
            this.frame = requestAnimationFrame(this.tick);
        }

        this.onFrame?.(this.position);

        if (
            atRest ||
            Math.abs(this.position - this.committed) >= this.commitDistance
        ) {
            this.committed = this.position;
            this.onCommit?.(Math.round(this.position));
        }
    };

    /** Critically damped spring, stable for any frame time. */
    private smoothDamp(dt: number): void {
        const omega = 2 / this.smoothTime;
        const x = omega * dt;
        const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        const change = this.position - this.target;
        const temp = (this.velocity + omega * change) * dt;

        this.velocity = (this.velocity - omega * temp) * decay;
        this.position = this.target + (change + temp) * decay;
    }
}
