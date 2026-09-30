import "./style.css";
import React from "react";
import { App } from "./App";
import { createRoot } from "react-dom/client";
import { inkStylesheet } from "./utils/ink";

// The ink tone classes the generated picture uses, see utils/ink.ts
const inkStyle = document.createElement("style");
inkStyle.id = "InkTones";
inkStyle.textContent = inkStylesheet();
document.head.appendChild(inkStyle);

const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(
    // <React.StrictMode>
    <App />
    // </React.StrictMode>
);
