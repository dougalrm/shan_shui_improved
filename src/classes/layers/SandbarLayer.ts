import Element from "../Element";
import Layer from "../Layer";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";

/**
 * A sandbar (平沙): a long, low spit of sand lying on the open water, tapering at both ends,
 * with a few reeds. A classic motif of quiet water in Shan Shui.
 */
export default class SandbarLayer extends Layer {
    /**
     * @param {number} xOffset - Left end
     * @param {number} yOffset - The waterline
     * @param {number} width - Length
     */
    constructor(xOffset: number, yOffset: number, width: number) {
        super("sandbar", xOffset, yOffset);

        const steps = Math.max(12, Math.floor(width / 10));
        const seed = PRNG.random(0, 100);
        const thickness = PRNG.random(4, 8);
        const top: Point[] = [];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const rise = Math.pow(Math.sin(Math.PI * t), 0.7) * thickness;
            const wobble = (Perlin.noise(t * 5, seed) - 0.5) * thickness;
            top.push(new Point(xOffset + t * width, yOffset - rise - Math.max(0, wobble)));
        }

        const base = [...top].reverse().map((p) => new Point(p.x, yOffset + 2));
        this.add(new Element([...top, ...base], 0, 0, "white", "none"));
        const edge = "rgba(100,100,100,0.35)";
        this.add(new Stroke(top, edge, edge, 1.2, 0.6));
        // The faint line where sand meets water
        const water = "rgba(100,100,100,0.2)";
        this.add(
            new Stroke(
                [new Point(xOffset - 8, yOffset + 3), new Point(xOffset + width + 8, yOffset + 3)],
                water,
                water,
                0.8,
                0.5
            )
        );

        // A few clumps of reeds
        const clumps = Math.floor(PRNG.random(1, 4.99));
        for (let c = 0; c < clumps; c++) {
            const at = top[Math.floor(PRNG.random(0.2, 0.8) * steps)];
            const blades = Math.floor(PRNG.random(3, 6.99));
            for (let b = 0; b < blades; b++) {
                const x = at.x + b * 2 - blades;
                const height = PRNG.random(6, 14);
                const lean = PRNG.random(-3, 3);
                const ink = `rgba(100,100,100,${PRNG.random(0.3, 0.5).toFixed(2)})`;
                this.add(
                    new Stroke(
                        [new Point(x, at.y + 1), new Point(x + lean, at.y - height)],
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
