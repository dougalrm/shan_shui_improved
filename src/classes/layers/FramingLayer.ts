import Layer from "../Layer";
import OldPine from "../structures/OldPine";
import PRNG from "../PRNG";
import Point from "../Point";
import Rock from "../structures/Rock";
import Stroke from "../elements/Stroke";
import Tree02 from "../structures/Tree02";
import { config } from "../../config";

const BOTTOM = config.world.height;

/**
 * Something in the very front of the picture, cut off by its bottom edge: an old pine, a
 * great boulder, or a pine rising behind a boulder. Set at the edge of a view, it frames it
 * and pushes the landscape back.
 */
export default class FramingLayer extends Layer {
    /**
     * @param {number} x - Where it stands
     */
    constructor(x: number) {
        super("framing", x, BOTTOM);

        const kind = PRNG.randomChoice(["pine", "pine", "rock", "both", "both"]);
        const lean = PRNG.randomSign() * PRNG.random(0.4, 0.9);

        if (kind !== "rock") {
            const offset = kind === "both" ? -lean * PRNG.random(40, 90) : 0;
            this.add(new OldPine(x + offset, BOTTOM + 60, PRNG.random(430, 580), lean));
        }
        if (kind !== "pine") {
            this.addBoulder(x, kind === "both" ? 0.75 : 1);
        }
    }

    /** A great boulder rising from below the picture, with grass and shrubs on it */
    private addBoulder(x: number, size: number): void {
        const height = PRNG.random(170, 250) * size;
        const width = PRNG.random(240, 360) * size;
        const base = BOTTOM + 40;

        this.add(new Rock(x, base, PRNG.random(0, 100), height, 10, width));

        // Grass and a shrub or two on top
        for (let t = 0; t < 6; t++) {
            const gx = x + PRNG.random(-0.3, 0.3) * width;
            const gy = base - height * PRNG.random(0.8, 0.95);
            if (PRNG.random() < 0.35) {
                this.add(new Tree02(gx, gy, `rgba(100,100,100,${PRNG.random(0.5, 0.7).toFixed(2)})`, 2));
                continue;
            }
            for (let b = 0; b < 4; b++) {
                const lean = PRNG.random(-5, 5);
                const tall = PRNG.random(8, 18);
                const ink = `rgba(100,100,100,${PRNG.random(0.45, 0.7).toFixed(2)})`;
                this.add(
                    new Stroke(
                        [
                            new Point(gx + b * 3, gy),
                            new Point(gx + b * 3 + lean / 2, gy - tall / 2),
                            new Point(gx + b * 3 + lean, gy - tall),
                        ],
                        ink,
                        ink,
                        1.2,
                        0.4
                    )
                );
            }
        }
    }
}
