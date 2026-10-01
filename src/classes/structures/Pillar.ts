import Element from "../Element";
import MossDots from "./MossDots";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";
import Tree01 from "./Tree01";
import Tree02 from "./Tree02";

const EDGE = "rgba(100,100,100,0.55)";
const SHADOW_EDGE = "rgba(80,80,80,0.6)";

/**
 * One sandstone column like those of Zhangjiajie: sheer, slightly irregular sides with ledges,
 * a rounded summit crowned with pines, vertical fissures, a shaded side and faint rock bands.
 */
export default class Pillar extends Structure {
    /**
     * @param {number} x - Centre of the base
     * @param {number} base - Bottom of the column
     * @param {number} width - Width at the base
     * @param {number} height - Height up to the shoulder of the summit
     * @param {boolean} [flatTop=false] - A flat summit, like the remains of the plateau on a mesa
     * @param {number} [leaning=0.25] - How far (share of the width) it may lean
     */
    constructor(
        x: number,
        base: number,
        width: number,
        height: number,
        flatTop: boolean = false,
        leaning: number = 0.25
    ) {
        super();

        const steps = Math.max(12, Math.floor(height / 8));
        const lean = PRNG.random(-leaning, leaning) * width;
        const seed = PRNG.random(0, 100);
        const left: Point[] = [];
        const right: Point[] = [];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const y = base - t * height;
            const centre =
                x + lean * t + (Perlin.noise(t * 2, seed + 7) - 0.5) * width * 0.3;
            const half = (width / 2) * (1 - 0.3 * t);
            // Ledges: the sides step in and out rather than bulging smoothly
            const ledge = (side: number) =>
                (Math.round(Perlin.noise(t * 7, seed + side) * 4) / 4 - 0.5) *
                width *
                0.32;

            left.push(new Point(centre - half + ledge(1), y));
            right.push(new Point(centre + half + ledge(2), y));
        }

        // The summit: a low, bumpy dome between the two shoulders
        const shoulderLeft = left[steps];
        const shoulderRight = right[steps];
        const capHeight = flatTop
            ? Math.min(8, width * 0.04)
            : width * PRNG.random(0.12, 0.3);
        const cap: Point[] = [];
        for (let k = 1; k < 8; k++) {
            const t = k / 8;
            cap.push(
                new Point(
                    shoulderLeft.x + (shoulderRight.x - shoulderLeft.x) * t,
                    shoulderLeft.y +
                        (shoulderRight.y - shoulderLeft.y) * t -
                        capHeight * Math.sin(Math.PI * t) * PRNG.random(0.7, 1.1)
                )
            );
        }

        const outline = [...left, ...cap, ...[...right].reverse()];
        // Silk inside, so it hides what is behind
        this.add(new Element(outline, 0, 0, "white", "none"));

        this.addFissures(left, right, height);
        this.addShading(left, right, height);
        this.addBands(left, right);

        // Edges: the right is the shadow side, drawn heavier
        this.add(new Stroke(left, EDGE, EDGE, 2.2, 0.8));
        this.add(new Stroke(right, SHADOW_EDGE, SHADOW_EDGE, 2.8, 0.8));
        this.add(
            new Stroke([shoulderLeft, ...cap, shoulderRight], EDGE, EDGE, 1.8, 0.6)
        );

        this.addSummitLife(cap, width, seed);
        this.addLedgeTrees(left, right);
    }

    /** Pines clinging to ledges on the sides */
    private addLedgeTrees(left: Point[], right: Point[]): void {
        const count = Math.floor(PRNG.random(1, 5.99));

        for (let t = 0; t < count; t++) {
            const side = PRNG.random() < 0.5 ? left : right;
            const spot = side[Math.floor(PRNG.random(0.3, 0.9) * side.length)];
            this.add(
                new Tree02(
                    spot.x,
                    spot.y,
                    `rgba(100,100,100,${PRNG.random(0.45, 0.65).toFixed(2)})`,
                    1
                )
            );
        }
    }

    /** Vertical cracks running down the face */
    private addFissures(left: Point[], right: Point[], height: number): void {
        const count = Math.floor(PRNG.random(1, 3.99));

        for (let f = 0; f < count; f++) {
            const across = PRNG.random(0.2, 0.8);
            const start = Math.floor(PRNG.random(0.1, 0.8) * left.length);
            const end = Math.min(
                left.length - 1,
                start + Math.floor(PRNG.random(0.08, 0.3) * left.length)
            );
            const crack: Point[] = [];

            for (let i = start; i <= end; i++) {
                crack.push(
                    new Point(
                        left[i].x + (right[i].x - left[i].x) * across +
                            PRNG.random(-0.6, 0.6),
                        left[i].y
                    )
                );
            }
            if (crack.length > 2 && height > 60) {
                const ink = `rgba(100,100,100,${PRNG.random(0.2, 0.38).toFixed(2)})`;
                this.add(new Stroke(crack, ink, ink, 0.9, 0.5));
            }
        }
    }

    /** Short vertical strokes down the shadow side (the texture strokes of the rock) */
    private addShading(left: Point[], right: Point[], height: number): void {
        const count = Math.floor(PRNG.random(8, 18.99) * Math.min(1.5, height / 200));

        for (let s = 0; s < count; s++) {
            const across = PRNG.random(0.62, 0.92);
            const start = Math.floor(PRNG.random(0, 0.85) * left.length);
            const length = Math.max(3, Math.floor(PRNG.random(0.03, 0.08) * left.length));
            const stroke: Point[] = [];

            for (let i = start; i < Math.min(left.length, start + length); i++) {
                stroke.push(
                    new Point(left[i].x + (right[i].x - left[i].x) * across, left[i].y)
                );
            }
            if (stroke.length > 2) {
                const ink = `rgba(100,100,100,${PRNG.random(0.18, 0.35).toFixed(2)})`;
                this.add(new Stroke(stroke, ink, ink, 1.2, 0.5));
            }
        }
    }

    /** A few faint, broken horizontal bands of rock */
    private addBands(left: Point[], right: Point[]): void {
        const count = Math.floor(PRNG.random(1, 3.99));

        for (let b = 0; b < count; b++) {
            const i = Math.floor(PRNG.random(0.1, 0.9) * left.length);
            const from = PRNG.random(0, 0.4);
            const to = PRNG.random(from + 0.25, 1);
            const band = [0, 0.5, 1].map((t) => {
                const across = from + (to - from) * t;
                return new Point(
                    left[i].x + (right[i].x - left[i].x) * across,
                    left[i].y + PRNG.random(-1.5, 1.5)
                );
            });
            const ink = "rgba(100,100,100,0.2)";
            this.add(new Stroke(band, ink, ink, 0.8, 0.4));
        }
    }

    /** Pines and moss crowning the summit, sometimes a pine leaning out over the edge */
    private addSummitLife(cap: Point[], width: number, seed: number): void {
        this.add(new MossDots(cap, 0, 0, seed, 0.45, 0.7));

        // Real summits are thickly wooded with pines
        const clumps = Math.max(2, Math.floor(width / 16));
        for (let c = 0; c < clumps; c++) {
            const spot = cap[Math.floor(PRNG.random(0, cap.length))];
            this.add(
                new Tree02(
                    spot.x,
                    spot.y + 2,
                    `rgba(100,100,100,${PRNG.random(0.5, 0.7).toFixed(2)})`,
                    3
                )
            );
        }

        if (PRNG.random() < 0.45) {
            const edge = PRNG.random() < 0.5 ? cap[0] : cap[cap.length - 1];
            this.add(
                new Tree01(
                    edge.x,
                    edge.y + 4,
                    PRNG.random(22, 45),
                    1.4,
                    "rgba(100,100,100,0.55)"
                )
            );
        }
    }
}
