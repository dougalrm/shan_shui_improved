import Designer from "../classes/Designer";
import Frame from "../classes/Frame";
import PRNG from "../classes/PRNG";
import Perlin from "../classes/Perlin";
import Range from "../classes/Range";
import SketchLayer from "../classes/SketchLayer";
import { GeneratedFrame, GeneratorRequest } from "./messages";
import { config } from "../config";

const CHUNK_WIDTH = config.world.chunkWidth;

/**
 * Designs chunks of the world and builds all of their layers off the main thread, so
 * scrolling never has to wait for it.
 *
 * Every chunk is generated from its own seed (the picture's seed plus the chunk number), and
 * the noise table is built once from the picture's seed. So a chunk always comes out the same,
 * whatever else was generated before it: the same seed gives the same landscape on any screen.
 */
const worker = globalThis as unknown as Worker;
let pictureSeed: string | number = 0;

const chunkRange = (index: number) =>
    new Range(index * CHUNK_WIDTH, (index + 1) * CHUNK_WIDTH);

/** Seed the random numbers for one chunk */
const seedChunk = (index: number) => {
    PRNG.seed = `${pictureSeed}#${index}`;
};

worker.onmessage = ({ data }: MessageEvent<GeneratorRequest>) => {
    if (data.type === "seed") {
        pictureSeed = data.seed;
        // Build the noise table now, from the picture's seed, so it doesn't depend on which
        // chunk happens to be generated first
        PRNG.seed = pictureSeed;
        Perlin.perlin = undefined;
        Perlin.noise(0);
        return;
    }

    const { index } = data;

    // What the chunk to the left planned, so this one doesn't collide with things reaching
    // over the border. Recomputing it is cheap: it's only the plan, not the drawing.
    let neighbours: SketchLayer[] = [];
    if (index > 0) {
        seedChunk(index - 1);
        neighbours = new Designer(chunkRange(index - 1)).plan;
    }

    seedChunk(index);
    const plan = new Designer(chunkRange(index), neighbours).plan;
    // The frame id feeds some layer seeds, keep it the chunk number (+1, as ids started at 1)
    const frame = new Frame(index + 1);

    for (const sketch of plan) {
        frame.sketchToLayer(sketch);
    }

    const result: GeneratedFrame = {
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

    worker.postMessage(result);
};
