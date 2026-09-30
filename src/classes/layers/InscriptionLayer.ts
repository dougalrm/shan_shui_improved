import Element from "../Element";
import Layer from "../Layer";
import PRNG from "../PRNG";
import Perlin from "../Perlin";
import Point from "../Point";
import TextElement from "../elements/TextElement";
import { config } from "../../config";

const POEMS = config.layers.inscription.poems;
const SEALS = config.layers.inscription.seals;
const WIDTH = config.layers.inscription.width;
const CHAR_SIZE = 24;
const CHAR_STEP = 27;
const COLUMN_STEP = 34;
const SIGNATURE_SIZE = 15;
const SEAL_SIZE = 30;

/**
 * A calligraphy inscription (题款) in the open sky: a classical poem written in vertical
 * columns from right to left, a smaller column naming the poet, and a red seal (印章) below it.
 */
export default class InscriptionLayer extends Layer {
    /**
     * @param {number} xOffset - Left edge of the space for the inscription
     * @param {number} yOffset - Top of it
     */
    constructor(xOffset: number, yOffset: number) {
        super("inscription", xOffset, yOffset);

        const poem = PRNG.randomChoice(POEMS);
        // One column per line of the poem, punctuation left out as it traditionally is
        const columns = poem.lines;
        const ink = `rgba(20,20,20,${PRNG.random(0.75, 0.9).toFixed(2)})`;
        let x = xOffset + WIDTH - COLUMN_STEP / 2;

        for (const column of columns) {
            Array.from(column).forEach((char, i) => {
                // A hand isn't a printer: every character sits a little differently
                this.add(
                    new TextElement(
                        char,
                        x + PRNG.random(-1, 1),
                        yOffset + CHAR_SIZE / 2 + i * CHAR_STEP + PRNG.random(-1, 1),
                        CHAR_SIZE + PRNG.random(-1.5, 1.5),
                        ink
                    )
                );
            });
            x -= COLUMN_STEP;
        }

        // The signature: who wrote the poem, smaller, starting a little lower
        const signature = Array.from(poem.poet);
        const signatureTop = yOffset + CHAR_STEP;
        signature.forEach((char, i) => {
            this.add(
                new TextElement(
                    char,
                    x + COLUMN_STEP / 4,
                    signatureTop + i * (SIGNATURE_SIZE + 3),
                    SIGNATURE_SIZE,
                    ink
                )
            );
        });

        const sealTop =
            signatureTop + signature.length * (SIGNATURE_SIZE + 3) + 6;
        this.addSeal(x + COLUMN_STEP / 4, sealTop, PRNG.randomChoice(SEALS));
    }

    /**
     * A square red seal with the characters carved out (白文), its edges worn by age.
     * Characters read top to bottom, right column first.
     */
    private addSeal(centreX: number, top: number, text: string): void {
        const half = SEAL_SIZE / 2;
        const edge: Point[] = [];
        const noiseSeed = PRNG.random(0, 100);

        // Walk round the square, letting the edge wander a little
        for (let i = 0; i < 40; i++) {
            const side = Math.floor(i / 10);
            const t = (i % 10) / 10;
            const along = -half + t * SEAL_SIZE;
            const wobble = (Perlin.noise(i * 0.4, noiseSeed) - 0.5) * 2.5;
            const [dx, dy] =
                side === 0
                    ? [along, -half]
                    : side === 1
                    ? [half, along]
                    : side === 2
                    ? [-along, half]
                    : [-half, -along];
            edge.push(
                new Point(centreX + dx + wobble, top + half + dy + wobble)
            );
        }
        this.add(new Element(edge, 0, 0, "var(--seal)", "none"));

        const chars = Array.from(text);
        const grid = chars.length === 4;
        const size = grid ? SEAL_SIZE * 0.4 : SEAL_SIZE * 0.42;

        chars.forEach((char, i) => {
            const column = grid ? (i < 2 ? 1 : -1) : 0;
            const row = grid ? i % 2 : i;
            const rows = grid ? 2 : chars.length;
            const y = top + (SEAL_SIZE / rows) * (row + 0.5);

            this.add(
                new TextElement(
                    char,
                    centreX + column * SEAL_SIZE * 0.22,
                    y,
                    size,
                    "white"
                )
            );
        });
    }
}
