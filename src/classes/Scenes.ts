import PRNG from "./PRNG";
import Perlin from "./Perlin";
import { config } from "../config";

/**
 * The kinds of scene a handscroll moves through, after Guo Xi's three distances (三远):
 *
 * - `level` (平远): wide, quiet water seen across to a low far shore, sandbars and boats
 * - `near`: the foreground comes forward, with hills, groves, bridges and people on the shore
 * - `deep` (深远): ranges layered one behind another, receding into misty valleys
 * - `high` (高远): a massif towering up to its host peak, with waterfalls and cloud bands
 */
export type SceneKind = "level" | "near" | "deep" | "high";

export interface Scene {
    kind: SceneKind;
    start: number;
    end: number;
}

/** What a scene asks of the landscape, mixed smoothly across the borders between scenes */
export interface SceneProfile {
    /** How built up it is, 0-1 (see Designer.intensity), before the arc within the scene */
    intensity: number;
    /** How much the intensity rises towards the middle of the scene and falls away again */
    arc: number;
    /** Scales how many middle ranges there are: the quiet scenes still have low ranges far off */
    ranges: number;
    /** How far back the middle ranges are layered (scales their depth) */
    depth: number;
    /** Scales the height of the middle mountains */
    height: number;
    /** Scales how many foreground hills there are */
    foreground: number;
    /** Moves the near bank's shoreline up (negative, more land) or down (more water) */
    shore: number;
    /** Share of the horizon with far shore along it, 0-1 */
    farShore: number;
    /** Scales the chance of sandbars and boats */
    water: number;
    /** Scales the chance of cloud bands */
    clouds: number;
    /** Scales the chance of a temple up a valley */
    temple: number;
    /** Scales the chance of a pagoda on a ridge */
    pagoda: number;
    /** Scales the chance of a village on the near bank */
    village: number;
    /** Scales the chance of a pavilion on a foreground hill */
    pavilion: number;
    /** Scales the chance of travellers on the road along the bank and on the hills */
    travellers: number;
}

const SCENES = config.scenes;
const KINDS: SceneKind[] = ["level", "near", "deep", "high"];

/**
 * The scenes along the scroll. Like a handscroll it opens quietly, then moves between tension
 * and release: after the towering `high` scenes it rests on open water or the near shore, and
 * it builds back up through layered `deep` ranges. The sequence only depends on the picture's
 * seed, so it is the same from any chunk; borders are blended over `config.scenes.blend` units
 * so the landscape changes gradually, without seams.
 */
export default class Scenes {
    private static seed: string | number = 0;
    private static list: Scene[] = [];

    /** Start the scenes of a new picture */
    static start(seed: string | number): void {
        this.seed = seed;
        this.list = [];
    }

    /** A random number 0-1 for scene `n`, from the picture's seed without using up PRNG's */
    private static random(n: number, what: string): number {
        return PRNG.hash(`${this.seed}~scene${n}~${what}`) / 2 ** 53;
    }

    /** Make sure the scenes reach x */
    private static extendTo(x: number): void {
        while (!this.list.length || this.list[this.list.length - 1].end <= x) {
            const n = this.list.length;
            const previous = this.list[n - 1];
            let kind: SceneKind;

            if (!previous) {
                kind = SCENES.opening;
            } else {
                // What may follow what (see config.scenes.next)
                const options = SCENES.next[previous.kind];
                kind = options[Math.floor(this.random(n, "kind") * options.length)];
            }

            const [min, max] = SCENES.length[kind];
            const start = previous ? previous.end : 0;
            const length = min + (max - min) * this.random(n, "length");
            this.list.push({ kind, start, end: start + Math.round(length) });
        }
    }

    /** The scene at x */
    static at(x: number): Scene {
        x = Math.max(0, x);
        this.extendTo(x);
        // Scenes are a few thousand units long, so this is a short search from the end
        for (let i = this.list.length - 1; i >= 0; i--) {
            if (this.list[i].start <= x) return this.list[i];
        }
        return this.list[0];
    }

    /**
     * How much each scene counts at x: 1 for the scene at x, except near a border, where it
     * hands over to the next scene with a smooth step
     */
    static weights(x: number): Array<{ scene: Scene; weight: number }> {
        x = Math.max(0, x);
        const scene = this.at(x);
        const half = SCENES.blend / 2;
        const smooth = (t: number) => t * t * (3 - 2 * t);

        if (x > scene.end - half) {
            const next = this.at(scene.end);
            const t = smooth((x - (scene.end - half)) / (2 * half));
            return [
                { scene, weight: 1 - t },
                { scene: next, weight: t },
            ];
        }
        if (x < scene.start + half && scene.start > 0) {
            const previous = this.at(scene.start - 1);
            const t = smooth((x - (scene.start - half)) / (2 * half));
            return [
                { scene: previous, weight: 1 - t },
                { scene, weight: t },
            ];
        }
        return [{ scene, weight: 1 }];
    }

    /** What the scenes ask of the landscape at x, blended across borders */
    static profile(x: number): SceneProfile {
        const blended = {} as SceneProfile;
        const keys = Object.keys(SCENES.profiles.level) as (keyof SceneProfile)[];

        keys.forEach((key) => (blended[key] = 0));
        for (const { scene, weight } of this.weights(x)) {
            const profile = SCENES.profiles[scene.kind];
            keys.forEach((key) => (blended[key] += profile[key] * weight));
        }
        return blended;
    }

    /**
     * How built up the landscape is at x, 0-1: each scene's level, rising in an arc to its
     * middle (so a `high` scene climbs to one climax), with a little noise so no two stretches
     * are the same
     */
    static intensity(x: number): number {
        x = Math.max(0, x);
        let value = 0;

        for (const { scene, weight } of this.weights(x)) {
            const profile = SCENES.profiles[scene.kind];
            const t = Math.min(1, Math.max(0, (x - scene.start) / (scene.end - scene.start)));
            value += weight * (profile.intensity + profile.arc * Math.sin(Math.PI * t));
        }
        value += (Perlin.noise(x * 0.0015, 11.3) - 0.5) * SCENES.wobble;

        return Math.min(1, Math.max(0, value));
    }

    /** Every kind of scene (for checks and tools) */
    static get kinds(): SceneKind[] {
        return KINDS;
    }
}
