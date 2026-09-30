import Layer from "../Layer";
import PRNG from "../PRNG";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import { config } from "../../config";

const WIDTH = config.layers.birds.width;

/**
 * A flock of wild geese (雁) crossing the sky: each bird is two small curved strokes,
 * the whole flock in a loose V or a slanting line, getting smaller into the distance.
 */
export default class BirdsLayer extends Layer {
    /**
     * @param {number} xOffset - Left edge of the flock
     * @param {number} yOffset - Top of it
     */
    constructor(xOffset: number, yOffset: number) {
        super("birds", xOffset, yOffset);

        const count = Math.floor(PRNG.random(4, 11.99));
        const inV = PRNG.random() < 0.5;
        // Heading left or right; the leader is at the front
        const direction = PRNG.randomSign();
        const leadX = direction > 0 ? xOffset + WIDTH : xOffset;
        const leadY = yOffset + PRNG.random(0, 20);
        const spacing = WIDTH / count;

        for (let i = 0; i < count; i++) {
            // In a V the birds alternate between the two arms
            const arm = inV ? (i % 2 === 0 ? 1 : -1) : 1;
            const rank = inV ? Math.ceil(i / 2) : i;
            const x =
                leadX - direction * rank * spacing * PRNG.random(0.8, 1.2);
            const y =
                leadY + arm * rank * spacing * 0.35 + PRNG.random(-3, 3);
            const size = PRNG.random(4, 6.5) * (1 - rank / (count * 2.5));

            this.addBird(x, y, size, PRNG.random(-0.2, 0.2));
        }
    }

    /** Two wings, each a short curved stroke, meeting at the body */
    private addBird(x: number, y: number, size: number, flap: number): void {
        const ink = `rgba(40,40,40,${PRNG.random(0.55, 0.8).toFixed(2)})`;

        for (const side of [-1, 1]) {
            const wing = [
                new Point(x, y),
                new Point(x + side * size * 0.5, y - size * (0.35 + flap)),
                new Point(x + side * size, y - size * (0.05 + flap)),
            ];
            this.add(new Stroke(wing, ink, ink, 0.9, 0.2));
        }
    }
}
