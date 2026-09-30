import Element from "../Element";
import Point from "../Point";
import Range from "../Range";
import { toTone } from "../../utils/ink";

/**
 * A single written character, e.g. of a calligraphy inscription or a seal.
 */
export default class TextElement extends Element {
    /**
     * @param {string} text - The character(s) to write
     * @param {number} x - Centre x
     * @param {number} y - Centre y
     * @param {number} size - Font size
     * @param {string} color - Ink colour as a grey (see utils/ink.ts) or "white" for silk
     */
    constructor(
        text: string,
        x: number,
        y: number,
        size: number,
        color: string
    ) {
        super([new Point(x, y)]);

        const tone = toTone(color);
        const toneClass =
            tone.kind === "ink"
                ? `f${tone.step}`
                : tone.kind === "silk"
                ? "fp"
                : "";

        this.range = new Range(x - size, x + size);
        this.stringify = `<text x='${x.toFixed(1)}' y='${y.toFixed(1)}' font-size='${size.toFixed(1)}' text-anchor='middle' dominant-baseline='central' class='calligraphy ${toneClass}'>${text}</text>`;
    }
}
