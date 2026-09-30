/**
 * The mountain style, chosen with `?style=` in the URL:
 * - `classic`: rounded Shan Shui mountains (the default)
 * - `pillars`: sheer sandstone columns like Zhangjiajie
 * - `blend`: stretches of pillars among classic mountains
 *
 * It is part of what a link paints: the same seed and style always give the same picture.
 */
export type MountainStyle = "classic" | "pillars" | "blend";

const STYLES: MountainStyle[] = ["classic", "pillars", "blend"];

let current: MountainStyle = "classic";

export const getMountainStyle = (): MountainStyle => current;

export const setMountainStyle = (style: MountainStyle): void => {
    current = style;
};

/** The style asked for in the page's URL, or classic */
export const styleFromUrl = (): MountainStyle => {
    const asked = new URLSearchParams(window.location.search).get("style");
    return STYLES.includes(asked as MountainStyle)
        ? (asked as MountainStyle)
        : "classic";
};

/** The URL for a seed, keeping the current style (left out when it is the default) */
export const pictureUrl = (seed: string): string => {
    const params = new URLSearchParams({ seed });
    if (current !== "classic") params.set("style", current);
    return `/?${params}`;
};
