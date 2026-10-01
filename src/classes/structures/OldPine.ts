import Element from "../Element";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";
import { isSnowy, snowCap, snowLine } from "../../utils/snow";

const ink = (from: number, to: number) => `rgba(100,100,100,${PRNG.random(from, to).toFixed(2)})`;

/**
 * An old pine (古松) in the very front of the picture, rising from below its bottom edge: a
 * gnarled, leaning trunk with fish-scale bark, and long branches reaching out sideways, each
 * ending in flat pads of needles drawn as little wheels of strokes. Painters set one at the
 * edge of a view to frame it and push the landscape back.
 */
export default class OldPine extends Structure {
    /**
     * @param {number} x - Where the trunk comes up from below the picture
     * @param {number} base - Where it starts (below the bottom edge)
     * @param {number} height - How high it reaches
     * @param {number} lean - Which way it leans and how far (about -1 to 1)
     */
    constructor(x: number, base: number, height: number, lean: number) {
        super();

        const seed = PRNG.random(0, 100);
        const steps = 24;
        const centre: Point[] = [];
        const widths: number[] = [];
        const bottomWidth = height * PRNG.random(0.075, 0.095);

        // The trunk's line: leaning, with a twist or two
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const bend = Math.sin(t * Math.PI * 0.8) * lean * height * 0.35;
            const twist = (Perlin.noise(t * 3.5, seed) - 0.5) * height * 0.2;
            centre.push(new Point(x + bend + twist, base - t * height));
            widths.push(bottomWidth * (1 - t * 0.7));
        }

        const left: Point[] = [];
        const right: Point[] = [];
        centre.forEach((point, i) => {
            const next = centre[Math.min(steps, i + 1)];
            const previous = centre[Math.max(0, i - 1)];
            const dx = next.x - previous.x;
            const dy = next.y - previous.y;
            const length = Math.hypot(dx, dy) || 1;
            const nx = -dy / length;
            const ny = dx / length;
            const w = widths[i] / 2 + (Perlin.noise(i * 0.4, seed + 1) - 0.5) * widths[i] * 0.4;
            left.push(new Point(point.x + nx * w, point.y + ny * w));
            right.push(new Point(point.x - nx * w, point.y - ny * w));
        });

        // Branches first, so the trunk is drawn over where they join it
        const branches = Math.floor(PRNG.random(3, 5.99));
        const pads: Array<{ x: number; y: number; size: number }> = [];
        for (let b = 0; b < branches; b++) {
            const at = Math.floor(PRNG.random(0.45, 0.92) * steps);
            const side = b % 2 === 0 ? Math.sign(lean || 1) : -Math.sign(lean || 1);
            const reach = height * PRNG.random(0.25, 0.5) * (side === Math.sign(lean || 1) ? 1 : 0.6);
            pads.push(...this.addBranch(centre[at], side, reach, widths[at] * 0.45));
        }
        // And a crown at the top
        pads.push({ x: centre[steps].x, y: centre[steps].y - 4, size: height * 0.09 });

        // The trunk: silk inside, so it hides what is behind it, then its two edges
        this.add(new Element([...left, ...[...right].reverse()], 0, 0, "white", "none"));
        // The shadow side is a broad dark stroke, the lit side a thinner one
        const lit = lean >= 0 ? left : right;
        const shade = lean >= 0 ? right : left;
        // A wash over the trunk, deeper on the shadow side
        this.add(new Element([...left, ...[...right].reverse()], 0, 0, "rgba(100,100,100,0.18)", "none"));
        this.add(new Element([...centre, ...[...shade].reverse()], 0, 0, "rgba(100,100,100,0.25)", "none"));
        this.add(new Stroke(lit, ink(0.7, 0.85), ink(0.7, 0.85), 2.4, 0.9));
        this.add(new Stroke(shade, ink(0.8, 0.95), ink(0.8, 0.95), 4.5, 1));
        this.addBark(centre, widths);

        pads.forEach((pad) => this.addNeedles(pad.x, pad.y, pad.size));
    }

    /** A branch reaching out sideways, dipping and rising again, with pads along it */
    private addBranch(from: Point, side: number, reach: number, width: number) {
        const points: Point[] = [];
        const droop = PRNG.random(-0.25, 0.15);
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            points.push(
                new Point(
                    from.x + side * reach * t,
                    from.y + reach * (droop * Math.sin(t * Math.PI) - 0.15 * t) + PRNG.random(-2, 2)
                )
            );
        }
        const color = ink(0.75, 0.9);
        this.add(new Stroke(points, color, color, Math.max(3, width * 1.6), 0.9, 1, (t) => 1 - t * 0.75));
        if (isSnowy()) this.add(snowLine(points, Math.max(2, width * 0.8)));

        // Pads along the outer part of the branch, the biggest at its end
        const pads = [];
        for (const t of [0.55, 0.8, 1]) {
            if (t < 1 && PRNG.random() < 0.4) continue;
            const point = points[Math.round(t * 10)];
            pads.push({ x: point.x, y: point.y - 3, size: reach * (0.2 + 0.15 * t) });
        }
        return pads;
    }

    /** Fish-scale bark: short curved strokes across the trunk, and a knot or two */
    private addBark(centre: Point[], widths: number[]): void {
        for (let i = 1; i < centre.length - 3; i++) {
            const scales = Math.floor(PRNG.random(2, 4.99));
            for (let s = 0; s < scales; s++) {
                const across = PRNG.random(-0.35, 0.35) * widths[i];
                const w = widths[i] * PRNG.random(0.18, 0.32);
                const at = new Point(centre[i].x + across, centre[i].y + PRNG.random(-4, 4));
                const color = ink(0.45, 0.65);
                // A rounded plate of bark, open at the top
                this.add(
                    new Stroke(
                        [0, 0.25, 0.5, 0.75, 1].map(
                            (k) =>
                                new Point(
                                    at.x - Math.cos(k * Math.PI) * w,
                                    at.y + Math.sin(k * Math.PI) * w * 0.6
                                )
                        ),
                        color,
                        color,
                        1,
                        0.4
                    )
                );
            }
        }
        const knot = centre[Math.floor(PRNG.random(0.3, 0.7) * centre.length)];
        const r = widths[0] * 0.15;
        const color = ink(0.4, 0.6);
        this.add(
            new Stroke(
                [0, 1, 2, 3, 4, 5, 6].map((k) => new Point(knot.x + Math.cos(k) * r, knot.y + Math.sin(k) * r * 0.7)),
                color,
                color,
                1.2,
                0.5
            )
        );
    }

    /**
     * A flat pad of needles: a pale wash with wheels of short strokes on it, spread wide and
     * shallow, as pine foliage is painted
     */
    private addNeedles(x: number, y: number, size: number): void {
        const wash: Point[] = [];
        for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2;
            const r = 1 + (Perlin.noise(k * 0.5, x * 0.01) - 0.5) * 0.4;
            wash.push(new Point(x + Math.cos(a) * size * r, y + Math.sin(a) * size * 0.32 * r));
        }
        this.add(new Element(wash, 0, 0, "rgba(100,100,100,0.3)", "none"));

        const wheels = Math.max(4, Math.round(size / 4.5));
        for (let w = 0; w < wheels; w++) {
            const hubX = x + PRNG.random(-0.85, 0.85) * size;
            const hubY = y + PRNG.random(-0.25, 0.2) * size;
            const needles = Math.floor(PRNG.random(11, 16));
            const length = PRNG.random(0.18, 0.28) * size + 4;
            const color = ink(0.7, 0.95);
            for (let n = 0; n < needles; n++) {
                // Fanning out over the top half, flattened
                const a = Math.PI + (n / (needles - 1)) * Math.PI + PRNG.random(-0.08, 0.08);
                this.add(
                    new Stroke(
                        [
                            new Point(hubX, hubY),
                            new Point(hubX + Math.cos(a) * length, hubY + Math.sin(a) * length * 0.55),
                        ],
                        color,
                        color,
                        1.1,
                        0.2
                    )
                );
            }
        }

        // Snow lying on the pad in winter
        const snow = isSnowy() ? snowCap(wash, 0.55) : undefined;
        if (snow) this.add(snow);
    }
}
