import Element from "../Element";
import Layer from "../Layer";
import MossDots from "../structures/MossDots";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import { config } from "../../config";

const SHORE = config.layers.bank.shore;
const SWING = config.layers.bank.swing;
const STEP = 8;

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
        // An inlet now and then, where the bank falls away below the picture
        const inlet = Math.max(0, 0.32 - Perlin.noise(x * 0.0009, 47.3)) * 600;
        return SHORE + roll + detail + inlet;
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
}
