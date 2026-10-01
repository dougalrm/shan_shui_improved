import BackgroundMountainLayer from "./layers/BackgroundMountainLayer";
import BoatLayer from "./layers/BoatLayer";
import BottomMountainLayer from "./layers/BottomMountainLayer";
import Layer from "./Layer";
import MiddleMountainLayer from "./layers/MiddleMountainLayer";
import PRNG from "./PRNG";
import Range from "./Range";
import SketchLayer from "./SketchLayer";
import WaterLayer from "./layers/WaterLayer";
import PillarLayer from "./layers/PillarLayer";
import Designer from "./Designer";
import { getSeason, getWeather } from "../utils/style";
import InscriptionLayer from "./layers/InscriptionLayer";
import BirdsLayer from "./layers/BirdsLayer";
import BridgeLayer from "./layers/BridgeLayer";
import CloudLayer from "./layers/CloudLayer";
import BankLayer from "./layers/BankLayer";
import FarShoreLayer from "./layers/FarShoreLayer";
import FramingLayer from "./layers/FramingLayer";
import SandbarLayer from "./layers/SandbarLayer";
import { withInkStrength } from "../utils/ink";

/**
 * Atmospheric perspective: things further away (higher up the picture) get paler.
 * Mountains stand between y = 400 (far) and about 880 (near).
 * @param {number} y - Where the layer stands
 * @returns {number} Ink strength for it, see withInkStrength
 */
const depthStrength = (y: number) =>
    0.5 + 0.5 * Math.min(1, Math.max(0, (y - 400) / 400));


/**
 * Class representing a frame used for generating and managing layer of terrain.
 */
export default class Frame {
    /** keeping the active layers within the frame
     *  When passing custom classes or instances to web workers, they are serialized
     *  into plain objects due to the fact that web workers can only communicate using JSON-compatible data types
     */
    layers: Layer[] = [];

    /**
     * @param {number} id - Unique identifier of the frame
     * This field makes sure that the new layer won't exceed the original frame's range
     */
    constructor(public id: number) {}

    /**
     * Create active layers based on the given plan and adds it to Frame.layers
     * @param {SketchLayer} - plan created by the designer
     */
    public sketchToLayer(sketch: SketchLayer): void {
        // Snow and rain soften everything a little: winter textures read as snow-covered,
        // rain veils the scene
        const strength =
            (getSeason() === "winter" ? 0.85 : 1) *
            (getWeather() === "rain" ? 0.8 : 1);

        withInkStrength(strength, () => this.buildLayer(sketch));
    }

    private buildLayer({ tag, x, y, width, height }: SketchLayer): void {
        let layer = undefined;
        let seed: number;

        if (tag === "middleMountain") {
            seed = PRNG.random(0, 2 * this.id);
            layer = withInkStrength(depthStrength(y), () =>
                Designer.isPillarCountry(x)
                    ? new PillarLayer(x, y, width, height)
                    : new MiddleMountainLayer(x, y, seed, width, height)
            );
        }
        if (tag === "water") {
            layer = withInkStrength(
                depthStrength(y),
                () => new WaterLayer(x, y, width, height)
            );
        }
        if (tag === "bottomMountain") {
            seed = PRNG.random(0, 2 * Math.PI);
            layer = new BottomMountainLayer(x, y, seed, width, height);
        }
        if (tag === "backgroundMountain") {
            seed = PRNG.random(0, 100);
            layer = new BackgroundMountainLayer(
                x,
                y,
                seed,
                width,
                height,
                Designer.isPillarCountry(x + width / 2)
            );
        }
        if (tag === "inscription") {
            layer = new InscriptionLayer(x, y);
        }
        if (tag === "birds") {
            layer = new BirdsLayer(x, y);
        }
        if (tag === "bridge") {
            layer = new BridgeLayer(x, y, width);
        }
        if (tag === "clouds") {
            layer = new CloudLayer(x, y, width, height);
        }
        if (tag === "bank") {
            layer = new BankLayer(x, width);
        }
        if (tag === "farShore") {
            layer = new FarShoreLayer(x, width);
        }
        if (tag === "framing") {
            layer = new FramingLayer(x);
        }
        if (tag === "sandbar") {
            layer = new SandbarLayer(x, y, width);
        }
        if (tag === "boat") {
            const flip = PRNG.randomChoice([true, false]);
            layer = new BoatLayer(x, y, width, y / 800, flip);
        }
        // make sure that the new elements won't exceed the original frame's range
        layer && this.layers.push(layer);
    }

    /**
     * Return the current frame range
     * @returns {Range}
     */
    get range(): Range {
        let xMax = -Infinity;
        let xMin = +Infinity;

        for (let i = 0; i < this.layers.length; i++) {
            const layerStart = this.layers[i].range.start;
            const layerEnd = this.layers[i].range.end;

            if (xMin > layerStart) xMin = layerStart;
            if (xMax < layerEnd) xMax = layerEnd;
        }

        return new Range(xMin, xMax);
    }
}
