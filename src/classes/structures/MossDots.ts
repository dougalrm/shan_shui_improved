import Blob from "../elements/Blob";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import Structure from "../Structure";

/**
 * Moss dots (苔点): little clusters of dark ink dots along ridges and on rocks. In a Shan Shui
 * painting they are the darkest marks, giving the pale rock forms weight and life.
 */
export default class MossDots extends Structure {
    /**
     * @param {Point[]} ridge - The line to dot along, e.g. the outline of a mountain
     * @param {number} xOffset - X offset of the ridge points
     * @param {number} yOffset - Y offset of the ridge points
     * @param {number} seed - Seed for where the clusters go
     * @param {number} [density=0.35] - Roughly the share of ridge points that get a cluster (0-1)
     * @param {number} [scale=1] - Size of the dots
     */
    constructor(
        ridge: Point[],
        xOffset: number,
        yOffset: number,
        seed: number,
        density: number = 0.35,
        scale: number = 1
    ) {
        super();

        // Skip the very ends, where the ridge meets the ground
        for (let j = 2; j < ridge.length - 2; j++) {
            // Noise rather than pure chance, so the dots gather in patches like real moss
            if (Perlin.noise(j * 0.35, seed * 0.1, 7.3) > density + 0.25) continue;
            if (PRNG.random() > 0.5) continue;

            const { x, y } = ridge[j];
            const dots = Math.floor(PRNG.random(1, 3.99));

            for (let d = 0; d < dots; d++) {
                // Short flat dabs of the brush tip, not round beads
                this.add(
                    new Blob(
                        x + xOffset + PRNG.random(-10, 10) * scale,
                        y + yOffset + PRNG.random(0, 9) * scale,
                        PRNG.random(-0.25, 0.25),
                        `rgba(20,20,20,${PRNG.random(0.45, 0.8).toFixed(2)})`,
                        PRNG.random(4, 9) * scale,
                        PRNG.random(1.4, 2.6) * scale,
                        0.4
                    )
                );
            }
        }
    }
}
