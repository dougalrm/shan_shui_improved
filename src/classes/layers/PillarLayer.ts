import Designer from "../Designer";
import Element from "../Element";
import Layer from "../Layer";
import PRNG from "../PRNG";
import Pillar from "../structures/Pillar";
import Point from "../Point";
import Stroke from "../elements/Stroke";
import Tree02 from "../structures/Tree02";
import { config } from "../../config";
import { footMist } from "../structures/Mist";
import { withInkStrength } from "../../utils/ink";

const HEIGHT_SCALE = config.layers.pillar.heightScale;
const TOP_MARGIN = config.layers.pillar.topMargin;

/**
 * The stages a sandstone plateau erodes through, from the high ground to the valleys:
 * flat-topped mesas, long peak walls, clusters and forests of pillars, low remnant peaks.
 */
type Stage = "mesa" | "wall" | "forest" | "remnant";

interface Column {
    x: number;
    base: number;
    width: number;
    height: number;
    flatTop: boolean;
}

/** How each stage lays out its columns (sizes are before the rank's perspective scale) */
const STAGES: Record<
    Stage,
    {
        ranks: [number, number];
        /** Separate groups of columns along joint lines, with open gorges between */
        groups: [number, number];
        width: [number, number];
        gap: [number, number];
        /** How far a summit may sit from the common level (share of the height) */
        level: number;
        /** Share of the full height (remnant peaks are low) */
        tallness: [number, number];
        leaning: number;
    }
> = {
    mesa: { groups: [1, 1], ranks: [2, 2], width: [44, 86], gap: [-4, 14], level: 0.03, tallness: [0.9, 1], leaning: 0.08 },
    wall: { groups: [1, 2], ranks: [2, 3], width: [40, 82], gap: [-14, 6], level: 0.03, tallness: [0.85, 1], leaning: 0.1 },
    forest: { groups: [2, 3], ranks: [2, 3], width: [30, 92], gap: [6, 46], level: 0.08, tallness: [0.75, 1], leaning: 0.22 },
    remnant: { groups: [1, 2], ranks: [1, 2], width: [44, 90], gap: [40, 120], level: 0.15, tallness: [0.3, 0.55], leaning: 0.25 },
};

/**
 * A stretch of sandstone peak forest like Zhangjiajie, standing where a classic mountain would
 * (same place, width and height in the plan).
 *
 * Modelled on how the real landscape formed: the pillars were carved from one plateau, so
 * their summits sit near a common level, and the land erodes in stages from flat-topped mesas
 * and peak walls on the high ground to pillar forests and low remnant peaks in the valleys.
 * Here the stage follows the landscape's intensity. The columns stand in ranks along joint
 * lines with narrow gorges between them; ranks further back are smaller, sit higher, are paler
 * and rise out of forest and mist.
 */
export default class PillarLayer extends Layer {
    /**
     * @param {number} xOffset - Centre of the stretch
     * @param {number} yOffset - Foot of the front rank
     * @param {number} width - Width of the stretch
     * @param {number} height - Height of the columns (before scaling up)
     */
    constructor(
        xOffset: number,
        yOffset: number,
        width: number,
        height: number
    ) {
        super("middleMountain", xOffset, yOffset);

        const stage = PillarLayer.stageAt(xOffset);
        const rules = STAGES[stage];
        const ranks = Math.round(PRNG.random(rules.ranks[0], rules.ranks[1]));
        const fullHeight = height * HEIGHT_SCALE;

        // Back rank first, so nearer ones are drawn over it
        for (let rank = ranks - 1; rank >= 0; rank--) {
            const scale = 1 - 0.16 * rank;
            const base = yOffset - rank * 45;
            const columns = this.layOut(
                stage,
                xOffset,
                base,
                width * (1 - 0.08 * rank),
                Math.min(base - TOP_MARGIN, fullHeight * scale),
                scale
            );

            withInkStrength(1 - rank * 0.22, () => {
                for (const column of columns) {
                    this.add(
                        new Pillar(
                            column.x,
                            column.base,
                            column.width,
                            column.height,
                            column.flatTop,
                            rules.leaning
                        )
                    );
                }

                if (rank === 0 && stage !== "remnant") this.addNaturalArch(columns);
                this.addCanopy(columns, base, scale);
            });

            // Mist rising from the gorge in front of this rank
            this.add(footMist(xOffset, base, width, fullHeight * scale * 0.7));
        }
    }

    /**
     * The stage of erosion at x: the most built-up parts of the landscape are the high ground
     * (mesas, walls), quiet stretches the valleys (remnant peaks).
     */
    static stageAt(x: number): Stage {
        const intensity = Designer.intensity(x);
        const pick = PRNG.random();

        if (intensity > 0.75) return pick < 0.4 ? "mesa" : "wall";
        if (intensity > 0.45) return pick < 0.35 ? "wall" : "forest";
        if (intensity > 0.2) return "forest";
        return "remnant";
    }

    /**
     * Columns across one rank: a few separate groups standing along joint lines, side by side
     * within a group with narrow gorges between them, and open, misty space between groups.
     */
    private layOut(
        stage: Stage,
        centre: number,
        base: number,
        span: number,
        height: number,
        scale: number
    ): Column[] {
        const rules = STAGES[stage];
        const columns: Column[] = [];
        // The common summit level of this rank
        const level = height * PRNG.random(rules.tallness[0], rules.tallness[1]);
        const groups = Math.round(PRNG.random(rules.groups[0], rules.groups[1]));
        const slot = span / groups;

        for (let g = 0; g < groups; g++) {
            // Each group takes part of its slot, leaving gorges either side
            const groupSpan =
                slot * (stage === "mesa" ? PRNG.random(0.6, 0.8) : PRNG.random(0.3, 0.6));
            const groupLeft =
                centre - span / 2 + g * slot + PRNG.random(0, slot - groupSpan);
            const groupRight = groupLeft + groupSpan;
            // A mesa is one broad block with columns breaking away on either side
            const block =
                stage === "mesa"
                    ? {
                          from: groupLeft + groupSpan * 0.25,
                          to: groupRight - groupSpan * 0.25,
                      }
                    : undefined;
            let x = groupLeft;

            while (x < groupRight) {
                if (block && x >= block.from && x < block.to) {
                    const blockWidth = block.to - x;
                    columns.push({
                        x: x + blockWidth / 2,
                        base,
                        width: blockWidth,
                        height: level,
                        flatTop: true,
                    });
                    x = block.to + PRNG.random(4, 14) * scale;
                    continue;
                }

                const width = PRNG.random(rules.width[0], rules.width[1]) * scale;
                const summit = level * (1 - PRNG.random(0, rules.level));

                columns.push({
                    x: x + width / 2,
                    base,
                    width,
                    height: Math.max(30, summit),
                    flatTop: stage === "mesa" && PRNG.random() < 0.5,
                });
                x += width + PRNG.random(rules.gap[0], rules.gap[1]) * scale;
            }
        }

        return columns;
    }

    /**
     * A natural stone arch between two neighbouring columns near their tops, like Zhangjiajie's
     * "First Bridge Under Heaven". Rare.
     */
    private addNaturalArch(columns: Column[]): void {
        if (PRNG.random() > 0.12) return;

        const candidates = columns.filter((column, i) => {
            const next = columns[i + 1];
            if (!next) return false;
            const gap = next.x - next.width / 2 - (column.x + column.width / 2);
            return gap > 12 && gap < 70 && column.height > 150 && next.height > 150;
        });
        if (!candidates.length) return;

        const leftColumn = PRNG.randomChoice(candidates);
        const rightColumn = columns[columns.indexOf(leftColumn) + 1];
        const from = leftColumn.x + leftColumn.width * 0.35;
        const to = rightColumn.x - rightColumn.width * 0.35;
        const top =
            Math.max(
                leftColumn.base - leftColumn.height,
                rightColumn.base - rightColumn.height
            ) + PRNG.random(0.12, 0.25) * Math.min(leftColumn.height, rightColumn.height);
        const thickness = PRNG.random(10, 16);
        const steps = 12;
        const upper: Point[] = [];
        const lower: Point[] = [];

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = from + (to - from) * t;
            upper.push(new Point(x, top + PRNG.random(-1, 1)));
            // The underside arches up in the middle
            lower.push(
                new Point(x, top + thickness + 14 * (1 - Math.sin(Math.PI * t)))
            );
        }

        const edge = "rgba(90,90,90,0.55)";
        this.add(
            new Element(upper.concat([...lower].reverse()), 0, 0, "white", "none")
        );
        this.add(new Stroke(upper, edge, edge, 1.6, 0.6));
        this.add(new Stroke(lower, edge, edge, 2, 0.6));
        this.add(
            new Tree02(
                (from + to) / 2,
                top,
                "rgba(100,100,100,0.55)",
                1
            )
        );
    }

    /** Forest canopy along the feet of the columns, where they rise out of the trees */
    private addCanopy(columns: Column[], base: number, scale: number): void {
        const step = 16 * scale;

        for (const column of columns) {
            const from = column.x - column.width / 2 - 14 * scale;
            const to = column.x + column.width / 2 + 14 * scale;

            for (let x = from; x < to; x += step) {
                if (PRNG.random() < 0.15) continue;
                this.add(
                    new Tree02(
                        x + PRNG.random(-step / 2, step / 2),
                        base - PRNG.random(0, 18) * scale,
                        `rgba(100,100,100,${PRNG.random(0.35, 0.55).toFixed(2)})`,
                        2
                    )
                );
            }
        }
    }
}
