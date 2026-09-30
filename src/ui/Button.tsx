import React from "react";
import { IButton } from "../interfaces/IButton";

export const Button = ({ id, title, onClick, text, disabled }: IButton) => (
    <button
        id={id}
        title={title}
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
        // Clicking shouldn't leave the button focused, or Space would press it again
        // instead of pausing. Keyboard users still reach it with Tab.
        onMouseDown={(event) => event.preventDefault()}
    >
        {text}
    </button>
);
