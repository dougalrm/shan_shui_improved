import Element from "../Element";
import House from "../structures/House";
import Hut from "../structures/Hut";
import Man from "../structures/Man";
import Layer from "../Layer";
import MossDots from "../structures/MossDots";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Scenes from "../Scenes";
import Stroke from "../elements/Stroke";
import Tree01 from "../structures/Tree01";
import Tree02 from "../structures/Tree02";
import Tree03 from "../structures/Tree03";
import { config } from "../../config";

const SHORE = config.layers.bank.shore;
const SWING = config.layers.bank.swing;
const STEP = 8;
const VILLAGE_CHANCE = config.layers.bank.villageChance;
const TRAVELLER_CHANCE = config.layers.bank.travellerChance;

const FAINT = "rgba(100,100,100,0.2)";

/**
 * The near bank: low ground along the front of the picture that the foreground hills stand on,
 * so they read as part of one shore rather than islands, with rocks and reeds at the water's
 * edge. Now and then it dips away into an inlet where the water comes right to the front.
 *
 * The shoreline is a smooth function of x alone, so the bank is seamless from chunk to chunk.
 */
export default class BankLayer extends Layer {
    /**
     * Height of the shoreline at x (bigger is further down / nearer)
     * @param {number} x - Position in the world
     * @returns {number} The shoreline's y
     */
    static shoreline(x: number): number {
        const roll = (Perlin.noise(x * 0.0025, 21.7) - 0.5) * 2 * SWING;
        // A finer, irregular edge on top of the broad roll
        const detail = (Perlin.noise(x * 0.015, 33.1) - 0.5) * 18;
        const inlet = BankLayer.inlet(x);
        // The near shore comes forward in some scenes and falls back in others
        const scene = Scenes.profile(x).shore;
        return SHORE + scene + roll + detail + inlet;
    }

    /** How far the bank falls away into an inlet at x, where the water comes to the front */
    static inlet(x: number): number {
        return Math.max(0, 0.32 - Perlin.noise(x * 0.0009, 47.3)) * 600;
    }

    /**
     * Where the road along the bank runs at x, a little below the water's edge, or undefined
     * where the bank falls away into an inlet
     */
    static road(x: number): number | undefined {
        if (BankLayer.inlet(x) > 12) return undefined;
        return BankLayer.shoreline(x) + 30 + (Perlin.noise(x * 0.004, 81.3) - 0.5) * 16;
    }

    /**
     * @param {number} xOffset - Left end of the stretch
     * @param {number} width - Length of the stretch
     */
    constructor(xOffset: number, width: number) {
        super("bank", xOffset, SHORE);

        // A little past both ends, so neighbouring stretches overlap without a seam
        const shore: Point[] = [];
        for (let x = xOffset - STEP * 2; x <= xOffset + width + STEP * 2; x += STEP) {
            shore.push(new Point(x, BankLayer.shoreline(x)));
        }

        const bottom = 1100;
        this.add(
            new Element(
                [
                    ...shore,
                    new Point(shore[shore.length - 1].x, bottom),
                    new Point(shore[0].x, bottom),
                ],
                0,
                0,
                "white",
                "none"
            )
        );
        this.addEdge(shore);
        this.addBankFace(shore);
        this.addGround(shore);
        this.addReeds(shore);
        this.addRoad(xOffset, width);

        // A village on the bank now and then, mostly where the near shore comes forward
        const middle = xOffset + width / 2;
        const village =
            PRNG.random() < VILLAGE_CHANCE * Scenes.profile(middle).village
                ? this.findVillageSite(xOffset, width)
                : undefined;

        this.addGroves(xOffset, width, village);
        if (village) this.addVillage(village[0], village[1]);
        if (PRNG.random() < TRAVELLER_CHANCE * Scenes.profile(middle).travellers) {
            this.addTravellers(xOffset, width, village);
        }
        this.add(new MossDots(shore, 0, 0, xOffset * 0.01, 0.25, 0.8));
    }

    /** The water's edge as broken brush strokes of varying strength, not one hard line */
    private addEdge(shore: Point[]): void {
        let i = 0;
        while (i < shore.length - 1) {
            const end = Math.min(shore.length - 1, i + Math.floor(PRNG.random(5, 16)));
            const strength = PRNG.random(0.3, 0.55);
            const ink = `rgba(100,100,100,${strength.toFixed(2)})`;

            this.add(
                new Stroke(shore.slice(i, end + 1), ink, ink, PRNG.random(1.4, 2.4), 0.8)
            );
            // Now and then a short gap
            i = end + (PRNG.random() < 0.25 ? Math.floor(PRNG.random(1, 3)) : 0);
        }
    }

    /** Short strokes sloping down from the edge: the bank shelving into the water */
    private addBankFace(shore: Point[]): void {
        for (let i = 2; i < shore.length - 2; i += Math.floor(PRNG.random(3, 7))) {
            const { x, y } = shore[i];
            const length = PRNG.random(10, 26);
            const slant = PRNG.random(-0.6, -0.2) * length;
            const ink = `rgba(100,100,100,${PRNG.random(0.15, 0.3).toFixed(2)})`;

            this.add(
                new Stroke(
                    [
                        new Point(x, y + 2),
                        new Point(x + slant / 2, y + length / 2),
                        new Point(x + slant, y + length),
                    ],
                    ink,
                    ink,
                    1,
                    0.5,
                    1,
                    (t) => 1 - t * 0.7
                )
            );
        }
    }

    /** A few faint broken lines of ground below the shore */
    private addGround(shore: Point[]): void {
        const count = Math.floor(PRNG.random(4, 8.99));

        for (let n = 0; n < count; n++) {
            const start = Math.floor(PRNG.random(0, shore.length - 8));
            const length = Math.floor(PRNG.random(4, 14));
            const depth = PRNG.random(12, 60);
            const line = shore
                .slice(start, Math.min(shore.length, start + length))
                .map((point) => new Point(point.x, point.y + depth + PRNG.random(-1, 1)));

            if (line.length > 2) this.add(new Stroke(line, FAINT, FAINT, 1, 0.6));
        }
    }

    /**
     * Groves of small trees and shrubs scattered along the bank: a few pines, a gnarled tree,
     * low bushes, at different sizes, coming and going with the land (none in an inlet)
     */
    private addGroves(xOffset: number, width: number, village?: [number, number]): void {
        let x = xOffset + PRNG.random(20, 120);

        while (x < xOffset + width) {
            const shoreY = BankLayer.shoreline(x);
            // The village has its own trees
            const inVillage = village && x > village[0] - 40 && x < village[1] + 40;
            const wooded = Perlin.noise(x * 0.004, 9.9) > 0.34 && !inVillage;

            if (wooded && shoreY < SHORE + SWING + 20) {
                // A clump: tightly gathered, mixed, nearer ones lower, larger and darker
                const trees = Math.floor(PRNG.random(2, 7.99));
                for (let t = 0; t < trees; t++) {
                    const near = PRNG.random(0, 1);
                    const tx = x + PRNG.random(-28, 28);
                    const ty = BankLayer.shoreline(tx) + 6 + near * 55;
                    const size = 0.6 + near * 0.8;
                    const ink = `rgba(100,100,100,${(0.35 + near * 0.35).toFixed(2)})`;
                    const kind = PRNG.random();

                    if (kind < 0.35) {
                        this.add(
                            new Tree01(tx, ty, PRNG.random(30, 70) * size, 1.2 + near * 1.2, ink)
                        );
                    } else if (kind < 0.6) {
                        const bend = PRNG.random(-0.1, 0.1);
                        // Now and then a taller one stands out of the grove
                        const tall = PRNG.random() < 0.2 ? 1.5 : 1;
                        this.add(
                            new Tree03(tx, ty, PRNG.random(35, 80) * size * tall, ink, (v) => v * bend)
                        );
                    } else {
                        // Low shrubs, ground cover between the trees
                        this.add(new Tree02(tx, ty, ink, near > 0.5 ? 3 : 2));
                    }
                }
            }
            // Irregular spacing: clumps with open stretches between
            x += PRNG.random(90, 320);
        }
    }

    /** Tufts of reeds and grass at the water's edge */
    private addReeds(shore: Point[]): void {
        for (let i = 2; i < shore.length - 2; i++) {
            if (Perlin.noise(shore[i].x * 0.02, 13.1) > 0.42 || PRNG.random() > 0.5) continue;

            const { x, y } = shore[i];
            const blades = Math.floor(PRNG.random(2, 5.99));
            for (let b = 0; b < blades; b++) {
                const lean = PRNG.random(-4, 4);
                const height = PRNG.random(6, 16);
                const ink = `rgba(100,100,100,${PRNG.random(0.35, 0.55).toFixed(2)})`;
                this.add(
                    new Stroke(
                        [
                            new Point(x + b * 2, y + 2),
                            new Point(x + b * 2 + lean / 2, y - height / 2),
                            new Point(x + b * 2 + lean, y - height),
                        ],
                        ink,
                        ink,
                        0.8,
                        0.3,
                        1,
                        (t) => 1 - t
                    )
                );
            }
        }
    }

    /**
     * The road along the bank: a faint, broken track, as a painter suggests a road rather
     * than drawing it. It stops where the bank falls away into an inlet.
     */
    private addRoad(xOffset: number, width: number): void {
        let run: Point[] = [];
        const finish = () => {
            for (let i = 0; i < run.length - 1; ) {
                const end = Math.min(run.length - 1, i + Math.floor(PRNG.random(3, 9)));
                if (PRNG.random() < 0.7) {
                    const ink = `rgba(100,100,100,${PRNG.random(0.18, 0.32).toFixed(2)})`;
                    this.add(new Stroke(run.slice(i, end + 1), ink, ink, 0.9, 0.5));
                }
                i = end + Math.floor(PRNG.random(1, 4));
            }
            run = [];
        };

        for (let x = xOffset; x <= xOffset + width; x += STEP) {
            const y = BankLayer.road(x);
            if (y === undefined) finish();
            else run.push(new Point(x, y));
        }
        finish();
    }

    /** A stretch of the chunk with no inlet, wide enough for a village, or undefined */
    private findVillageSite(xOffset: number, width: number): [number, number] | undefined {
        const span = PRNG.random(160, 300);
        const start = PRNG.random(xOffset + 40, xOffset + width - span - 40);

        for (let x = start; x <= start + span; x += 20) {
            if (BankLayer.road(x) === undefined) return undefined;
        }
        return [start, start + span];
    }

    /**
     * A few thatched houses by the road, with trees behind them, a haystack and a fence:
     * a fishing village on the shore
     */
    private addVillage(from: number, to: number): void {
        // Trees behind, drawn first so the houses stand in front of them
        for (let x = from - 20; x < to + 20; x += PRNG.random(25, 60)) {
            const ink = `rgba(100,100,100,${PRNG.random(0.3, 0.5).toFixed(2)})`;
            const ground = BankLayer.shoreline(x) + PRNG.random(4, 12);
            if (PRNG.random() < 0.5) {
                this.add(new Tree01(x, ground, PRNG.random(40, 75), PRNG.random(1.5, 2.5), ink));
            } else {
                const bend = PRNG.random(-0.1, 0.1);
                this.add(new Tree03(x, ground, PRNG.random(45, 85), ink, (v) => v * bend));
            }
        }

        const style = PRNG.randomChoice([0, 1, 2]);
        const rotation = PRNG.random(0.2, 0.8);
        for (let x = from + PRNG.random(10, 30); x < to; x += PRNG.random(70, 105)) {
            const ground = BankLayer.shoreline(x) + PRNG.random(18, 24);
            if (PRNG.random() < 0.2) {
                // A haystack
                this.add(new Hut(x, ground, PRNG.random(12, 18), PRNG.random(28, 40), 60));
            } else {
                this.add(new House(x, ground, PRNG.random(54, 70), 1, rotation, style, false));
            }
        }

        // A low fence in front, in broken lengths
        for (let x = from; x < to; x += PRNG.random(30, 70)) {
            const length = PRNG.random(20, 45);
            const y = (px: number) => BankLayer.shoreline(px) + 27;
            const ink = `rgba(100,100,100,${PRNG.random(0.25, 0.4).toFixed(2)})`;
            const posts: Point[] = [];
            for (let px = x; px < Math.min(to, x + length); px += 6) posts.push(new Point(px, y(px) - 5));
            if (posts.length < 2) continue;
            this.add(new Stroke(posts, ink, ink, 0.8, 0.4));
            posts.forEach((post) =>
                this.add(new Stroke([post, new Point(post.x, post.y + 6)], ink, ink, 0.6, 0.3))
            );
        }
    }

    /** A traveller on the road, with a stick, now and then followed by a young attendant */
    private addTravellers(xOffset: number, width: number, village?: [number, number]): void {
        for (let attempt = 0; attempt < 6; attempt++) {
            const x = PRNG.random(xOffset + 20, xOffset + width - 20);
            const y = BankLayer.road(x);
            const nearVillage = village && x > village[0] - 30 && x < village[1] + 30;

            if (y === undefined || nearVillage) continue;

            const facingRight = PRNG.randomChoice([true, false]);
            this.add(new Man(x, y, facingRight, 0.3, undefined, true, 1));
            if (PRNG.random() < 0.5) {
                const behind = facingRight ? -1 : 1;
                this.add(new Man(x + behind * 14, y + 1, facingRight, 0.22, undefined, false, 0));
            }
            return;
        }
    }
}
