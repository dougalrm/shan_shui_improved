import PRNG from "./PRNG";
import Perlin from "./Perlin";
import Range from "./Range";
import SketchLayer from "./SketchLayer";
import { LayerType } from "../types/LayerType";
import { config } from "../config";
import { getMountainStyle, getWeather } from "../utils/style";

const BACKGROUND_MOUNTAIN_INTERVAL =
    config.designer.backgroundMountain.interval;
const BACKGROUND_MOUNTAIN_HEIGHT = config.designer.backgroundMountain.height;
const BACKGROUND_MOUNTAIN_WIDTH = config.designer.backgroundMountain.width;
const BACKGROUND_MOUNTAIN_YLOCATION_MIN =
    config.designer.backgroundMountain.yLocation.min;
const BACKGROUND_MOUNTAIN_YLOCATION_MAX =
    config.designer.backgroundMountain.yLocation.max;
const BOAT_PROBABILITY = config.designer.boat.probability;
const BOATS_PER_CHUNK = config.designer.boat.perChunk;
const BOAT_WIDTH = config.designer.boat.width;
const BOAT_Y_MAX = config.designer.boat.y.max;
const BOAT_Y_MIN = config.designer.boat.y.min;
const BOTTOM_MOUNTAIN_HEIGHT_MAX = config.designer.bottomMountain.height.max;
const BOTTOM_MOUNTAIN_HEIGHT_MIN = config.designer.bottomMountain.height.min;
const BOTTOM_MOUNTAIN_PROBABILITY = config.designer.bottomMountain.probability;
const BOTTOM_MOUNTAIN_WIDTH_MAX = config.designer.bottomMountain.width.max;
const BOTTOM_MOUNTAIN_WIDTH_MIN = config.designer.bottomMountain.width.min;
const BOTTOM_MOUNTAIN_XOFFSET_MIN = config.designer.bottomMountain.xOffset.min;
const BOTTOM_MOUNTAIN_XOFFSET_MAX = config.designer.bottomMountain.xOffset.max;
const MIDDLE_MOUNTAIN_PROBABILITY = config.designer.middleMountain.probability;
const MIDDLE_MOUNTAIN_HEIGHT_MAX = config.designer.middleMountain.height.max;
const MIDDLE_MOUNTAIN_HEIGHT_MIN = config.designer.middleMountain.height.min;
const MIDDLE_MOUNTAIN_WIDTH_MAX = config.designer.middleMountain.width.max;
const MIDDLE_MOUNTAIN_WIDTH_MIN = config.designer.middleMountain.width.min;
const MIDDLE_MOUNTAIN_XOFFSET_MIN = config.designer.middleMountain.xOffset.min;
const MIDDLE_MOUNTAIN_XOFFSET_MAX = config.designer.middleMountain.xOffset.max;
const MIDDLE_MOUNTAIN_YOFFSET = config.designer.middleMountain.yOffset;
const RADIUS = config.designer.radius;
const WATER_HEIGHT = config.designer.water.height;
const WATER_WIDTH = config.designer.water.width;
const X_STEP = config.designer.xStep;
const INTENSITY_FREQUENCY = config.designer.intensity.frequency;
const HOST_PEAK_INTENSITY = config.designer.hostPeak.intensity;
const HOST_PEAK_WIDTH_MIN = config.designer.hostPeak.width.min;
const HOST_PEAK_WIDTH_MAX = config.designer.hostPeak.width.max;
const HOST_PEAK_HEIGHT_MIN = config.designer.hostPeak.height.min;
const HOST_PEAK_HEIGHT_MAX = config.designer.hostPeak.height.max;
const HOST_PEAK_BASE_MIN = config.designer.hostPeak.base.min;
const HOST_PEAK_BASE_MAX = config.designer.hostPeak.base.max;
const HOST_PEAK_SPACING = config.designer.hostPeak.spacing;
const INSCRIPTION_THRESHOLD = config.designer.inscription.threshold;
const INSCRIPTION_Y = config.designer.inscription.y;
const CHUNK_WIDTH = config.world.chunkWidth;
const BLEND_THRESHOLD = config.layers.pillar.blendThreshold;
const BRIDGE_GAP_MIN = config.designer.bridge.gap.min;
const BRIDGE_GAP_MAX = config.designer.bridge.gap.max;
const BRIDGE_MAX_DROP = config.designer.bridge.maxDrop;
const BRIDGE_CHANCE = config.designer.bridge.chance;
const CLOUD_CHANCE = config.designer.clouds.chance;
const CLOUD_INTENSITY = config.designer.clouds.intensity;
const CLOUD_PER_CHUNK = config.designer.clouds.perChunk;
const CLOUD_Y_MIN = config.designer.clouds.y.min;
const CLOUD_Y_MAX = config.designer.clouds.y.max;
const CLOUD_WIDTH_MIN = config.designer.clouds.width.min;
const CLOUD_WIDTH_MAX = config.designer.clouds.width.max;
const CLOUD_HEIGHT_MIN = config.designer.clouds.height.min;
const CLOUD_HEIGHT_MAX = config.designer.clouds.height.max;
const BIRDS_CHANCE = config.designer.birds.chance;
const BIRDS_Y_MIN = config.designer.birds.y.min;
const BIRDS_Y_MAX = config.designer.birds.y.max;
const BIRDS_WIDTH = config.layers.birds.width;
const BIRDS_HEIGHT = config.layers.birds.height;
const INSCRIPTION_MARGIN = config.designer.inscription.margin;
const INSCRIPTION_WIDTH = config.layers.inscription.width;
const INSCRIPTION_HEIGHT = config.layers.inscription.height;

/**
 * Class for designing new frame. The main reason for this class is to generate new terrain
 * with certainty that the new frames will not collide with each other in ugly manner.
 */
export default class Designer {
    plan: SketchLayer[] = [];
    /**
     * Generates terrain design.
     * @param {Range} range - range for which to generate design.
     * @param {SketchLayer[]} [neighbours=[]] - What the chunk next door planned. Nothing here
     * may collide with it, but it isn't part of this plan.
     * @param {SketchLayer[]} [rightNeighbours=[]] - What the chunk to the right roughly plans,
     * only used to keep inscriptions clear of mountains reaching over the border.
     */
    constructor(
        public range: Range,
        private neighbours: SketchLayer[] = [],
        private rightNeighbours: SketchLayer[] = []
    ) {
        this.generateDesign(range);
    }

    /**
     * How built up the landscape is at x, from 0 (open water, a few distant hills) to 1 (a
     * massif crowned by a host peak). It changes slowly over thousands of units, giving the
     * scroll its rhythm of quiet stretches and gatherings, like a painted handscroll.
     * It only depends on x (and the picture's noise), so it is continuous across chunks.
     * @param {number} x - Position in the world
     * @returns {number} Intensity between 0 and 1
     */
    static intensity(x: number): number {
        const noise = Perlin.noise(Math.max(0, x) * INTENSITY_FREQUENCY, 11.3);
        // The noise mostly sits between 0.25 and 0.65: spread that over 0-1, so quiet
        // stretches are the exception and the busiest parts reach the host peak threshold
        const value = (noise - 0.25) / 0.35;
        return Math.min(1, Math.max(0, value));
    }

    /**
     * Whether mountains at x are drawn as Zhangjiajie-like pillars, depending on the style
     * (?style=, see utils/style.ts). In the blend style a slow noise decides, so pillars come in
     * stretches of country rather than one here and there.
     * @param {number} x - Position in the world
     * @returns {boolean} true for pillars, false for classic mountains
     */
    static isPillarCountry(x: number): boolean {
        const style = getMountainStyle();
        if (style !== "blend") return style === "pillars";
        return Perlin.noise(Math.max(0, x) * 0.0006, 57.1) > BLEND_THRESHOLD;
    }

    /**
     * Whether chunk `index` gets an inscription. Decided from the picture's noise alone, not
     * from what neighbouring chunks planned, so it is consistent everywhere: only chunks where
     * the noise peaks over the two chunks either side qualify, which keeps inscriptions at
     * least three chunks apart.
     * @param {number} index - The chunk number
     * @returns {boolean} whether to look for room for an inscription
     */
    static wantsInscription(index: number): boolean {
        const value = (i: number) => Perlin.noise(i * 0.9 + 0.5, 91.7);
        const here = value(index);

        if (here < INSCRIPTION_THRESHOLD) return false;
        for (let d = 1; d <= 2; d++) {
            if (value(index - d) >= here || value(index + d) > here) return false;
        }
        return true;
    }

    /**
     * Whether there is open sky for an inscription or a flock of birds: no mountain behind it
     * (taking their real shape: they rise up from their base) and no inscription. The pale
     * distant mountains may show through, as they often do behind inscriptions on real paintings.
     * @param {SketchLayer} area - Where it would go
     * @returns {boolean} true if it can go there
     */
    private isSkyClear(area: SketchLayer): boolean {
        const left = area.x - INSCRIPTION_MARGIN;
        const right = area.x + area.width + INSCRIPTION_MARGIN;
        const bottom = area.y + area.height + INSCRIPTION_MARGIN;
        const all = [...this.neighbours, ...this.plan, ...this.rightNeighbours];

        return all.every((layer) => {
            // Keep clear of inscriptions too
            if (layer.tag === "inscription" && layer !== area) {
                return (
                    layer.x + layer.width < left ||
                    layer.x > right ||
                    layer.y > bottom ||
                    layer.y + layer.height < area.y - INSCRIPTION_MARGIN
                );
            }
            if (
                layer.tag !== "middleMountain" &&
                layer.tag !== "bottomMountain"
            ) {
                return true;
            }

            // Mountains are drawn centred on x
            const layerLeft = layer.x - layer.width / 2;
            const layerRight = layer.x + layer.width / 2;
            const layerTop = layer.y - layer.height;

            return layerRight < left || layerLeft > right || layerTop > bottom;
        });
    }

    /**
     * Whether a boat is out on open water: not in front of any mountain or hill, taking their
     * real shape (they rise up from their base, which the plan's boxes don't describe), here or
     * in the chunks either side. Otherwise the mountain, drawn later, hides part of the boat
     * and the rest looks stranded on the slope.
     * @param {SketchLayer} boat - Where the boat would go
     * @returns {boolean} true if it is on open water
     */
    private isOnOpenWater(boat: SketchLayer): boolean {
        const margin = 15;
        const all = [...this.neighbours, ...this.plan, ...this.rightNeighbours];

        return all.every((layer) => {
            if (layer.tag !== "middleMountain" && layer.tag !== "bottomMountain") {
                return true;
            }
            const overlapsX =
                boat.x + boat.width > layer.x - layer.width / 2 - margin &&
                boat.x < layer.x + layer.width / 2 + margin;
            const overlapsY =
                boat.y > layer.y - layer.height - margin && boat.y < layer.y + 30;
            return !(overlapsX && overlapsY);
        });
    }

    /**
     * Checks if a new layer can fit within the existing plan without colliding with other layers.
     *
     * @param {SketchLayer} newLayer - The new layer to check.
     * @param {number} [xCollisionRadius=RADIUS] - The x-axis collision radius. If positive then extend the original bounds on x-axis. If negative, overlapping is accepted.
     * @param {number} [yCollisionRadius=RADIUS] - The y-axis collision radius. If positive then extend the original bounds on y-axis. If negative, overlapping is accepted.
     * @param {Array<LayerType>} [tagArray=[]] - An array of tags to check for collision. If empty, only local layers are checked.
     * @return {boolean} Returns true if the new layer can fit without colliding, false otherwise.
     */
    private canFit(
        newLayer: SketchLayer,
        xCollisionRadius: number = RADIUS,
        yCollisionRadius: number = RADIUS,
        tagArray: Array<LayerType> = []
    ): boolean {
        const isNotColliding = [...this.neighbours, ...this.plan].every((layer) => {
            const isLocal = tagArray.length === 0 && layer.tag === newLayer.tag;
            const isTagged = tagArray.includes(layer.tag);

            if (
                (isLocal || isTagged) &&
                layer.isColliding(newLayer, xCollisionRadius, yCollisionRadius)
            ) {
                return false;
            }
            return true;
        });

        // TODO: Make is better, as for some reasons the frame are dropping when moving forward
        const isWithinDesignerRange = true; //newLayer.x + newLayer.width < this.range.end;

        return isNotColliding && isWithinDesignerRange;
    }

    /**
     * Generate new design within given range. Order here matter as the elements check for collision with each other.
     * @private
     */
    private generateDesign(range: Range): void {
        const yRange = (x: number) => Perlin.noise(x * 0.01, Math.PI);
        const middleMountainPositions: Array<{ x: number; y: number }> = [];
        const intensity = Designer.intensity;

        // Generate BackgroundMountains
        for (let x = range.start; x < range.end; x += X_STEP) {
            if (
                Math.abs(x) % BACKGROUND_MOUNTAIN_INTERVAL <
                Math.max(1, X_STEP - 1)
            ) {
                const y = PRNG.random(
                    BACKGROUND_MOUNTAIN_YLOCATION_MIN,
                    BACKGROUND_MOUNTAIN_YLOCATION_MAX
                );
                // TODO: This for some reason cannot be just PRNG.random().
                // BackgroundMountain triangulation probably causing some issue
                // It's using span = 10 and segments = 5, and then dividing width by it.
                // So probably the width need to be divideable by 50.
                const width = PRNG.randomChoice([
                    BACKGROUND_MOUNTAIN_WIDTH[0],
                    BACKGROUND_MOUNTAIN_WIDTH[1],
                    BACKGROUND_MOUNTAIN_WIDTH[2],
                ]);
                const backgroundMountain = new SketchLayer(
                    "backgroundMountain",
                    x,
                    y,
                    width,
                    BACKGROUND_MOUNTAIN_HEIGHT
                );

                if (this.canFit(backgroundMountain)) {
                    this.plan.push(backgroundMountain);
                }
            }
        }

        // The host peak (主峰): where the landscape is at its most intense, one mountain
        // towers over the others. It goes in first so the guest peaks arrange around it.
        for (let x = range.start; x < range.end; x += X_STEP) {
            const here = intensity(x);
            const isSummit =
                here > HOST_PEAK_INTENSITY &&
                here >= intensity(x - 150) &&
                here >= intensity(x + 150);

            if (!isSummit) continue;

            const width = PRNG.random(HOST_PEAK_WIDTH_MIN, HOST_PEAK_WIDTH_MAX);
            const height = PRNG.random(HOST_PEAK_HEIGHT_MIN, HOST_PEAK_HEIGHT_MAX);
            const y = PRNG.random(HOST_PEAK_BASE_MIN, HOST_PEAK_BASE_MAX);
            const hostPeak = new SketchLayer(
                "middleMountain",
                x - width / 4,
                y,
                width,
                height
            );

            // One per massif: keep host peaks (the only mountains this tall) well apart
            const nearAnotherHost = [...this.neighbours, ...this.plan].some(
                (layer) =>
                    layer.tag === "middleMountain" &&
                    layer.height >= HOST_PEAK_HEIGHT_MIN &&
                    Math.abs(layer.x - hostPeak.x) < HOST_PEAK_SPACING
            );

            if (!nearAnotherHost) {
                this.plan.push(hostPeak);
                middleMountainPositions.push({ x: hostPeak.x, y });
            }
        }

        // Generate MiddleMountains: many where the landscape is intense, few in quiet stretches
        for (let x = range.start; x < range.end; x += X_STEP) {
            const here = intensity(x);
            // Pillar country is airier: each spot is a whole stretch of columns in ranks,
            // so fewer spots, stacked at most two deep, with mist-filled gorges between
            const pillars = Designer.isPillarCountry(x);
            const chance =
                MIDDLE_MOUNTAIN_PROBABILITY *
                (0.15 + 2.2 * Math.pow(here, 1.5)) *
                (pillars ? 0.75 : 1);
            let stacked = 0;

            if (PRNG.random() < chance) {
                // Pillar stretches step further between depths, so their ranks spread from
                // the distance into the foreground rather than bunching at the back
                for (let y = 0; y < yRange(x) * 480; y += pillars ? 130 : 30) {
                    if (pillars && stacked >= 3) break;
                    const width = PRNG.random(
                        MIDDLE_MOUNTAIN_WIDTH_MIN,
                        MIDDLE_MOUNTAIN_WIDTH_MAX
                    );
                    // Taller where the landscape is building up
                    const height = PRNG.random(
                        MIDDLE_MOUNTAIN_HEIGHT_MIN,
                        MIDDLE_MOUNTAIN_HEIGHT_MIN +
                            (MIDDLE_MOUNTAIN_HEIGHT_MAX -
                                MIDDLE_MOUNTAIN_HEIGHT_MIN) *
                                (0.35 + 0.65 * here)
                    );

                    const xOffset =
                        x +
                        PRNG.random(
                            MIDDLE_MOUNTAIN_XOFFSET_MIN,
                            MIDDLE_MOUNTAIN_XOFFSET_MAX
                        );

                    const yOffset = y + MIDDLE_MOUNTAIN_YOFFSET;

                    const middleMountain = new SketchLayer(
                        "middleMountain",
                        xOffset,
                        yOffset,
                        width,
                        height
                    );

                    if (
                        this.canFit(
                            middleMountain,
                            10,
                            -MIDDLE_MOUNTAIN_HEIGHT_MAX
                        )
                    ) {
                        this.plan.push(middleMountain);
                        stacked++;
                        // keep track of the x positions of the visible middle mountains for water creation
                        middleMountainPositions.push({
                            x: xOffset,
                            y: yOffset,
                        });
                    }
                }
            }
        }

        // Generate BottomMountains
        for (let x = range.start; x < range.end; x += X_STEP) {
            const chance =
                BOTTOM_MOUNTAIN_PROBABILITY * (0.35 + 1.1 * intensity(x));

            if (PRNG.random() < chance) {
                for (let j = 0; j < PRNG.random(0, 4); j++) {
                    const xOffset = PRNG.random(
                        BOTTOM_MOUNTAIN_XOFFSET_MIN,
                        BOTTOM_MOUNTAIN_XOFFSET_MAX
                    );
                    const y = 850 - j * 50;
                    const width = PRNG.random(
                        BOTTOM_MOUNTAIN_WIDTH_MIN,
                        BOTTOM_MOUNTAIN_WIDTH_MAX
                    );
                    const height = PRNG.random(
                        BOTTOM_MOUNTAIN_HEIGHT_MIN,
                        BOTTOM_MOUNTAIN_HEIGHT_MAX
                    );
                    const bottomMountain = new SketchLayer(
                        "bottomMountain",
                        x + xOffset,
                        y,
                        width,
                        height
                    );

                    if (this.canFit(bottomMountain, 10, -100)) {
                        this.plan.push(bottomMountain);
                    }
                }
            }
        }

        // Bridges between neighbouring foreground hills of about the same height
        const hills = this.plan
            .filter((layer) => layer.tag === "bottomMountain")
            .sort((a, b) => a.x - b.x);
        for (let i = 0; i < hills.length - 1; i++) {
            const [near, far] = [hills[i], hills[i + 1]];
            // Near the ends of the hills, where they come down to the water
            const from = near.x + (near.width / 2) * 0.93;
            const to = far.x - (far.width / 2) * 0.93;
            const gap = to - from;

            if (
                gap > BRIDGE_GAP_MIN &&
                gap < BRIDGE_GAP_MAX &&
                Math.abs(near.y - far.y) < BRIDGE_MAX_DROP &&
                PRNG.random() < BRIDGE_CHANCE
            ) {
                this.plan.push(
                    new SketchLayer("bridge", from, near.y - 4, gap)
                );
            }
        }

        // Generate Water
        middleMountainPositions.forEach(({ x: xOffset, y: yOffset }) => {
            const water = new SketchLayer(
                "water",
                xOffset - RADIUS, // making sure that the water will not false positivily collide with the middleMountain
                yOffset + 10,
                WATER_WIDTH,
                WATER_HEIGHT
            );

            if (this.canFit(water, 10, 10, ["water", "bottomMountain"])) {
                this.plan.push(water);
            }
        });

        let boats = 0;
        // Generate Boats: mostly on the open water of the quiet stretches
        for (let x = range.start; x < range.end; x += X_STEP) {
            // Boats on the open water: more where it is quiet, a few even among the
            // massifs, and never a fleet (at most BOATS_PER_CHUNK)
            const chance = BOAT_PROBABILITY * (0.35 + 0.65 * (1 - intensity(x)));
            if (boats < BOATS_PER_CHUNK && PRNG.random() < chance) {
                const y = PRNG.random(BOAT_Y_MIN, BOAT_Y_MAX);
                const boatChunk = new SketchLayer("boat", x, y, BOAT_WIDTH);

                if (
                    this.canFit(boatChunk, 10, 100, ["boat", "water"]) &&
                    this.isOnOpenWater(boatChunk)
                ) {
                    this.plan.push(boatChunk);
                    boats++;
                }
            }
        }

        // An inscription (题款) in the open sky, now and then
        if (Designer.wantsInscription(Math.round(range.start / CHUNK_WIDTH))) {
            const start = PRNG.random(0, range.length);

            for (let step = 0; step < range.length; step += 50) {
                const x = range.start + ((start + step) % range.length);
                const inscription = new SketchLayer(
                    "inscription",
                    x,
                    INSCRIPTION_Y,
                    INSCRIPTION_WIDTH,
                    INSCRIPTION_HEIGHT
                );

                if (this.isSkyClear(inscription)) {
                    this.plan.push(inscription);
                    break;
                }
            }
        }

        // Now and then a flock of geese crossing the open sky
        if (PRNG.random() < BIRDS_CHANCE) {
            const start = PRNG.random(0, range.length);
            const y = PRNG.random(BIRDS_Y_MIN, BIRDS_Y_MAX);

            for (let step = 0; step < range.length; step += 50) {
                const x = range.start + ((start + step) % range.length);
                const flock = new SketchLayer("birds", x, y, BIRDS_WIDTH, BIRDS_HEIGHT);

                if (this.isSkyClear(flock)) {
                    this.plan.push(flock);
                    break;
                }
            }
        }

        // Bands of cloud lying across the massifs at mid-height. Last, so adding them
        // doesn't change anything placed before.
        let bands = 0;
        for (let x = range.start; x < range.end && bands < CLOUD_PER_CHUNK; x += 200) {
            const chance = CLOUD_CHANCE * (getWeather() === "rain" ? 2.5 : 1);
            if (intensity(x) < CLOUD_INTENSITY || PRNG.random() > chance) continue;

            this.plan.push(
                new SketchLayer(
                    "clouds",
                    x,
                    PRNG.random(CLOUD_Y_MIN, CLOUD_Y_MAX),
                    PRNG.random(CLOUD_WIDTH_MIN, CLOUD_WIDTH_MAX),
                    PRNG.random(CLOUD_HEIGHT_MIN, CLOUD_HEIGHT_MAX)
                )
            );
            bands++;
        }
    }
}
