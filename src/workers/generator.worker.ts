import Designer from "../classes/Designer";
import Frame from "../classes/Frame";
import PRNG from "../classes/PRNG";
import Perlin from "../classes/Perlin";
import Range from "../classes/Range";
import { GeneratedFrame, GeneratorRequest } from "./messages";

/**
 * Designs frames and builds all of their layers off the main thread, so scrolling never has to
 * wait for it. This worker is the only place that draws random numbers: it keeps the PRNG and
 * Perlin state between frames, and frames are built in the order they were asked for, so the
 * same seed always produces the same picture.
 */
const worker = globalThis as unknown as Worker;

worker.onmessage = ({ data }: MessageEvent<GeneratorRequest>) => {
    if (data.type === "seed") {
        PRNG.seed = data.seed;
        Perlin.perlin = undefined;
        return;
    }

    const plan = new Designer(new Range(data.start, data.end)).plan;
    const frame = new Frame(data.id);

    for (const sketch of plan) {
        frame.sketchToLayer(sketch);
    }

    const result: GeneratedFrame = {
        id: data.id,
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
