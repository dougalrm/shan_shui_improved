/**
 * Ink tones.
 *
 * The generator describes colours the way the original code did: greys with an alpha, e.g.
 * `rgba(100,100,100,0.4)`, and white for the paper-coloured fills that hide what's behind.
 * Here each colour is turned into how much ink it is (0-1) and written as a CSS class instead
 * of an inline colour. The classes get their colours from CSS variables, so the whole picture
 * can switch palette (day ink, night...) instantly, without being generated again, and the
 * markup is a lot smaller.
 *
 * - `f1`...`f50` / `s1`...`s50`: translucent ink fill / stroke, in 50 steps of strength.
 *   Overlapping strokes build up, like ink does.
 * - `w1`...`w50` / `v1`...`v50`: opaque wash fill / stroke: ink already mixed with the silk, for
 *   the original opaque greys (e.g. distant mountains made of triangles that must not show seams)
 * - `fp` / `sp`: fill / stroke in the colour of the silk (the paper the ink sits on)
 */

/** Multiplies the ink of everything being drawn, see withInkStrength */
let inkStrength = 1;

/**
 * Draw with more or less ink, e.g. paler for things further away (atmospheric perspective).
 * Everything that `build` draws has its ink multiplied by `strength`. Silk stays silk.
 * @param {number} strength - Ink multiplier, 1 is normal
 * @param {Function} build - Draws something and returns it
 * @returns What `build` returned
 */
export const withInkStrength = <T>(strength: number, build: () => T): T => {
    const previous = inkStrength;
    // Multiplies, so it can be nested: e.g. a far pillar inside a far mountain group
    inkStrength = previous * strength;
    try {
        return build();
    } finally {
        inkStrength = previous;
    }
};

/**
 * Open water lies below the far shore, where the distant mountains stand (their feet are at
 * 230-280 down the 900-tall world). The wash fades in over this band so the uneven shoreline
 * doesn't show a hard edge.
 */
export const WATER_FADE_TOP = 232;
export const WATER_TOP = 280;

/** A haze of the season's colour lies along the horizon, over this band */
export const HORIZON_TOP = 40;
export const HORIZON_BOTTOM = 460;

/** How many strengths of ink there are */
export const INK_STEPS = 50;
/** Brightness (0-255) of the ink the original greys are measured against */
const INK_BRIGHTNESS = 20;

type Tone =
    | { kind: "none" }
    | { kind: "silk" }
    | { kind: "ink"; step: number }
    | { kind: "wash"; step: number }
    | { kind: "raw"; css: string };

const GREY = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

/** Work out what a colour means in ink. */
export const toTone = (color: string): Tone => {
    const value = color.trim().toLowerCase();

    if (value === "none" || value === "transparent") return { kind: "none" };
    if (value === "white") return { kind: "silk" };

    const match = GREY.exec(value);
    if (!match) return { kind: "raw", css: color };

    const [r, g, b] = [match[1], match[2], match[3]].map(Number);
    const alpha = match[4] === undefined ? 1 : Number(match[4]);

    if (alpha <= 0) return { kind: "none" };
    // Only greys are ink, anything coloured is kept as it is
    if (r !== g || g !== b) return { kind: "raw", css: color };
    if (r >= 250) return { kind: "silk" };

    // The same darkening on white paper as the original grey gave
    const amount = Math.min(
        1,
        ((alpha * (255 - r)) / (255 - INK_BRIGHTNESS)) * inkStrength
    );
    const step = Math.max(1, Math.round(amount * INK_STEPS));

    return { kind: alpha >= 1 ? "wash" : "ink", step };
};

/**
 * Attributes (class, and inline style for anything that isn't ink) for an element with
 * the given fill and stroke.
 */
export const inkAttributes = (
    fill: string,
    stroke: string,
    strokeWidth: number
): string => {
    const classes: string[] = [];
    const styles: string[] = [];
    const fillTone = toTone(fill);
    const strokeTone = toTone(stroke);

    if (fillTone.kind === "ink") classes.push(`f${fillTone.step}`);
    if (fillTone.kind === "wash") classes.push(`w${fillTone.step}`);
    if (fillTone.kind === "silk") classes.push("fp");
    if (fillTone.kind === "raw") styles.push(`fill:${fillTone.css}`);

    if (strokeTone.kind === "ink") classes.push(`s${strokeTone.step}`);
    if (strokeTone.kind === "wash") classes.push(`v${strokeTone.step}`);
    if (strokeTone.kind === "silk") classes.push("sp");
    if (strokeTone.kind === "raw") styles.push(`stroke:${strokeTone.css}`);

    let attributes = classes.length ? `class='${classes.join(" ")}'` : "";
    if (styles.length) attributes += ` style='${styles.join(";")}'`;
    if (strokeTone.kind !== "none" && strokeWidth) {
        attributes += ` stroke-width='${+strokeWidth.toFixed(2)}'`;
    }
    return attributes;
};

/** The CSS for the tone classes. Needs `--ink` and `--silk` to be defined. */
export const inkStylesheet = (): string => {
    const rules = ["polyline{fill:none;stroke:none}"];

    for (let step = 1; step <= INK_STEPS; step++) {
        const opacity = +(step / INK_STEPS).toFixed(3);
        rules.push(`.f${step}{fill:var(--ink);fill-opacity:${opacity}}`);
        rules.push(`.s${step}{stroke:var(--ink);stroke-opacity:${opacity}}`);

        const wash = `color-mix(in srgb,var(--ink) ${+(opacity * 100).toFixed(1)}%,var(--silk))`;
        rules.push(`.w${step}{fill:${wash}}`, `.v${step}{stroke:${wash}}`);
    }
    rules.push(".fp{fill:var(--silk)}", ".sp{stroke:var(--silk)}");
    // Inscriptions and seals. Downloaded files fall back to a Kai (regular script) font
    // installed on the computer if the brush font isn't.
    rules.push(
        '.calligraphy{font-family:"Ma Shan Zheng","STKaiti","KaiTi","Kaiti SC",serif}'
    );

    return rules.join("\n");
};

/**
 * Shared SVG definitions the picture refers to, e.g. `url(#mist)`. They must be in the page
 * (and in downloaded files) once. Mist and cloud strength follow the palette's --mist.
 */
export const inkDefs = (): string => `
    <linearGradient id="horizon" x1="0" y1="${HORIZON_TOP}" x2="0" y2="${HORIZON_BOTTOM}" gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color:var(--horizon);stop-opacity:0"/>
        <stop offset="0.52" style="stop-color:var(--horizon);stop-opacity:1"/>
        <stop offset="1" style="stop-color:var(--horizon);stop-opacity:0"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="${WATER_FADE_TOP}" x2="0" y2="900" gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color:var(--water-far);stop-opacity:0"/>
        <stop offset="${((WATER_TOP - WATER_FADE_TOP) / (900 - WATER_FADE_TOP)).toFixed(3)}" style="stop-color:var(--water-far);stop-opacity:1"/>
        <stop offset="1" style="stop-color:var(--water-near);stop-opacity:1"/>
    </linearGradient>
    <radialGradient id="mist" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" style="stop-color:var(--silk);stop-opacity:calc(0.7 * var(--mist, 1))"/>
        <stop offset="0.55" style="stop-color:var(--silk);stop-opacity:calc(0.55 * var(--mist, 1))"/>
        <stop offset="0.8" style="stop-color:var(--silk);stop-opacity:calc(0.22 * var(--mist, 1))"/>
        <stop offset="1" style="stop-color:var(--silk);stop-opacity:calc(0 * var(--mist, 1))"/>
    </radialGradient>
    <radialGradient id="cloud" cx="0.5" cy="0.55" r="0.5">
        <stop offset="0" style="stop-color:var(--silk);stop-opacity:calc(0.95 * var(--mist, 1))"/>
        <stop offset="0.5" style="stop-color:var(--silk);stop-opacity:calc(0.85 * var(--mist, 1))"/>
        <stop offset="0.8" style="stop-color:var(--silk);stop-opacity:calc(0.4 * var(--mist, 1))"/>
        <stop offset="1" style="stop-color:var(--silk);stop-opacity:calc(0 * var(--mist, 1))"/>
    </radialGradient>`;
