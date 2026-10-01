import Element from "../Element";
import Man from "./Man";
import Point from "../Point";
import PRNG from "../PRNG";
import Rail from "./Rail";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";

const INK = "rgba(100,100,100,0.55)";
const FAINT = "rgba(100,100,100,0.25)";

/**
 * A thatched pavilion (茅亭) where travellers sit to take in the view: a square floor with a
 * low railing, four slender posts, and a pyramidal thatched roof whose eaves turn up at the
 * corners, a small finial at the top. One or two figures may be sitting inside.
 */
export default class Pavilion extends Structure {
    /**
     * @param {number} xOffset - Centre of the floor
     * @param {number} yOffset - The floor
     * @param {number} [seed=0] - Seed for the railing
     * @param {number} [height=70] - From the floor to the top of the roof
     * @param {number} [width=180] - Width of the floor
     * @param {number} [perspective=5] - How much of the far side shows
     */
    constructor(
        xOffset: number,
        yOffset: number,
        seed: number = 0,
        height: number = 70,
        width: number = 180,
        perspective: number = 5
    ) {
        super();

        const half = width / 2;
        const apex = yOffset - height;
        const eave = yOffset - height * 0.52;
        // The figures inside are sized to the pavilion
        const figure = (height / 70) * 0.42;

        // The far railing and posts first, so the near ones are drawn over them
        this.add(new Rail(xOffset, yOffset, seed, true, 8, width * 0.9, perspective * 2, Math.floor(PRNG.random(3, 6)), false));
        for (const side of [-1, 1]) {
            const x = xOffset + side * half * 0.48;
            this.add(new Stroke([new Point(x, eave + 2), new Point(x, yOffset - 3)], FAINT, FAINT, 1, 0.2));
        }

        this.addPeople(xOffset, yOffset, width, figure);

        for (const side of [-1, 1]) {
            const x = xOffset + side * half * 0.72;
            this.add(new Stroke([new Point(x, eave + 3), new Point(x, yOffset + 1)], INK, INK, 1.4, 0.2));
        }
        this.add(new Rail(xOffset, yOffset, seed, false, 8, width * 0.9, perspective * 2, Math.floor(PRNG.random(3, 6)), true));
        // The floor
        this.add(
            new Stroke(
                [new Point(xOffset - half * 0.9, yOffset + 1), new Point(xOffset + half * 0.9, yOffset + 1)],
                INK,
                INK,
                1.2,
                0.3
            )
        );

        this.addRoof(xOffset, apex, eave, half);
    }

    /** A pyramidal thatched roof with eaves turned up at the corners and a finial */
    private addRoof(x: number, apex: number, eave: number, half: number): void {
        const spread = half * 1.15;
        const flick = (eave - apex) * 0.18;
        const side = (s: number) => {
            // Concave slope from the apex out to the upturned eave tip
            const points: Point[] = [];
            for (let k = 0; k <= 6; k++) {
                const t = k / 6;
                points.push(
                    new Point(
                        x + s * spread * t,
                        apex + (eave - apex) * Math.pow(t, 0.7) - flick * Math.pow(t, 6)
                    )
                );
            }
            return points;
        };
        const left = side(-1);
        const right = side(1);
        const underside = [
            left[left.length - 1],
            new Point(x - half * 0.85, eave + 3),
            new Point(x, eave + 4),
            new Point(x + half * 0.85, eave + 3),
            right[right.length - 1],
        ];

        this.add(
            new Element([...[...left].reverse(), ...right, ...[...underside].reverse()], 0, 0, "white", "none")
        );
        this.add(new Stroke([...[...left].reverse(), ...right], INK, INK, 1.5, 0.4));
        this.add(new Stroke(underside, INK, INK, 1.2, 0.4));

        // Thatch: a few lines fanning down from the apex
        const lines = Math.floor(PRNG.random(4, 7.99));
        for (let n = 1; n < lines; n++) {
            const t = n / lines;
            const end = new Point(x + (t * 2 - 1) * half * 0.95, eave + 2);
            this.add(new Stroke([new Point(x, apex + 3), end], FAINT, FAINT, 0.8, 0.3));
        }

        // Finial
        this.add(new Stroke([new Point(x, apex + 1), new Point(x, apex - 5)], INK, INK, 1.2, 0.2));
    }

    /** No one, one person, or two facing each other */
    private addPeople(x: number, y: number, width: number, figure: number): void {
        const people = PRNG.randomChoice([0, 1, 1, 2]);

        if (people === 1) {
            this.add(new Man(x + PRNG.normalizedRandom(-width / 6, width / 6), y, PRNG.randomChoice([true, false]), figure));
        } else if (people === 2) {
            this.add(new Man(x + PRNG.normalizedRandom(-width / 4, -width / 6), y, false, figure));
            this.add(new Man(x + PRNG.normalizedRandom(width / 6, width / 4), y, true, figure));
        }
    }
}
