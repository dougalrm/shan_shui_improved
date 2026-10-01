import House from "./House";
import Pagoda from "./Pagoda";
import PRNG from "../PRNG";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";
import Tree03 from "./Tree03";
import { footMist } from "./Mist";

/**
 * A mountain temple (山寺) tucked into a valley: a main hall on the highest terrace, side
 * halls stepping down the slope in front of it, sometimes a pagoda beside it, old pines
 * around, and a low wall with a gate. Mist drifts across its lower half, so it is glimpsed
 * rather than shown, the way temples appear in so many landscapes.
 */
export default class Temple extends Structure {
    /**
     * @param {number} x - Centre of the temple
     * @param {number} y - Ground level of the front terrace
     * @param {number} size - Width of the main hall (about 30-50)
     */
    constructor(x: number, y: number, size: number) {
        super();

        const step = size * 0.45;
        const style = PRNG.randomChoice([0, 1, 2]);
        const rotation = PRNG.random(0.3, 0.7);
        const hasPagoda = PRNG.random() < 0.45;
        const pagodaSide = PRNG.randomSign();

        // Pines behind and among the halls, drawn first so the roofs stand in front
        for (let i = 0; i < 4; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const tx = x + side * PRNG.random(size * 0.7, size * 1.6);
            const ink = `rgba(100,100,100,${PRNG.random(0.2, 0.35).toFixed(2)})`;
            const bend = PRNG.random(-0.1, 0.1);
            this.add(new Tree03(tx, y - step * PRNG.random(0.5, 2), PRNG.random(25, 45), ink, (v) => v * bend));
        }

        if (hasPagoda) {
            this.add(new Pagoda(x + pagodaSide * size * 1.25, y - step * 1.4, size * 0.3, 5));
        }

        // The main hall at the back, on the highest terrace, then the side halls in front
        this.add(new House(x, y - step * 2, size, 2, rotation, style, false));
        this.add(new House(x - size * 0.95, y - step, size * 0.7, 1, rotation, style, false));
        this.add(new House(x + size * 0.95, y - step, size * 0.7, 1, rotation, style, false));

        // Terrace walls and the front wall with its gate
        const wall = (left: number, right: number, at: number) => {
            const ink = `rgba(100,100,100,${PRNG.random(0.3, 0.45).toFixed(2)})`;
            this.add(
                new Stroke(
                    [new Point(left, at), new Point((left + right) / 2, at + PRNG.random(-1, 1)), new Point(right, at)],
                    ink,
                    ink,
                    1,
                    0.5
                )
            );
        };
        wall(x - size * 1.3, x - size * 0.2, y + 2);
        wall(x + size * 0.2, x + size * 1.3, y + 2);
        wall(x - size * 0.6, x + size * 0.6, y - step + 2);

        // Mist across the lower half, so the temple is glimpsed through it
        this.add(footMist(x, y - step * 0.4, size * 3.2, size * 1.4));
    }
}
