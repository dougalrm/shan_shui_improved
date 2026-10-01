import PRNG from "../PRNG";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";

/**
 * A footpath zigzagging up a mountain face in switchbacks: faint, broken strokes, as a
 * painter suggests a path rather than drawing it.
 */
export default class Path extends Structure {
    /**
     * @param {Point[]} turns - The corners of the path, from the foot upwards
     */
    constructor(turns: Point[]) {
        super();

        for (let i = 0; i < turns.length - 1; i++) {
            // Some stretches hidden behind rocks and trees
            if (PRNG.random() < 0.25) continue;

            const from = turns[i];
            const to = turns[i + 1];
            const ink = `rgba(100,100,100,${PRNG.random(0.3, 0.45).toFixed(2)})`;
            const middle = new Point(
                (from.x + to.x) / 2 + PRNG.random(-2, 2),
                (from.y + to.y) / 2 + PRNG.random(-1, 1)
            );

            this.add(new Stroke([from, middle, to], ink, ink, 0.9, 0.5));
        }
    }
}
