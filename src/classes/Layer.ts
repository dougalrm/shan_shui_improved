import ILayer from "../interfaces/ILayer";
import Structure from "./Structure";
import workerBlobURL from "../utils/layerWorker";
import { LayerType } from "../types/LayerType";

/**
 * Represents a layer of terrain with SVG elements.
 */
export default class Layer extends Structure implements ILayer {
    /** Layers never change once created, so the rendered SVG is kept and reused */
    private rendered?: Promise<string>;

    /**
     * Initializes a new instance with specified coordinates and tag.
     *
     * @param {LayerType} [tag] - The tag for the layer.
     * @param {number} [x=0] - The x-coordinate.
     * @param {number} [y=0] - The y-coordinate.
     */
    constructor(
        public tag: LayerType,
        public x: number = 0,
        public y: number = 0
    ) {
        super();
    }

    /**
     * Renders the layer asynchronously using a web worker.
     *
     * @param {number} frameNum - The frame number.
     * @param {number} layerNum - The layer number.
     * @return {Promise<string>} A promise that resolves to the rendered layer as an SVG string.
     */
    public render(frameNum: number, layerNum: number): Promise<string> {
        if (!this.rendered) {
            this.rendered = this.renderInWorker(frameNum, layerNum);
            // Don't cache failures so the next render can retry
            this.rendered.catch(() => (this.rendered = undefined));
        }
        return this.rendered;
    }

    private renderInWorker(frameNum: number, layerNum: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const worker = new Worker(workerBlobURL);

            worker.onmessage = (e: MessageEvent) => {
                worker.terminate();
                resolve(e.data.stringify);
            };

            worker.onerror = (e) => {
                worker.terminate();
                reject(
                    new Error(
                        `Worker failed while rendering layer ${this.tag} from frame${frameNum} with error: ${e.message}`
                    )
                );
            };

            worker.postMessage({
                frameNum: frameNum,
                elements: this.elements,
                layerTag: this.tag,
                index: layerNum,
            });
        });
    }
}
