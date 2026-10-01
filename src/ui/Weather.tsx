import React, { useMemo } from "react";
import { getPaintingOptions } from "../utils/style";

/** A square tile of snowflakes or raindrops as an SVG data URL, used as a repeating mask */
const tile = (size: number, count: number, draw: (x: number, y: number) => string) => {
    let marks = "";
    for (let i = 0; i < count; i++) {
        marks += draw(Math.random() * size, Math.random() * size);
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${marks}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const snowflake = (big: boolean) => (x: number, y: number) =>
    `<circle cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' r='${(
        Math.random() * (big ? 1.8 : 1) +
        (big ? 1.4 : 0.8)
    ).toFixed(1)}' fill-opacity='${(0.55 + Math.random() * 0.45).toFixed(2)}'/>`;

const raindrop = (x: number, y: number) => {
    const length = 14 + Math.random() * 18;
    return `<line x1='${x.toFixed(1)}' y1='${y.toFixed(1)}' x2='${(x - length * 0.22).toFixed(1)}' y2='${(y + length).toFixed(1)}' stroke='black' stroke-width='1.2' stroke-linecap='round' stroke-opacity='${(0.45 + Math.random() * 0.5).toFixed(2)}'/>`;
};

/**
 * Falling snow (winter), rain (?weather=rain) or drifting banks of fog (?weather=fog), over the
 * picture and under the paper texture.
 * Each is two sheets of marks at different depths falling at different speeds, drawn with a
 * repeating mask so the colour comes from the palette, and moved by the compositor.
 */
export const Weather = () => {
    const { season, weather } = getPaintingOptions();
    const kind =
        weather === "rain" || weather === "fog"
            ? weather
            : season === "winter"
            ? "snow"
            : undefined;

    // Made once: a different scatter on every visit is fine for weather
    const sheets = useMemo(() => {
        if (kind === "snow") {
            return [
                { className: "Far", mask: tile(260, 34, snowflake(false)), size: 260 },
                { className: "Near", mask: tile(400, 22, snowflake(true)), size: 400 },
            ];
        }
        if (kind === "rain") {
            return [
                { className: "Far", mask: tile(220, 40, raindrop), size: 220 },
                { className: "Near", mask: tile(320, 26, raindrop), size: 320 },
            ];
        }
        if (kind === "fog") {
            // Soft banks of fog drifting slowly sideways (painted by style.css, no mask)
            return [
                { className: "Far", mask: undefined, size: 1400 },
                { className: "Near", mask: undefined, size: 2000 },
            ];
        }
        return [];
    }, [kind]);

    if (!kind) return null;

    return (
        <div id="Weather" className={kind} aria-hidden="true">
            {sheets.map(({ className, mask, size }) => (
                <div
                    key={className}
                    className={className}
                    style={{
                        // Slides exactly whole tiles, so the loop is seamless
                        ["--tile" as string]: `${size}px`,
                        maskImage: mask,
                        WebkitMaskImage: mask,
                        maskSize: `${size}px ${size}px`,
                        WebkitMaskSize: `${size}px ${size}px`,
                    }}
                />
            ))}
        </div>
    );
};
