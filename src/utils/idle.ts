interface Job {
    run: () => unknown;
    cost: number;
    resolve: (value: any) => void;
    reject: (reason: unknown) => void;
}

/** Give up waiting for a quiet moment after this long (ms) and run anyway */
const MAX_WAIT = 150;
/** Budget (ms) per slice where requestIdleCallback is missing (Safari) */
const FALLBACK_BUDGET = 6;

const jobs: Job[] = [];
let scheduled = false;

const requestIdle = (callback: (deadline: IdleDeadline) => void) => {
    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(callback, { timeout: MAX_WAIT });
    } else {
        setTimeout(() => {
            const start = performance.now();
            callback({
                didTimeout: false,
                timeRemaining: () =>
                    Math.max(0, FALLBACK_BUDGET - (performance.now() - start)),
            });
        }, 1);
    }
};

const pump = (deadline: IdleDeadline) => {
    scheduled = false;
    let ranOne = false;

    while (jobs.length) {
        const job = jobs[0];
        // Skip jobs that would not fit in what's left of this frame, but never starve:
        // once we've waited too long, or when nothing has run yet on a fallback, run one anyway
        const fits = deadline.timeRemaining() >= job.cost;
        if (!fits && !(deadline.didTimeout && !ranOne)) break;

        jobs.shift();
        ranOne = true;
        try {
            job.resolve(job.run());
        } catch (error) {
            job.reject(error);
        }
    }

    if (jobs.length) schedule();
};

const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestIdle(pump);
};

/**
 * Run a function in spare time between animation frames, so heavy main-thread work doesn't
 * make scrolling stutter. Jobs run in the order they were queued.
 * @param {Function} run - The work to do
 * @param {number} cost - Roughly how long (ms) it takes, so it is only started when it fits
 * @returns {Promise} Resolves with what `run` returns
 */
export const runWhenIdle = <T>(run: () => T, cost: number): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        jobs.push({ run, cost, resolve, reject });
        schedule();
    });
