/**
 * How the picture is painted, chosen in the URL. Like the seed, these are part of what a link
 * paints: the same seed and options always give the same picture.
 *
 * - `?style=`: `classic` rounded Shan Shui mountains (default), `pillars` sheer sandstone
 *   columns like Zhangjiajie, `blend` stretches of pillars among classic mountains
 * - `?season=`: `spring` blossom, `summer` (default), `autumn` turning leaves,
 *   `winter` snow
 * - `?weather=`: `clear` (default), `rain`
 */
export type MountainStyle = "classic" | "pillars" | "blend";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "clear" | "rain";

export interface PaintingOptions {
    style: MountainStyle;
    season: Season;
    weather: Weather;
}

const CHOICES: { [K in keyof PaintingOptions]: PaintingOptions[K][] } = {
    style: ["classic", "pillars", "blend"],
    season: ["summer", "spring", "autumn", "winter"],
    weather: ["clear", "rain"],
};

/** The first of each list of choices is the default */
const DEFAULTS: PaintingOptions = {
    style: "classic",
    season: "summer",
    weather: "clear",
};

let current: PaintingOptions = { ...DEFAULTS };

export const getPaintingOptions = (): PaintingOptions => current;
export const getMountainStyle = (): MountainStyle => current.style;
export const getSeason = (): Season => current.season;
export const getWeather = (): Weather => current.weather;

export const setPaintingOptions = (options: PaintingOptions): void => {
    current = { ...options };
};

/** The options asked for in the page's URL; anything missing or unknown is the default */
export const optionsFromUrl = (): PaintingOptions => {
    const params = new URLSearchParams(window.location.search);
    const pick = <K extends keyof PaintingOptions>(key: K): PaintingOptions[K] => {
        const asked = params.get(key) as PaintingOptions[K];
        return CHOICES[key].includes(asked) ? asked : DEFAULTS[key];
    };

    return { style: pick("style"), season: pick("season"), weather: pick("weather") };
};

/** The URL for a seed, keeping the current options (defaults left out) */
export const pictureUrl = (seed: string): string => {
    const params = new URLSearchParams({ seed });
    (Object.keys(DEFAULTS) as (keyof PaintingOptions)[]).forEach((key) => {
        if (current[key] !== DEFAULTS[key]) params.set(key, current[key]);
    });
    return `/?${params}`;
};
