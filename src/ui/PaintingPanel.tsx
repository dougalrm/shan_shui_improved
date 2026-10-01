import React, { useEffect, useState } from "react";
import { Button } from "./Button";
import { PaintingOptions } from "../utils/style";

/** The choices for each option, in the order they are shown (see utils/style.ts) */
const ROWS: Array<{ key: keyof PaintingOptions; label: string; names: Record<string, string> }> = [
    { key: "style", label: "Mountains", names: { classic: "Classic", pillars: "Pillars", blend: "Blend" } },
    {
        key: "season",
        label: "Season",
        names: { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" },
    },
    { key: "weather", label: "Weather", names: { clear: "Clear", rain: "Rain", fog: "Fog" } },
    { key: "time", label: "Light", names: { day: "Day", dusk: "Dusk", night: "Night" } },
];

interface IPaintingPanel {
    seed: string;
    options: PaintingOptions;
    /** Paint the picture of another seed */
    onSeed: (seed: string) => void;
    /** Change some of the painting's options; the picture is redrawn where it is */
    onOptions: (options: Partial<PaintingOptions>) => void;
    /** Download the view, `views` screens wide, as an SVG */
    onDownload: (views: number) => void;
    /** Toggle between night and the light before it */
    onToggleNight: () => void;
}

/**
 * The painting's settings, behind the button at the top left: the seed, the mountains,
 * season, weather and light (the same options as the URL, which follows them, so the link
 * always paints what is on screen), and copying the link or downloading the picture.
 */
export const PaintingPanel = ({
    seed,
    options,
    onSeed,
    onOptions,
    onDownload,
    onToggleNight,
}: IPaintingPanel) => {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(seed);
    const [copied, setCopied] = useState(false);
    const night = options.time === "night";

    // A new seed from elsewhere (New, or the URL) replaces what was typed
    useEffect(() => setDraft(seed), [seed]);

    // D toggles night, Esc closes the panel
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.target instanceof HTMLInputElement) return;

            if (event.key === "d" || event.key === "D") onToggleNight();
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onToggleNight]);

    const paintDraft = () => {
        const typed = draft.trim();
        if (typed && typed !== seed) onSeed(typed);
    };

    const copyLink = () => {
        navigator.clipboard?.writeText(window.location.href).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        });
    };

    return (
        <>
            <div id="Buttons" className="Fadeable">
                <Button
                    id="Settings"
                    title={open ? "Close the painting's settings" : "The painting's settings"}
                    onClick={() => setOpen(!open)}
                    text={open ? "✕" : "☰"}
                />
                <Button
                    id="Darkmode"
                    title={night ? "Daylight (D)" : "Night (D)"}
                    onClick={onToggleNight}
                    text={night ? "☀" : "☾"}
                />
            </div>
            <div id="Menu" className={open ? "" : "hidden"} role="dialog" aria-label="The painting's settings">
                <div className="Row">
                    <label htmlFor="InputSeed">Seed</label>
                    <div className="Seed">
                        <input
                            id="InputSeed"
                            className="InputSeed"
                            value={draft}
                            spellCheck={false}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") paintDraft();
                                if (event.key === "Escape") setDraft(seed);
                            }}
                            title="Any word or number paints its own landscape. Press Enter to paint it."
                        />
                        {draft.trim() && draft.trim() !== seed ? (
                            <Button id="PaintSeed" title="Paint this seed" onClick={paintDraft} text="Paint" />
                        ) : (
                            <Button
                                id="NewSeed"
                                title="A new landscape"
                                onClick={() => onSeed(new Date().getTime().toString())}
                                text="New"
                            />
                        )}
                    </div>
                </div>

                {ROWS.map(({ key, label, names }) => (
                    <div className="Row" key={key}>
                        <span className="Label">{label}</span>
                        <div className="Choices" role="radiogroup" aria-label={label}>
                            {Object.keys(names).map((choice) => (
                                <button
                                    key={choice}
                                    role="radio"
                                    aria-checked={options[key] === choice}
                                    className={options[key] === choice ? "chosen" : ""}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => onOptions({ [key]: choice })}
                                >
                                    {names[choice]}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="Actions">
                    <Button
                        id="Share"
                        title="Copy a link to this picture"
                        onClick={copyLink}
                        text={copied ? "Copied" : "Copy link"}
                    />
                    <Button
                        id="DownloadView"
                        title="Download what is on screen as an SVG"
                        onClick={() => onDownload(1)}
                        text="Download view"
                    />
                    <Button
                        id="DownloadLong"
                        title="Download five screens' worth, from here on, as an SVG"
                        onClick={() => onDownload(5)}
                        text="Download ×5"
                    />
                </div>
                <p className="Credit">
                    After Lingdong Huang's {"{Shan, Shui}*"}, via{" "}
                    <a href="https://github.com/Megaemce/shan_shui" target="_blank" rel="noreferrer">
                        Megaemce/shan_shui
                    </a>
                </p>
            </div>
        </>
    );
};
