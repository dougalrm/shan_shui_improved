import Element from "../Element";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";
import MossDots from "./MossDots";

/**
 * A waterfall (瀑布) set into the mountain the way ink painters do it: it emerges from a gully
 * between ridges (a faint V climbing above it), pours between dark boulders, is set into the
 * rock by short strokes down both banks, and falls as bare silk whose edges grow fainter and
 * more broken until it disappears into the mist at the mountain's foot.
 */
export default class Waterfall extends Structure {
    /**
     * @param {number} x - Centre of the top of the fall
     * @param {number} top - Where it starts
     * @param {number} bottom - Where it ends (in the mist at the foot)
     * @param {number} width - Width at the top; it widens a little as it falls
     */
    constructor(x: number, top: number, bottom: number, width: number) {
        super();

        const { left, right } = this.addWater(x, top, bottom, width);
        this.addGully(x, top, width, bottom - top);
        this.addBanks(left, right);
        this.addBoulders(left[0], right[0]);
    }

    /** The falling water: bare silk between edges that fade and break up as it falls */
    private addWater(
        x: number,
        top: number,
        bottom: number,
        width: number
    ): { left: Point[]; right: Point[] } {
        const steps = Math.max(8, Math.floor((bottom - top) / 6));
        const seed = PRNG.random(0, 100);
        const left: Point[] = [];
        const right: Point[] = [];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const y = top + t * (bottom - top);
            const sway = (Perlin.noise(t * 2.5, seed) - 0.5) * width * 1.6;
            // Narrow where it pours from the gully, spreading as it falls
            const half = (width / 2) * (0.6 + t * 1.1);

            left.push(new Point(x + sway - half, y));
            right.push(new Point(x + sway + half, y));
        }

        this.add(
            new Element(left.concat([...right].reverse()), 0, 0, "white", "none")
        );

        // Edges in pieces, each fainter than the one above, with gaps between
        const pieces = 4;
        for (let p = 0; p < pieces; p++) {
            const from = Math.floor((steps * p) / pieces);
            const to = Math.floor((steps * (p + 1)) / pieces) - (p > 0 ? 1 : 0);
            const ink = `rgba(90,90,90,${(0.5 - p * 0.11).toFixed(2)})`;

            for (const edge of [left, right]) {
                if (p > 0 && PRNG.random() < 0.3) continue;
                const piece = edge.slice(from, Math.max(from + 2, to));
                if (piece.length > 1) this.add(new Stroke(piece, ink, ink, 1, 0.6));
            }
        }

        // A few faint lines of falling water
        const strands = Math.floor(PRNG.random(2, 4.99));
        for (let n = 0; n < strands; n++) {
            const offset = PRNG.random(-0.5, 0.5);
            const start = Math.floor(PRNG.random(0, steps * 0.3));
            const end = Math.floor(PRNG.random(steps * 0.4, steps * 0.8));
            const strand: Point[] = [];

            for (let i = start; i <= end; i++) {
                const middle = (left[i].x + right[i].x) / 2;
                const half = (right[i].x - left[i].x) / 2;
                strand.push(new Point(middle + offset * half, left[i].y));
            }
            if (strand.length > 2) {
                const water = "rgba(100,100,100,0.18)";
                this.add(new Stroke(strand, water, water, 0.6, 0.5));
            }
        }

        return { left, right };
    }

    /** The gully the water comes from: two faint strokes converging up the slope */
    private addGully(x: number, top: number, width: number, fall: number): void {
        const reach = Math.min(fall * 0.35, 70);
        const ink = "rgba(100,100,100,0.32)";

        for (const side of [-1, 1]) {
            const line = [0, 0.33, 0.66, 1].map(
                (t) =>
                    new Point(
                        x + side * width * (1.3 - t * 1.0) + PRNG.random(-1.5, 1.5),
                        top - t * reach
                    )
            );
            this.add(new Stroke(line, ink, ink, 1.1, 0.6));
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
