import React from "react";
import { Button } from "./Button";

interface IControls {
    playing: boolean;
    onTogglePlay: () => void;
    /** Auto-scroll speed as shown to the user, e.g. "1×" */
    speedLabel: string;
    onSlower?: () => void;
    onFaster?: () => void;
    onStart: () => void;
    fullscreen: boolean;
    onToggleFullscreen: () => void;
    onHelp: () => void;
}

/**
 * The bar along the bottom: back to the start, play/pause, auto-scroll speed,
 * fullscreen and the keyboard shortcuts.
 */
export const Controls = ({
    playing,
    onTogglePlay,
    speedLabel,
    onSlower,
    onFaster,
    onStart,
    fullscreen,
    onToggleFullscreen,
    onHelp,
}: IControls) => (
    <div id="Controls" className="Fadeable">
        <Button id="ToStart" title="Back to the start (Home)" onClick={onStart} text="⇤" />
        <Button
            id="Slower"
            title="Slower (−)"
            onClick={onSlower}
            text="−"
            disabled={!onSlower}
        />
        <Button
            id="PlayPause"
            title={playing ? "Pause (Space)" : "Play (Space)"}
            onClick={onTogglePlay}
            text={playing ? "❚❚" : "▶"}
        />
        <Button
            id="Faster"
            title="Faster (+)"
            onClick={onFaster}
            text="+"
            disabled={!onFaster}
        />
        <span id="Speed" title="Auto-scroll speed">
            {speedLabel}
        </span>
        <Button
            id="Fullscreen"
            title={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
            onClick={onToggleFullscreen}
            text={fullscreen ? "⤡" : "⤢"}
        />
        <Button id="Help" title="Keyboard shortcuts (?)" onClick={onHelp} text="?" />
    </div>
);
