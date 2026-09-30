import Layer from "../Layer";
import Perlin from "../Perlin";
import Point from "../Point";
import Element from "../Element";
import { config } from "../../config";
import { midPoint, triangulate } from "../../utils/polytools";

const DEFAULT_SEED = config.layers.backgroundMountain.defaultSeed;
const SEGMENTS = config.layers.backgroundMountain.segments;
const SPAN = config.layers.backgroundMountain.span;
const STROKE_COLOR = config.layers.backgroundMountain.color;
const STROKE_WIDTH = config.layers.backgroundMountain.strokeWidth;

/**
 * Represents a distant mountain chunk with varying heights and colors.
 *
 * @extends Layer
 */
export default class BackgroundMountainLayer extends Layer {
    /**
     * Constructor for generating a distant mountain chunk with varying heights and colors.
     * @param {number} xOffset - The x-axis offset.
     * @param {number} yOffset - The y-axis offset.
     * @param {number} [seed=DEFAULT_SEED] - The seed for the noise function that effects the y-coordinates of the noise.
     * @param {number} [width] - The width of the mountain.
     * @param {number} [height] - The overall height of the mountain.
     */
    constructor(
        xOffset: number,
        yOffset: number,
        seed: number = DEFAULT_SEED,
        width: number,
        height: number,
        columnar: boolean = false
    ) {
        super("backgroundMountain", xOffset, yOffset);

        // Distant pillars: the skyline steps between flat-topped columns instead of rolling.
        // The noise mostly sits between 0.3 and 0.7, so stretch it for clear steps.
        const COLUMN_WIDTH = 45;
        const columnHeight = (column: number, seed: number) => {
            const n = (Perlin.noise(column * 1.7, seed) - 0.3) / 0.4;
            return 0.2 + 0.8 * Math.min(1, Math.max(0, n));
        };
        const profile = (k: number, seed: number) =>
            columnar
                ? columnHeight(Math.floor((k * SPAN) / COLUMN_WIDTH), seed)
                : Perlin.noise(k * 0.05, seed);

        const pointArray: Point[][] = [];

        const generatePoints = (
            i: number,
            j: number,
            heightMultiplier: number,
            powerExponent: number,
            seed: number
        ) => {
            const k = i * SEGMENTS + j;
            // Only the skyline (the part going up) follows the profile
            const noise =
                heightMultiplier < 0 ? profile(k, seed) : Perlin.noise(k * 0.05, seed);
            return new Point(
                xOffset + k * SPAN,
                yOffset +
                    heightMultiplier *
                        noise *
                        Math.pow(
                            Math.sin((Math.PI * k) / (width / SPAN)),
                            powerExponent
                        )
            );
        };

        for (let i = 0; i < width / SPAN / SEGMENTS; i++) {
            pointArray.push([]);

            for (let j = 0; j < SEGMENTS + 1; j++) {
                pointArray[pointArray.length - 1].push(
                    generatePoints(i, j, -height, 0.5, seed)
                );
            }

            for (let j = 0; j < SEGMENTS / 2 + 1; j++) {
                pointArray[pointArray.length - 1].unshift(
                    generatePoints(i, j * 2, 24, 1, 2)
                );
            }
        }

        const getColor = function (point: Point) {
            const color =
                Perlin.noise(point.x * 0.02, point.y * 0.02, yOffset) * 55 +
                200;
            return `rgb(${color},${color},${color})`;
        };

        for (const pointGroup of pointArray) {
            const lastPoint = pointGroup[pointGroup.length - 1];

            // Adding polyline for the last point in each group
            this.add(
                new Element(
                    pointGroup,
                    0,
                    0,
                    getColor(lastPoint),
                    STROKE_COLOR,
                    STROKE_WIDTH
                )
            );

            // Triangulate the current point group
            const triangles = triangulate(pointGroup, 100, true, false);

            // Adding polylines for each triangle in the triangulation
            for (const triangle of triangles) {
                const midPointOfTriangle = midPoint(triangle);
                const color = getColor(midPointOfTriangle);
                this.add(
                    new Element(triangle, 0, 0, color, color, STROKE_WIDTH)
                );
            }
        }
    }
}
