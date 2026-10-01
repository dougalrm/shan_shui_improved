import { getSeason } from "./style";

/**
 * The colour of foliage drawn as a grey wash of level `grey` (0-255), by season: blossom pinks
 * in spring, rust and ochre in autumn, lighter under snow in winter, the plain wash in summer.
 * The grey's lightness is kept, so the tree keeps its shading.
 * @param {number} grey - Grey level the foliage would be in summer
 * @param {number} alpha - Opacity
 * @returns {string} an rgba colour
 */
export const foliageColor = (grey: number, alpha: number): string => {
    const shade = 255 - grey;
    // Half tint, half the original wash: colour within the ink, not paint over it
    const mix = (tint: [number, number, number], amount: number) =>
        `rgba(${tint
            .map((channel) => Math.round(grey + (channel - grey) * amount))
            .join(",")},${alpha})`;

    switch (getSeason()) {
        case "spring":
            return mix([255 - shade * 0.25, 200 - shade * 0.45, 205 - shade * 0.4], 0.6);
        case "autumn":
            return mix([grey + 30, grey * 0.8 + 10, grey * 0.62], 0.85);
        case "winter":
            return mix([255, 255, 255], 0.45);
        default:
            return `rgba(${grey},${grey},${grey},${alpha})`;
    }
};
