import { LayerType } from "../types/LayerType";

/** What the main thread can ask the generator worker to do */
export type GeneratorRequest =
    /** Start over with a new seed, see PRNG.rawSeed */
    | { type: "seed"; seed: string | number }
    /** Design and build a frame covering the given range */
    | { type: "frame"; id: number; start: number; end: number };

/** A finished layer: where it is and its SVG markup */
export interface GeneratedLayer {
    tag: LayerType;
    x: number;
    y: number;
    /** Left edge of everything drawn in the layer */
    start: number;
    /** Right edge of everything drawn in the layer */
    end: number;
    svg: string;
}

/** The worker's answer to a "frame" request */
export interface GeneratedFrame {
    id: number;
    layers: GeneratedLayer[];
}
