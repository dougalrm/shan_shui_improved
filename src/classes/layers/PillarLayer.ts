import Layer from "../Layer";
import PRNG from "../PRNG";
import Pillar from "../structures/Pillar";
import { config } from "../../config";
import { footMist } from "../structures/Mist";
import { withInkStrength } from "../../utils/ink";

const HEIGHT_SCALE = config.layers.pillar.heightScale;
const WIDTH = config.layers.pillar.width;
const SPACING = config.layers.pillar.spacing;
const TOP_MARGIN = config.layers.pillar.topMargin;

/**
 * A cluster of sandstone columns like those of Zhangjiajie, standing where a classic mountain
 * would (same place, width and height in the plan). The columns stand in ranks: the ones at
 * the back are paler and rise out of a band of mist that hides their feet behind the front
 * ones, the way mist fills the gorges between the pillars.
 */
export default class PillarLayer extends Layer {
    /**
     * @param {number} xOffset - Centre of the cluster
     * @param {number} yOffset - Foot of the cluster
     * @param {number} width - Width of the cluster
     * @param {number} height - Height of the tallest columns (before scaling up)
     */
    constructor(
        xOffset: number,
        yOffset: number,
        width: number,
        height: number
    ) {
        super("middleMountain", xOffset, yOffset);

        const count = Math.max(
            2,
            Math.min(6, Math.round(width / PRNG.random(SPACING.min, SPACING.max)))
        );
        const columns = [];

        for (let i = 0; i < count; i++) {
            // 0 is the front rank, 1 the back
            const depth = PRNG.random(0, 1);
            const offset = PRNG.random(-0.5, 0.5);
            // Taller towards the middle of the cluster
            const centrality = 1 - Math.abs(offset) * 0.9;
            const base = yOffset - depth * 40;
            const tall =
                height * HEIGHT_SCALE * PRNG.random(0.35, 1) * (0.5 + 0.6 * centrality);
            // The ceiling varies too, so summits never line up along the top of the picture
            const ceiling = base - TOP_MARGIN - PRNG.random(0, 140);
            const columnHeight = Math.max(40, Math.min(ceiling, tall));
            const broad = PRNG.random() < 0.15 ? 1.6 : 1;
            const columnWidth =
                PRNG.random(WIDTH.min, WIDTH.max) *
                broad *
                (0.75 + 0.35 * (columnHeight / (height * HEIGHT_SCALE)));

            columns.push({
                x: xOffset + offset * width * 0.9,
                base,
                width: columnWidth,
                height: columnHeight,
                depth,
            });
        }

        // Back to front, with mist between the ranks
        columns.sort((a, b) => b.depth - a.depth);
        let mistDrawn = false;

        for (const column of columns) {
            if (!mistDrawn && column.depth < 0.5) {
                this.add(footMist(xOffset, yOffset - 40, width, height * 0.8));
                mistDrawn = true;
            }
            this.add(
                withInkStrength(
                    1 - column.depth * 0.45,
                    () =>
                        new Pillar(column.x, column.base, column.width, column.height)
                )
            );
        }

        this.add(footMist(xOffset, yOffset, width, height));
    }
}
