import { GeneratedFrame, GeneratorRequest } from "./messages";
import { generateChunk, startPicture } from "./generate";

/** Designs and builds chunks of the world off the main thread, so scrolling never waits */
const worker = globalThis as unknown as Worker;

worker.onmessage = ({ data }: MessageEvent<GeneratorRequest>) => {
    if (data.type === "seed") {
        startPicture(data.seed, data.options);
        return;
    }

    const result: GeneratedFrame = generateChunk(data.index);
    worker.postMessage(result);
};
