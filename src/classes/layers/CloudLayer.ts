import Element from "../Element";
import Layer from "../Layer";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";

/**
 * A band of cloud lying across a massif at mid-height: a long soft body of silk-coloured mist
 * (url(#cloud), see inkDefs) with a billowing top, left unoutlined so that over open sky it
 * simply isn't there. The page lets it drift slowly.
 */
export default class CloudLayer extends Layer {
    /**
     * @param {number} xOffset - Left end of the band
     * @param {number} yOffset - Middle of the band
     * @param {number} width - Length of the band
     * @param {number} height - Thickness of the band
     */
    constructor(xOffset: number, yOffset: number, width: number, height: number) {
        super("clouds", xOffset, yOffset);

        const steps = 40;
        const seed = PRNG.random(0, 100);
        const top: Point[] = [];
        const bottom: Point[] = [];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = xOffset + t * width;
            // Thickest in the middle, tapering to wisps at the ends
            const body = Math.pow(Math.sin(Math.PI * t), 0.6);
            const billow = 0.6 + 0.8 * Perlin.noise(t * 6, seed);

            top.push(new Point(x, yOffset - (height / 2) * body * billow));
            bottom.push(new Point(x, yOffset + (height / 3) * body));
        }

        this.add(
            new Element(top.concat([...bottom].reverse()), 0, 0, "url(#cloud)", "none")
        );
    }
}
