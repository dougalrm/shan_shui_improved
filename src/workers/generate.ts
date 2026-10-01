import Designer from "../classes/Designer";
import Frame from "../classes/Frame";
import PRNG from "../classes/PRNG";
import Perlin from "../classes/Perlin";
import Range from "../classes/Range";
import Scenes from "../classes/Scenes";
import SketchLayer from "../classes/SketchLayer";
import { GeneratedFrame } from "./messages";
import { config } from "../config";
import { PaintingOptions, setPaintingOptions } from "../utils/style";

const CHUNK_WIDTH = config.world.chunkWidth;

/**
 * Designs and builds chunks of the world. The generator worker runs this off the main
 * thread, and the checks in `scripts/` run it in Node.
 *
 * Every chunk is generated from its own seed (the picture's seed plus the chunk number), and
 * the noise table is built once from the picture's seed. So a chunk always comes out the same,
 * whatever else was generated before it: the same seed gives the same landscape on any screen.
 */
let pictureSeed: string | number = 0;

const chunkRange = (index: number) =>
    new Range(index * CHUNK_WIDTH, (index + 1) * CHUNK_WIDTH);

/** Seed the random numbers for one chunk */
const seedChunk = (index: number) => {
    PRNG.seed = `${pictureSeed}#${index}`;
};

/** Start a new picture */
export const startPicture = (seed: string | number, options: PaintingOptions): void => {
    pictureSeed = seed;
    setPaintingOptions(options);
    Scenes.start(seed);
    // Build the noise table now, from the picture's seed, so it doesn't depend on which
    // chunk happens to be generated first
    PRNG.seed = pictureSeed;
    Perlin.perlin = undefined;
    Perlin.noise(0);
};

/** Only the plan of a chunk: what goes where, without drawing it */
export const planChunk = (
    index: number,
    neighbours: SketchLayer[] = [],
    rightNeighbours: SketchLayer[] = []
): SketchLayer[] => {
    seedChunk(index);
    return new Designer(chunkRange(index), neighbours, rightNeighbours).plan;
};

/** Design and draw chunk number `index` of the current picture */
export const generateChunk = (index: number): GeneratedFrame => {
    // What the chunk to the left planned, so this one doesn't collide with things reaching
    // over the border. Recomputing it is cheap: it's only the plan, not the drawing.
    const neighbours = index > 0 ? planChunk(index - 1) : [];

    // And roughly what the chunk to the right plans, so an inscription here stays clear of
    // its mountains
    const rightNeighbours = planChunk(index + 1);

    // Drawing carries on with the random numbers where the design left off
    const plan = planChunk(index, neighbours, rightNeighbours);
    // The frame id feeds some layer seeds, keep it the chunk number (+1, as ids started at 1)
    const frame = new Frame(index + 1);

    for (const sketch of plan) {
        frame.sketchToLayer(sketch);
    }

    return {
        id: index,
        layers: frame.layers.map((layer) => ({
            tag: layer.tag,
            x: layer.x,
            y: layer.y,
            start: layer.range.start,
            end: layer.range.end,
            svg: layer.elements.map((element) => element.stringify + "\n").join(""),
        })),
    };
};

/** For the checks and tools in scripts/ */
export { Scenes };
