import Element from "../classes/Element";
import Point from "../classes/Point";
import Stroke from "../classes/elements/Stroke";
import { getSeason } from "./style";

/** Snow isn't drawn on shapes narrower than this: it wouldn't show */
const MIN_SPAN = 14;

/** Whether snow lies on the trees (the winter season) */
export const isSnowy = (): boolean => getSeason() === "winter";

/**
 * Snow lying on top of a shape, such as a leaf or a pad of needles: a lid of bare silk over its
 * upper edge, thickest in the middle and thinning to nothing at the ends, so the dark underside
 * still shows, the way ink painters leave snow unpainted. Shapes too small for it to show
 * get none, which keeps the drawing light.
 * @param {Point[]} points - The shape's outline
 * @param {number} [depth=0.5] - How far down the shape the snow reaches, 0-1 of its upper half
 * @returns {Element | undefined} the snow, or nothing if the shape is too small
 */
export const snowCap = (points: Point[], depth: number = 0.5): Element | undefined => {
    if (points.length < 4) return undefined;

    const middle = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    const upper = points.filter((p) => p.y <= middle).sort((a, b) => a.x - b.x);
    if (upper.length < 3) return undefined;

    const top = Math.min(...upper.map((p) => p.y));
    const left = upper[0].x;
    const span = upper[upper.length - 1].x - left || 1;
    if (span < MIN_SPAN) return undefined;

    const thickness = (middle - top) * depth * 2;

    const lid = upper.map((p) => new Point(p.x, p.y - 0.6));
    const underside = upper
        .map((p) => {
            const t = (p.x - left) / span;
            return new Point(p.x, p.y + thickness * Math.pow(Math.sin(t * Math.PI), 0.7));
        })
        .reverse();

    return new Element([...lid, ...underside], 0, 0, "white", "none");
};

/**
 * A ridge of snow along the top of a branch or twig
 * @param {Point[]} line - The branch, from one end to the other
 * @param {number} width - How thick the snow is
 * @returns {Stroke} the snow
 */
export const snowLine = (line: Point[], width: number): Stroke =>
    new Stroke(
        line.map((p) => new Point(p.x, p.y - width * 0.45)),
        "white",
        "white",
        width,
        0.3,
        1,
        (t) => Math.sin(t * Math.PI) * 0.8 + 0.2
    );
