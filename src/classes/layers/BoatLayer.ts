import Element from "../Element";
import Layer from "../Layer";
import Man from "../structures/Man";
import PRNG from "../PRNG";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import { config } from "../../config";

const DEFAULT_FLIP = config.layers.boat.defaultFlip;
const FILL_COLOR = config.layers.boat.boat.fillColor;
const MAN_HASSTICK = config.layers.boat.man.hasStick;
const MAN_HATNUMBER = config.layers.boat.man.hatNumber;
const STROKE_COLOR = config.layers.boat.stroke.color;
const STROKE_FILL_COLOR = config.layers.boat.stroke.fillColor;
const STROKE_NOISE = config.layers.boat.stroke.strokeNoise;
const STROKE_STROKE_WIDTH = config.layers.boat.stroke.strokeWidth;
const STROKE_WIDTH = config.layers.boat.stroke.width;
/**
 * Represents a boat layer with different scale and flip.
 *
 * @extends Layer
 */
const INK = "rgba(100,100,100,0.6)";
const FAINT = "rgba(100,100,100,0.3)";

type BoatKind = "fishing" | "awning" | "sail" | "punt";

/**
 * A boat on the water, one of the river craft of classical painting:
 * - fishing: a fisherman crouched with his rod
 * - awning: a sampan with an arched woven canopy (篷船), a boatman sculling at the stern
 * - sail: a small junk under a battened sail (帆船)
 * - punt: a boatman poling at the stern, sometimes with a seated passenger
 */
export default class BoatLayer extends Layer {
    /**
     * @param {number} xOffset - Where the hull starts
     * @param {number} yOffset - The waterline
     * @param {number} width - Length of the hull (before scaling)
     * @param {number} scale - Size, smaller further away
     * @param {boolean} [flip=DEFAULT_FLIP] - Heading the other way
     */
    constructor(
        xOffset: number,
        yOffset: number,
        width: number,
        scale: number,
        flip: boolean = DEFAULT_FLIP
    ) {
        super("boat", xOffset, yOffset);

        const direction = flip ? -1 : 1;
        const length = width * scale;
        /** A point along the hull, 0 at the stern where the hull starts, 1 at the bow */
        const along = (t: number) => xOffset + t * length * direction;
        // Fishing skiffs 40%, sampans 25%, junks 15%, punts 20%
        const kind = PRNG.randomChoice<BoatKind>([
            ...Array<BoatKind>(8).fill("fishing"),
            ...Array<BoatKind>(5).fill("awning"),
            ...Array<BoatKind>(3).fill("sail"),
            ...Array<BoatKind>(4).fill("punt"),
        ]);

        if (kind === "fishing") {
            // Man on the boat
            this.add(
                new Man(
                    xOffset + 20 * scale * direction,
                    yOffset,
                    !flip,
                    0.5 * scale,
                    [0, 30, 20, 30, 10, 30, 30, 30, 30],
                    MAN_HASSTICK,
                    MAN_HATNUMBER
                )
            );
        }
        if (kind === "awning") this.addAwning(along, yOffset, scale, flip);
        if (kind === "sail") this.addSail(along, yOffset, scale, direction, flip);
        if (kind === "punt") this.addPunt(along, yOffset, scale, direction, flip);

        this.addHull(xOffset, yOffset, width, scale, direction);
    }

    /** The hull: a long, low, slightly rounded shape */
    private addHull(
        xOffset: number,
        yOffset: number,
        width: number,
        scale: number,
        direction: number
    ): void {
        const pointNum = width / 5;
        const pointArray = new Array<Point>(2 * pointNum);
        const lastIndex = 2 * pointNum - 1;
        const function1 = (x: number) =>
            Math.pow(Math.sin(x * Math.PI), 0.5) * 7 * scale;
        const function2 = (x: number) =>
            Math.pow(Math.sin(x * Math.PI), 0.5) * 10 * scale;

        for (let i = 0; i < pointNum; i++) {
            const offset = i * 5 * scale;
            const x = offset * direction + xOffset;
            const y = offset / width;

            // upper part of the boat
            pointArray[i] = new Point(x, function1(y) + yOffset);
            // lower part of the boat
            pointArray[lastIndex - i] = new Point(x, function2(y) + yOffset);
        }

        this.add(new Element(pointArray, 0, 0, FILL_COLOR));
        this.add(
            new Stroke(
                pointArray,
                STROKE_FILL_COLOR,
                STROKE_COLOR,
                STROKE_WIDTH,
                STROKE_NOISE,
                STROKE_STROKE_WIDTH,
                (x) => Math.sin(x * Math.PI * 2)
            )
        );
    }

    /** A sampan: an arched woven canopy amidships, a boatman sculling a long oar at the stern */
    private addAwning(
        along: (t: number) => number,
        y: number,
        scale: number,
        flip: boolean
    ): void {
        const height = 16 * scale;
        const arch: Point[] = [];
        for (let k = 0; k <= 10; k++) {
            const t = k / 10;
            arch.push(
                new Point(
                    along(0.38 + t * 0.34),
                    y + 4 * scale - height * Math.sin(Math.PI * t)
                )
            );
        }

        this.add(new Element(arch, 0, 0, "white", "none"));
        this.add(new Stroke(arch, INK, INK, 1.2 * scale + 0.4, 0.4));
        // The weave of the mat
        for (let k = 2; k < 9; k += 2) {
            const top = arch[k];
            this.add(
                new Stroke(
                    [top, new Point(top.x, y + 4 * scale)],
                    FAINT,
                    FAINT,
                    0.6,
                    0.3
                )
            );
        }

        // The boatman stands at the stern and sculls with a long oar trailing behind
        const stern = along(0.08);
        this.add(new Man(stern, y, !flip, 0.45 * scale, undefined, false, 1));
        this.add(
            new Stroke(
                [
                    new Point(stern, y - 14 * scale),
                    new Point(along(-0.22), y + 7 * scale),
                ],
                INK,
                INK,
                0.9,
                0.3
            )
        );
    }

    /** A small junk under a battened sail, a figure at the helm, a faint wake behind */
    private addSail(
        along: (t: number) => number,
        y: number,
        scale: number,
        direction: number,
        flip: boolean
    ): void {
        const mastX = along(0.55);
        const mastTop = y - 62 * scale;
        this.add(
            new Stroke(
                [new Point(mastX, y + 2 * scale), new Point(mastX, mastTop)],
                INK,
                INK,
                1.1,
                0.2
            )
        );

        // The sail hangs from the top of the mast, aft of it, its edge slightly bellied
        const back = -direction * 30 * scale;
        const sail = [
            new Point(mastX, mastTop + 3 * scale),
            new Point(mastX + back, mastTop + 8 * scale),
            new Point(mastX + back * 1.08, y - 22 * scale),
            new Point(mastX + back * 0.1, y - 12 * scale),
        ];
        this.add(new Element(sail, 0, 0, "white", "none"));
        this.add(new Stroke([...sail, sail[0]], INK, INK, 1, 0.3));
        // Battens across it
        for (let k = 1; k <= 3; k++) {
            const t = k / 4;
            const from = new Point(mastX, sail[0].y + (sail[3].y - sail[0].y) * t);
            const to = new Point(
                sail[1].x + (sail[2].x - sail[1].x) * t,
                sail[1].y + (sail[2].y - sail[1].y) * t
            );
            this.add(new Stroke([from, to], FAINT, FAINT, 0.7, 0.2));
        }

        this.add(new Man(along(0.12), y, !flip, 0.4 * scale, [0, 30, 20, 30, 10, 30, 30, 30, 30], false, 1));
        this.addWake(along, y, scale);
    }

    /** A boatman standing at the stern, pushing a long pole into the water; maybe a passenger */
    private addPunt(
        along: (t: number) => number,
        y: number,
        scale: number,
        direction: number,
        flip: boolean
    ): void {
        const stern = along(0.1);
        this.add(new Man(stern, y, !flip, 0.48 * scale, undefined, false, 1));
        this.add(
            new Stroke(
                [
                    new Point(stern + direction * 4 * scale, y - 22 * scale),
                    new Point(stern - direction * 18 * scale, y + 14 * scale),
                ],
                INK,
                INK,
                1,
                0.2
            )
        );

        if (PRNG.random() < 0.6) {
            // A seated passenger in a broad hat, taking in the view
            this.add(
                new Man(
                    along(0.55),
                    y,
                    flip,
                    0.42 * scale,
                    [0, 30, 20, 30, 10, 30, 30, 30, 30],
                    false,
                    2
                )
            );
        }
        this.addWake(along, y, scale);
    }

    /** A couple of faint ripples trailing behind the stern */
    private addWake(along: (t: number) => number, y: number, scale: number): void {
        for (let k = 0; k < 2; k++) {
            const from = along(-0.05 - k * 0.12);
            const to = along(-0.25 - k * 0.15);
            this.add(
                new Stroke(
                    [new Point(from, y + (8 + k * 3) * scale), new Point(to, y + (9 + k * 4) * scale)],
                    FAINT,
                    FAINT,
                    0.7,
                    0.3
                )
            );
        }
    }
}
