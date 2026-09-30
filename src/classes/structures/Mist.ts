import Element from "../Element";
import Point from "../Point";

/**
 * Mist over the foot of a mountain, so it rises out of it and stands apart from the ones in
 * front (which are drawn later, over this mist). The gradient (url(#mist), see inkDefs) is an
 * ellipse centred on the bottom edge, fading out towards the top and both sides; it reaches
 * about half way up the box, so the box is twice as tall as the mist.
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
    const top = y - height * 0.9;
    const bottom = y + 50;
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
