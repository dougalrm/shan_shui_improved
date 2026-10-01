import Element from "../Element";
import Point from "../Point";

/**
 * Mist over the foot of a mountain, so it rises out of it and stands apart from the ones in
 * front (which are drawn later, over this mist). The gradient (url(#mist), see inkDefs) is a
 * soft ellipse filling the box, centred just above the foot and fading out on every side, so
 * it has no edge even against a washed sky (winter).
 * @param {number} x - Centre of the mountain's foot
 * @param {number} y - The foot
 * @param {number} width - Width of the mountain
 * @param {number} height - Height of the mountain
 * @returns {Element} the mist
 */
export const footMist = (
    x: number,
    y: number,
    width: number,
    height: number
): Element => {
    const top = y - height * 0.4;
    const bottom = y + height * 0.15 + 20;
    const half = width * 0.7;

    return new Element(
        [
            new Point(x - half, top),
            new Point(x + half, top),
            new Point(x + half, bottom),
            new Point(x - half, bottom),
        ],
        0,
        0,
        "url(#mist)",
        "none"
    );
};
