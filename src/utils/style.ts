/**
 * How the picture is painted, chosen in the URL. Like the seed, these are part of what a link
 * paints: the same seed and options always give the same picture.
 *
 * - `?style=`: `classic` rounded Shan Shui mountains (default), `pillars` sheer sandstone
 *   columns like Zhangjiajie, `blend` stretches of pillars among classic mountains
 * - `?season=`: `spring` blossom, `summer` (default), `autumn` turning leaves,
 *   `winter` snow
 * - `?weather=`: `clear` (default), `rain`, `fog`
 * - `?time=`: `day` (default), `dusk` with a low sun and a warm glow on the horizon, `night`
 *   by moonlight (without `?time=`, night when the system is in dark mode)
 *
 * The time of day doesn't change what is painted, only the light it is seen in.
 */
export type MountainStyle = "classic" | "pillars" | "blend";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Weather = "clear" | "rain" | "fog";
export type TimeOfDay = "day" | "dusk" | "night";

export interface PaintingOptions {
    style: MountainStyle;
    season: Season;
    weather: Weather;
    time: TimeOfDay;
}

/** Every choice of each option, the default first */
export const CHOICES: { [K in keyof PaintingOptions]: PaintingOptions[K][] } = {
    style: ["classic", "pillars", "blend"],
    season: ["summer", "spring", "autumn", "winter"],
    weather: ["clear", "rain", "fog"],
    time: ["day", "dusk", "night"],
};

/** The first of each list of choices is the default */
const DEFAULTS: PaintingOptions = {
    style: "classic",
    season: "summer",
    weather: "clear",
    time: "day",
};

let current: PaintingOptions = { ...DEFAULTS };

export const getPaintingOptions = (): PaintingOptions => current;
export const getMountainStyle = (): MountainStyle => current.style;
export const getSeason = (): Season => current.season;
export const getWeather = (): Weather => current.weather;
export const getTimeOfDay = (): TimeOfDay => current.time;

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

    const prefersNight =
        !params.has("time") && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

    return {
        style: pick("style"),
        season: pick("season"),
        weather: pick("weather"),
        time: prefersNight ? "night" : pick("time"),
    };
};

/** The URL for a seed and options (defaults left out) */
export const urlFor = (seed: string, options: PaintingOptions): string => {
    const params = new URLSearchParams({ seed });
    (Object.keys(DEFAULTS) as (keyof PaintingOptions)[]).forEach((key) => {
        if (options[key] !== DEFAULTS[key]) params.set(key, options[key]);
    });
    return `/?${params}`;
};

/** The URL for a seed, keeping the current options (defaults left out) */
export const pictureUrl = (seed: string): string => urlFor(seed, current);
