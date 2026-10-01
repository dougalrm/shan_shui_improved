import Element from "../Element";
import Layer from "../Layer";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import { config } from "../../config";

const HORIZON = config.layers.farShore.horizon;
const COVER = config.layers.farShore.cover;
const STEP = 6;

/**
 * The far shore: low, pale strips of distant land along the horizon, between and in front of
 * the distant mountains, with tiny dots of far-off trees. It comes and goes rather than
 * running on, so the water stays open in places. Like the near bank, its shape is a smooth
 * function of x alone, seamless from chunk to chunk.
 */
export default class FarShoreLayer extends Layer {
    /**
     * How tall the far shore is at x, 0 where there is none
     * @param {number} x - Position in the world
     * @returns {number} Height of the land above the horizon
     */
    static height(x: number): number {
        const presence = Perlin.noise(x * 0.0011, 61.1) - (1 - COVER);
        if (presence <= 0) return 0;
        // Rises gently from nothing at the ends of a stretch
        const ramp = Math.min(1, presence / 0.08);
        // Low rolling hills, with smaller bumps on them
        const hills = Math.max(0, Perlin.noise(x * 0.005, 64.4) - 0.2) * 45;
        const bumps = Perlin.noise(x * 0.03, 66.6) * 7;
        return ramp * (3 + hills + bumps);
    }

    /**
     * @param {number} xOffset - Left end of the stretch
     * @param {number} width - Length of the stretch
     */
    constructor(xOffset: number, width: number) {
        super("farShore", xOffset, HORIZON);

        let run: Point[] = [];
        const finish = () => {
            if (run.length > 2) this.addStrip(run);
            run = [];
        };

        for (let x = xOffset - STEP * 2; x <= xOffset + width + STEP * 2; x += STEP) {
            const height = FarShoreLayer.height(x);
            if (height > 0.5) {
                run.push(new Point(x, HORIZON - height));
            } else {
                finish();
            }
        }
        finish();
    }

    /** One stretch of far land: a pale wash with faint tree dots along its top */
    private addStrip(top: Point[]): void {
        const base = [...top].reverse().map((p) => new Point(p.x, HORIZON + 4));
        this.add(new Element([...top, ...base], 0, 0, "rgb(213,213,213)", "none"));
        this.add(new Stroke(top, "rgba(100,100,100,0.18)", "rgba(100,100,100,0.18)", 0.8, 0.4));

        // Far-off trees: tiny upright dabs where the land is a little higher
        for (let i = 1; i < top.length - 1; i++) {
            if (PRNG.random() > 0.35) continue;
            const { x, y } = top[i];
            const height = PRNG.random(2.5, 6);
            const ink = `rgba(100,100,100,${PRNG.random(0.18, 0.32).toFixed(2)})`;
            this.add(
                new Stroke(
                    [new Point(x, y + 1), new Point(x + PRNG.random(-0.5, 0.5), y - height)],
                    ink,
                    ink,
                    1.4,
                    0.2
                )
            );
        }
    }
}
