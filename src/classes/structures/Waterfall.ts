import Element from "../Element";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Structure from "../Structure";

/**
 * A waterfall (瀑布): a ribbon of bare silk falling down a mountain face, drawn only by its
 * fine edges and a few faint lines of falling water, disappearing into the mist below.
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

        // Two drops with a rock ledge between them (叠泉), the lower one a little aside
        const ledge = top + (bottom - top) * PRNG.random(0.3, 0.45);
        const shift = PRNG.randomSign() * width * PRNG.random(0.4, 0.8);

        this.addDrop(x, top, ledge, width);
        this.addLip(x, top, width);
        this.addDrop(x + shift, ledge, bottom, width * 1.25);
        this.addLip(x + shift, ledge, width * 1.25);
    }

    /** One falling sheet of water: bare silk between fine, broken edges */
    private addDrop(x: number, top: number, bottom: number, width: number): void {
        const steps = Math.max(8, Math.floor((bottom - top) / 6));
        const seed = PRNG.random(0, 100);
        const left: Point[] = [];
        const right: Point[] = [];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const y = top + t * (bottom - top);
            // The water sways as it falls and spreads towards the bottom
            const sway = (Perlin.noise(t * 2.5, seed) - 0.5) * width * 1.6;
            const half = (width / 2) * (1 + t * 0.6);

            left.push(new Point(x + sway - half, y));
            right.push(new Point(x + sway + half, y));
        }

        // The water itself is bare silk, cutting through the texture of the rock
        this.add(
            new Element(left.concat([...right].reverse()), 0, 0, "white", "none")
        );

        const edge = "rgba(90,90,90,0.55)";
        this.add(new Stroke(left, edge, edge, 1.1, 0.6));
        this.add(new Stroke(right, edge, edge, 1.1, 0.6));

        // A few faint lines of falling water
        const strands = Math.floor(PRNG.random(2, 4.99));
        for (let s = 0; s < strands; s++) {
            const offset = PRNG.random(-0.5, 0.5);
            const start = Math.floor(PRNG.random(0, steps * 0.3));
            const end = Math.floor(PRNG.random(steps * 0.5, steps));
            const strand: Point[] = [];

            for (let i = start; i <= end; i++) {
                const middle = (left[i].x + right[i].x) / 2;
                const half = (right[i].x - left[i].x) / 2;
                strand.push(new Point(middle + offset * half, left[i].y));
            }
            if (strand.length > 2) {
                const water = "rgba(100,100,100,0.25)";
                this.add(new Stroke(strand, water, water, 0.6, 0.5));
            }
        }
    }

    /** The dark lip of rock the water pours over */
    private addLip(x: number, y: number, width: number): void {
        const lip = [
            new Point(x - width * 1.4, y - 2),
            new Point(x - width * 0.4, y + 1),
            new Point(x + width * 0.5, y + 1.5),
            new Point(x + width * 1.4, y - 2),
        ];
        const rock = "rgba(50,50,50,0.6)";
        this.add(new Stroke(lip, rock, rock, 2, 0.4));
    }
}
