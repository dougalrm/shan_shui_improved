import Bound from "../Bound";
import Structure from "../Structure";
import PRNG from "../PRNG";
import Pavilion from "./Pavilion";
import Rock from "./Rock";
import Scenes from "../Scenes";
import Tree02 from "./Tree02";
import Tree04 from "./Tree04";
import Tree05 from "./Tree05";
import Tree06 from "./Tree06";
import Tree07 from "./Tree07";
import Tree08 from "./Tree08";
import { config } from "../../config";

const PAVILION_CHANCE = config.structure.bottomMountain.pavilionChance;

export default class BottomMountainDecoration extends Structure {
    /**
     * Constructs a flat decoration.
     *
     * @param {number} xOffset - The x offset.
     * @param {number} yOffset - The y offset.
     * @param {Bound} bounding - The bounding object.
     */
    constructor(xOffset: number, yOffset: number, bounding: Bound) {
        super();

        const treeType = PRNG.randomChoice([
            "Rock",
            "Rock",
            "Tree04",
            "Tree05",
            "Tree06",
            "Tree07",
        ]);

        // TODO: Why the order matters here?

        // Add some smaller rocks.
        for (let j = 0; j < PRNG.random(0, 5); j++) {
            this.add(
                new Rock(
                    xOffset +
                        PRNG.normalizedRandom(bounding.xMin, bounding.xMax),
                    yOffset +
                        (bounding.yMin + bounding.yMax) / 2 +
                        PRNG.normalizedRandom(-10, 10) +
                        10,
                    PRNG.random(0, 100),
                    PRNG.random(10, 30),
                    2,
                    PRNG.random(10, 30)
                )
            );
        }

        // Add some trees08.
        for (let j = 0; j < PRNG.randomChoice([0, 0, 1, 2]); j++) {
            const xr =
                xOffset + PRNG.normalizedRandom(bounding.xMin, bounding.xMax);
            const yr =
                yOffset +
                (bounding.yMin + bounding.yMax) / 2 +
                PRNG.normalizedRandom(-5, 5) +
                20;

            for (let k = 0; k < PRNG.random(2, 5); k++) {
                this.add(
                    new Tree08(
                        xr +
                            Math.min(
                                Math.max(
                                    PRNG.normalizedRandom(-30, 30),
                                    bounding.xMin
                                ),
                                bounding.xMax
                            ),
                        yr,
                        PRNG.random(60, 100)
                    )
                );
            }
        }

        if (treeType === "Rock") {
            for (let j = 0; j < PRNG.random(0, 3); j++) {
                this.add(
                    new Rock(
                        xOffset +
                            PRNG.normalizedRandom(bounding.xMin, bounding.xMax),
                        yOffset +
                            (bounding.yMin + bounding.yMax) / 2 +
                            PRNG.normalizedRandom(-5, 5) +
                            20,
                        PRNG.random(0, 100),
                        PRNG.random(40, 60),
                        5,
                        PRNG.random(50, 70)
                    )
                );
            }
        } else if (treeType === "Tree04") {
            for (let i = 0; i < PRNG.randomChoice([1, 1, 1, 1, 2, 2, 3]); i++) {
                const xr = PRNG.normalizedRandom(bounding.xMin, bounding.xMax);
                const yr = (bounding.yMin + bounding.yMax) / 2;
                this.add(new Tree04(xOffset + xr, yOffset + yr + 20));

                for (let j = 0; j < PRNG.random(0, 2); j++) {
                    this.add(
                        new Rock(
                            xOffset +
                                Math.max(
                                    bounding.xMin,
                                    Math.min(
                                        bounding.xMax,
                                        xr + PRNG.normalizedRandom(-50, 50)
                                    )
                                ),
                            yOffset + yr + PRNG.normalizedRandom(-5, 5) + 20,
                            PRNG.random(100 * i * j),
                            PRNG.random(40, 60),
                            5,
                            PRNG.random(50, 70)
                        )
                    );
                }
            }
        } else if (treeType === "Tree05") {
            const xMid = (bounding.xMin + bounding.xMax) / 2;
            const xMin = PRNG.random(bounding.xMin, xMid);
            const xMax = PRNG.random(xMid, bounding.xMax);

            for (let i = xMin; i < xMax; i += 30) {
                this.add(
                    new Tree05(
                        xOffset + i + 20 * PRNG.normalizedRandom(-1, 1),
                        yOffset + (bounding.yMin + bounding.yMax) / 2 + 20,
                        PRNG.random(100, 300)
                    )
                );
            }

            for (let j = 0; j < PRNG.random(0, 4); j++) {
                this.add(
                    new Rock(
                        xOffset +
                            PRNG.normalizedRandom(bounding.xMin, bounding.xMax),
                        yOffset +
                            (bounding.yMin + bounding.yMax) / 2 +
                            PRNG.normalizedRandom(-5, 5) +
                            20,
                        PRNG.random(0, 100),
                        PRNG.random(40, 60),
                        5,
                        PRNG.random(50, 70)
                    )
                );
            }
        } else if (treeType === "Tree06") {
            for (let i = 0; i < PRNG.randomChoice([1, 1, 1, 1, 2, 2, 3]); i++) {
                this.add(
                    new Tree06(
                        xOffset +
                            PRNG.normalizedRandom(bounding.xMin, bounding.xMax),
                        yOffset + (bounding.yMin + bounding.yMax) / 2,
                        PRNG.random(60, 120)
                    )
                );
            }
        } else if (treeType === "Tree07") {
            const xMid = (bounding.xMin + bounding.xMax) / 2;
            const xMin = PRNG.random(bounding.xMin, xMid);
            const xMax = PRNG.random(xMid, bounding.xMax);

            for (let i = xMin; i < xMax; i += 20) {
                this.add(
                    new Tree07(
                        xOffset + i + 20 * PRNG.normalizedRandom(-1, 1),
                        yOffset +
                            (bounding.yMin + bounding.yMax) / 2 +
                            PRNG.normalizedRandom(-1, 1) +
                            0,
                        PRNG.normalizedRandom(40, 80)
                    )
                );
            }
        }

        // Add some trees02
        for (let i = 0; i < PRNG.random(0, 50); i++) {
            this.add(
                new Tree02(
                    xOffset +
                        PRNG.normalizedRandom(bounding.xMin, bounding.xMax),
                    yOffset +
                        PRNG.normalizedRandom(bounding.yMin, bounding.yMax)
                )
            );
        }

        // Now and then a small thatched pavilion (茅亭) to sit in and take in the view, most
        // often looking out over level water. Sized for the figures in it, and only where the
        // flat top is wide enough to hold it, kept within it, so it never hangs off the edge
        // of the hill.
        const pavilionChance =
            PAVILION_CHANCE * Scenes.profile(xOffset + (bounding.xMin + bounding.xMax) / 2).pavilion;
        if (PRNG.random() < pavilionChance && treeType !== "Tree07") {
            const height = PRNG.normalizedRandom(44, 58);
            const width = PRNG.normalizedRandom(76, 100);
            const margin = width * 0.6;

            if (bounding.xMax - bounding.xMin > margin * 2) {
                this.add(
                    new Pavilion(
                        xOffset +
                            PRNG.normalizedRandom(
                                bounding.xMin + margin,
                                bounding.xMax - margin
                            ),
                        yOffset + (bounding.yMin + bounding.yMax) / 2 + 20,
                        PRNG.random(),
                        height,
                        width,
                        PRNG.random()
                    )
                );
            }
        }
    }
}
