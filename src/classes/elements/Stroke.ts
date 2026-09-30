import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Element from "../Element";
import { config } from "../../config";

const DEFAULT_FILL_COLOR = config.element.stroke.defaultFillColor;
const DEFAULT_NOISE = config.element.stroke.defaultNoise;
const DEFAULT_STROKE_COLOR = config.element.stroke.defaultStrokeColor;
const DEFAULT_STROKE_WIDTH = config.element.stroke.defaultStrokeWidth;
const DEFAULT_WIDTH = config.element.stroke.defaultWidth;

/**
 * Class representing a stylized stroke using Perlin noise.
 */
export default class Stroke extends Element {
    /**
     * Constructs a Stroke instance.
     * @param {Point[]} pointArray - List of points defining the stroke.
     * @param {string} [fillColor=DEFAULT_FILL_COLOR] - Fill color for the stroke.
     * @param {string} [color=DEFAULT_STROKE_COLOR] - Stroke color.
     * @param {number} [width=DEFAULT_WIDTH] - Width of the stroke.
     * @param {number} [noise=DEFAULT_NOISE] - Amount of noise applied to the stroke.
     * @param {number} [strokeWidth=DEFAULT_STROKE_WIDTH] - Outer width of the stroke.
     * @param {(x: number) => number} [strokeWidthFunction=(x: number) => Math.sin(x * Math.PI)] - Function to modulate stroke width.
     */
    constructor(
        pointArray: Point[],
        fillColor: string = DEFAULT_FILL_COLOR,
        color: string = DEFAULT_STROKE_COLOR,
        width: number = DEFAULT_WIDTH,
        noise: number = DEFAULT_NOISE,
        strokeWidth: number = DEFAULT_STROKE_WIDTH,
        strokeWidthFunction: (x: number) => number = (x: number) =>
            Math.sin(x * Math.PI)
    ) {
        /**
         * For inital pointArray = [0,1,2,3] creates vtxArray = [0,(1),(2),3,(2),(1),0]
         * where bracketed values are modified by the main for loop
         **/
        const vtxArray = new Array<Point>(pointArray.length * 2 - 1);
        const lastVtxIndex = vtxArray.length - 1;
        const lastPointIndex = pointArray.length - 1;

        vtxArray[0] = pointArray[0];
        vtxArray[lastPointIndex] = pointArray[lastPointIndex];
        vtxArray[lastVtxIndex] = pointArray[0];

        // How a brush behaves along a stroke:
        // - pressure: the hand presses and eases off, a slow swell along the stroke
        // - grain: the hairs of the brush, a fine roughness of the edge
        // - entry: the brush lands a little heavier and tapers out
        // - lifts (飞白): on long strokes, a place or two where the brush almost leaves the paper
        const pressureSeed = PRNG.random(0, 10);
        const grainSeed = PRNG.random(0, 10);
        const lifts =
            pointArray.length > 40 && width >= 1.5
                ? Array.from({ length: Math.floor(PRNG.random(0, 2.99)) }, () =>
                      PRNG.random(0.2, 0.8)
                  )
                : [];

        for (let i = 1; i < lastPointIndex; i++) {
            const t = i / pointArray.length;
            const pressure = 0.65 + 0.7 * Perlin.noise(i * 0.06, pressureSeed);
            const grain = 1 - noise + noise * Perlin.noise(i * 0.5, grainSeed);
            const entry = 1.1 - 0.2 * t;

            let newWidth =
                width * strokeWidthFunction(t) * pressure * grain * entry;

            for (const lift of lifts) {
                newWidth *= 1 - 0.85 * Math.exp(-(((t - lift) / 0.025) ** 2));
            }

            const lastAngle = Math.atan2(
                pointArray[i].y - pointArray[i - 1].y,
                pointArray[i].x - pointArray[i - 1].x
            );
            const nextAngle = Math.atan2(
                pointArray[i].y - pointArray[i + 1].y,
                pointArray[i].x - pointArray[i + 1].x
            );
            let avgAngle = (lastAngle + nextAngle) / 2;

            if (avgAngle < nextAngle) {
                avgAngle += Math.PI;
            }

            vtxArray[i] = new Point(
                pointArray[i].x + newWidth * Math.cos(avgAngle),
                pointArray[i].y + newWidth * Math.sin(avgAngle)
            );

            vtxArray[lastVtxIndex - i] = new Point(
                pointArray[i].x - newWidth * Math.cos(avgAngle),
                pointArray[i].y - newWidth * Math.sin(avgAngle)
            );
        }

        super(vtxArray, 0, 0, fillColor, color, strokeWidth);
    }
}
