import React from "react";

const SHORTCUTS: Array<[string, string]> = [
    ["Space", "Play / pause"],
    ["← →", "Scroll while held (Shift for faster)"],
    ["Drag", "Pan, and flick to throw"],
    ["Wheel / trackpad", "Pan"],
    ["Page Up / Page Down", "Move a screen"],
    ["Home", "Back to the start"],
    ["+ −", "Auto-scroll faster / slower"],
    ["F", "Fullscreen"],
    ["H", "Hide / show the controls"],
    ["D", "Night / daylight"],
    ["?", "This list"],
    ["Esc", "Close"],
];

interface IShortcuts {
    visible: boolean;
    onClose: () => void;
}

/** The list of keyboard shortcuts and gestures. */
export const Shortcuts = ({ visible, onClose }: IShortcuts) =>
    visible ? (
        <div id="Shortcuts" onClick={onClose}>
            <div
                className="Panel"
                role="dialog"
                aria-label="Keyboard shortcuts"
                onClick={(event) => event.stopPropagation()}
            >
                <h4>Controls</h4>
                <dl>
                    {SHORTCUTS.map(([keys, action]) => (
                        <React.Fragment key={keys}>
                            <dt>{keys}</dt>
                            <dd>{action}</dd>
                        </React.Fragment>
                    ))}
                </dl>
            </div>
        </div>
    ) : null;
