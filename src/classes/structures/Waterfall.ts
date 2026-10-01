import Element from "../Element";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";
import { expand } from "../../utils/utils";
import MossDots from "./MossDots";

/**
 * A waterfall (瀑布) cascading down a mountain slope, set in the way ink painters do it: it
 * follows its course down the ground, from dark boulders where it rises, as bare silk widening
 * as it goes, spilling over small ledges, framed by patches of darker rock on both banks, its
 * edges growing fainter and more broken until it disappears into the mist at the foot.
 */
export default class Waterfall extends Structure {
    /**
     * @param {Point[]} course - The line the water runs down, from its source to the foot
     * @param {number} width - Width where it starts; it widens as it falls
     */
    constructor(course: Point[], width: number) {
        super();

        // The ribbon of water either side of its course, widening as it goes
        const sides = expand(course, (t) => (width / 2) * (0.5 + t));
        const average = (side: Point[]) =>
            side.reduce((sum, point) => sum + point.x, 0) / side.length;
        // expand gives the two sides in either order: make sure left is the left bank
        const [left, right] =
            average(sides[0]) <= average(sides[1]) ? sides : [sides[1], sides[0]];

        // The dark rock either side goes down first; the water is bare silk over it
        this.addRockWash(left, -1);
        this.addRockWash(right, 1);
        this.addWater(course, left, right);
        this.addLedges(left, right);
        this.addBanks(left, right);
        this.addBoulders(left[0], right[0]);
    }

    /**
     * Darker wash on the rock beside the water, so the white fall stands out against it, as ink
     * painters frame waterfalls. Broken, irregular patches of varying width and strength, like
     * brushwork rather than a band; strongest near the top and fading as the fall goes down.
     */
    private addRockWash(edge: Point[], side: number): void {
        const steps = edge.length - 1;
        const seed = PRNG.random(0, 100);
        let i = 0;

        while (i < steps) {
            const start = i;
            const end = Math.min(steps, start + Math.floor(PRNG.random(3, 8)));

            if (PRNG.random() < 0.7) {
                const t = start / steps;
                const strength = 0.2 * (1 - t * 0.7) * PRNG.random(0.6, 1);
                const inner = edge.slice(start, end + 1);
                const outer = inner.map(
                    (point, k) =>
                        new Point(
                            point.x +
                                side * (3 + 10 * Perlin.noise((start + k) * 0.3, seed)),
                            point.y
                        )
                );
                const ink = `rgba(70,70,70,${strength.toFixed(2)})`;

                this.add(
                    new Element(inner.concat([...outer].reverse()), 0, 0, ink, "none")
                );
            }
            i = end + Math.floor(PRNG.random(1, 4));
        }
    }

    /** The falling water: bare silk between edges that fade and break up as it falls */
    private addWater(course: Point[], left: Point[], right: Point[]): void {
        const steps = left.length - 1;

        this.add(
            new Element(left.concat([...right].reverse()), 0, 0, "white", "none")
        );

        // Edges in pieces, each fainter than the one above, with gaps between
        const pieces = 4;
        for (let p = 0; p < pieces; p++) {
            const from = Math.floor((steps * p) / pieces);
            const to = Math.floor((steps * (p + 1)) / pieces) - (p > 0 ? 1 : 0);
            const ink = `rgba(80,80,80,${(0.6 - p * 0.12).toFixed(2)})`;

            for (const edge of [left, right]) {
                if (p > 0 && PRNG.random() < 0.3) continue;
                const piece = edge.slice(from, Math.max(from + 2, to));
                if (piece.length > 1) this.add(new Stroke(piece, ink, ink, 1, 0.6));
            }
        }

        // A few faint lines of falling water
        const strands = Math.floor(PRNG.random(2, 4.99));
        for (let n = 0; n < strands && course.length > 2; n++) {
            const offset = PRNG.random(-0.5, 0.5);
            const start = Math.floor(PRNG.random(0, steps * 0.3));
            const end = Math.floor(PRNG.random(steps * 0.4, steps * 0.8));
            const strand: Point[] = [];

            // Following the course, a fixed share of the way across the stream
            const across = 0.5 + offset / 2;
            for (let i = start; i <= end; i++) {
                strand.push(
                    new Point(
                        left[i].x + (right[i].x - left[i].x) * across,
                        left[i].y + (right[i].y - left[i].y) * across
                    )
                );
            }
            if (strand.length > 2) {
                const water = "rgba(100,100,100,0.18)";
                this.add(new Stroke(strand, water, water, 0.6, 0.5));
            }
        }
    }

    /** Small ledges the water spills over on its way down: a dark lip across the stream */
    private addLedges(left: Point[], right: Point[]): void {
        const count = Math.floor(PRNG.random(2, 4.99));

        for (let n = 0; n < count; n++) {
            const i = Math.floor(PRNG.random(0.15, 0.85) * left.length);
            const [l, r] = [left[i], right[i]];
            // A gently rounded lip of rock, not a chevron
            const lip = [
                new Point(l.x - 4, l.y + 1),
                new Point((l.x + r.x) / 2, (l.y + r.y) / 2 - 1.5),
                new Point(r.x + 4, r.y + 1),
            ];
            const ink = `rgba(60,60,60,${PRNG.random(0.3, 0.45).toFixed(2)})`;
            this.add(new Stroke(lip, ink, ink, 1.4, 0.4));
        }
    }

    /** Short strokes down both banks, setting the water into the rock */
    private addBanks(left: Point[], right: Point[]): void {
        const count = Math.floor(PRNG.random(5, 10.99));

        for (let n = 0; n < count; n++) {
            const side = PRNG.random() < 0.5 ? -1 : 1;
            const edge = side < 0 ? left : right;
            const i = Math.floor(PRNG.random(0, 0.7) * edge.length);
            const length = Math.max(3, Math.floor(PRNG.random(0.06, 0.15) * edge.length));
            const offset = side * PRNG.random(3, 9);
            const stroke = edge
                .slice(i, Math.min(edge.length, i + length))
                .map((p) => new Point(p.x + offset, p.y));

            if (stroke.length > 1) {
                const ink = `rgba(80,80,80,${PRNG.random(0.25, 0.42).toFixed(2)})`;
                this.add(new Stroke(stroke, ink, ink, 1.1, 0.5));
            }
        }
    }

    /** Dark boulders and moss either side of where it pours over */
    private addBoulders(leftTop: Point, rightTop: Point): void {
        const ledge = [
            new Point(leftTop.x - 10, leftTop.y + 2),
            new Point(leftTop.x - 4, leftTop.y),
            new Point(rightTop.x + 4, rightTop.y),
            new Point(rightTop.x + 10, rightTop.y + 2),
        ];
        this.add(new MossDots(ledge, 0, 0, PRNG.random(0, 100), 0.9, 0.8));
    }
}
