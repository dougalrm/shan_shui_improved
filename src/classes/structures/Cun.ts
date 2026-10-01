import Element from "../Element";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";

/**
 * Texture strokes (皴法, cun): how a painter models rock with the brush. Mountains are drawn as
 * nested rings, `rings[0]` the outer ridge and each next ring further down and in towards the
 * foot, so a column `rings[i][j]` for growing i runs down the slope (its fall line).
 */

/** One axe-cut stroke: a wedge dragged with the side of the brush, broad where it lands */
const wedge = (at: Point, direction: Point, length: number, width: number, ink: string): Element => {
    // Across the stroke
    const across = new Point(-direction.y, direction.x);
    const point = (along: number, side: number) =>
        new Point(
            at.x + direction.x * along * length + across.x * side * width,
            at.y + direction.y * along * length + across.y * side * width
        );
    const ragged = () => PRNG.random(-0.15, 0.15);

    return new Element(
        [
            point(0, -0.5),
            point(0.05, 0.5),
            point(0.45, 0.4 + ragged()),
            point(1, 0.05),
            point(0.6, -0.25 + ragged()),
        ],
        0,
        0,
        ink,
        "none"
    );
};

/** The direction down the slope at ring i, column j, as a unit vector */
const fallLine = (rings: Point[][], i: number, j: number): Point => {
    const from = rings[i][j];
    const to = rings[Math.min(rings.length - 1, i + 1)][j];
    const dx = to.x - from.x;
    const dy = Math.max(0.5, to.y - from.y);
    const length = Math.hypot(dx, dy);
    return new Point(dx / length, dy / length);
};

/**
 * Hemp-fibre strokes (披麻皴): long, soft, slightly wavering lines running down the slopes in
 * loose bundles, the texture of the rounded, earthy hills of the south
 */
export class HempFibre extends Structure {
    /**
     * @param {Point[][]} rings - The mountain's rings
     * @param {number} xOffset - Where the mountain is
     * @param {number} yOffset - Where the mountain is
     * @param {number} bundles - How many bundles of strokes
     */
    constructor(rings: Point[][], xOffset: number, yOffset: number, bundles: number) {
        super();
        const details = rings[0].length;

        for (let b = 0; b < bundles; b++) {
            const centre = Math.floor(PRNG.random(4, details - 5));
            // From just under a ridge, a long way down
            const first = PRNG.randomChoice([0, 0, 0, 1, 2]);
            const last = Math.min(rings.length - 1, first + Math.floor(PRNG.random(4, 8)));
            const strokes = Math.floor(PRNG.random(3, 5.99));

            for (let s = 0; s < strokes; s++) {
                // Side by side, a column apart, all drifting together
                let j = Math.max(1, Math.min(details - 2, centre + s));
                const line: Point[] = [];
                const begin = first + 0.12 + PRNG.random(0, 0.5);

                for (let t = begin; t <= last; t += 0.34) {
                    const i = Math.floor(t);
                    const next = Math.min(rings.length - 1, i + 1);
                    const f = t - i;
                    const a = rings[i][j];
                    const z = rings[next][j];
                    const wobble = (Perlin.noise(t * 0.8, centre * 0.3, b) - 0.5) * 4;
                    line.push(
                        new Point(
                            a.x * (1 - f) + z.x * f + wobble + xOffset,
                            a.y * (1 - f) + z.y * f + yOffset
                        )
                    );
                }
                if (line.length < 3) continue;

                const ink = `rgba(100,100,100,${PRNG.random(0.12, 0.26).toFixed(2)})`;
                this.add(
                    new Stroke(line, ink, ink, PRNG.random(0.7, 1.1), 0.6, 1, (x) =>
                        Math.sin(x * Math.PI) * 0.8 + 0.2
                    )
                );
            }
        }
    }
}

/**
 * Axe-cut strokes (斧劈皴): short, broad, angular wedges laid down the steep faces in
 * clusters, dark where the brush lands, the texture of the hard, fractured rock of the north
 */
export class AxeCut extends Structure {
    /**
     * @param {Point[][]} rings - The mountain's rings
     * @param {number} xOffset - Where the mountain is
     * @param {number} yOffset - Where the mountain is
     * @param {number} clusters - How many clusters of strokes
     * @param {number} scale - Size of the strokes
     */
    constructor(rings: Point[][], xOffset: number, yOffset: number, clusters: number, scale: number = 1) {
        super();
        const details = rings[0].length;

        for (let c = 0; c < clusters; c++) {
            // More on the shadow side (the right), away from the light
            const shadow = PRNG.random() < 0.7;
            const j = Math.floor(
                shadow ? PRNG.random(details * 0.55, details - 3) : PRNG.random(3, details * 0.45)
            );
            const i = Math.floor(PRNG.random(0, rings.length * 0.55));
            const direction = fallLine(rings, i, j);
            const strokes = Math.floor(PRNG.random(3, 6.99));
            const start = rings[i][j];

            for (let s = 0; s < strokes; s++) {
                // Stacked down the face, each set off a little to the side
                const along = s * PRNG.random(7, 12) * scale;
                const sideways = PRNG.random(-4, 4) * scale;
                const at = new Point(
                    start.x + direction.x * along - direction.y * sideways + xOffset,
                    start.y + direction.y * along + direction.x * sideways + yOffset
                );
                // Dragged slanting across the fall line, the way the brush is pulled sideways
                const slant = (shadow ? -1 : 1) * PRNG.random(0.4, 0.9);
                const dir = new Point(
                    direction.x * Math.cos(slant) - direction.y * Math.sin(slant),
                    direction.x * Math.sin(slant) + direction.y * Math.cos(slant)
                );
                const ink = `rgba(100,100,100,${PRNG.random(0.25, 0.45).toFixed(2)})`;
                this.add(wedge(at, dir, PRNG.random(14, 26) * scale, PRNG.random(4, 8) * scale, ink));
            }
        }
    }
}

/** Axe-cut wedges down the shadow side of a cliff face given by its left and right edges */
export class CliffAxeCut extends Structure {
    /**
     * @param {Point[]} left - The face's left edge, top to bottom
     * @param {Point[]} right - The face's right edge, top to bottom
     * @param {number} clusters - How many clusters of strokes
     */
    constructor(left: Point[], right: Point[], clusters: number) {
        super();

        for (let c = 0; c < clusters; c++) {
            const across = PRNG.random(0.55, 0.92);
            const row = Math.floor(PRNG.random(0, 0.85) * left.length);
            const strokes = Math.floor(PRNG.random(2, 4.99));
            const width = Math.abs(right[row].x - left[row].x);
            const size = Math.max(0.5, Math.min(1.2, width / 40));

            for (let s = 0; s < strokes; s++) {
                const r = Math.min(left.length - 1, row + s * 2);
                const at = new Point(
                    left[r].x + (right[r].x - left[r].x) * (across + PRNG.random(-0.05, 0.05)),
                    left[r].y + s * PRNG.random(6, 10) * size
                );
                const slant = PRNG.random(-0.5, -0.15);
                const dir = new Point(Math.sin(slant), Math.cos(slant));
                const ink = `rgba(100,100,100,${PRNG.random(0.25, 0.45).toFixed(2)})`;
                this.add(wedge(at, dir, PRNG.random(12, 22) * size, PRNG.random(4, 7) * size, ink));
            }
        }
    }
}
