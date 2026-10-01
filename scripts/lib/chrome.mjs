// A small Chrome DevTools Protocol driver: launches Chrome with a throwaway profile and talks
// to its page over a WebSocket. No dependencies (Node 22 has fetch and WebSocket built in).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME =
    process.env.CHROME_PATH ??
    {
        darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        win32: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    }[process.platform] ??
    "google-chrome";

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fails early, with a hint, when the dev server isn't running */
export const requireServer = async () => {
    try {
        await fetch(BASE_URL);
    } catch {
        console.error(`Nothing is answering at ${BASE_URL}. Start the app with \`npm start\` first,\nor point BASE_URL at where it runs.`);
        process.exit(1);
    }
};

/**
 * Launch Chrome. Headless is fine for pictures; `headful` opens a real window, which is the
 * only way to measure frame pacing (headless and background tabs throttle animation frames).
 */
export const launch = async ({ headful = false, width = 1600, height = 900 } = {}) => {
    const port = 9300 + Math.floor(Math.random() * 600);
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "shanshui-chrome-"));
    const flags = headful
        ? ["--enable-gpu-rasterization", "--ignore-gpu-blocklist", `--window-size=${width},${height}`]
        : ["--headless=new"];
    const chrome = spawn(
        CHROME,
        [...flags, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"],
        { stdio: "ignore" }
    );

    let targets = [];
    for (let i = 0; i < 60 && !targets.length; i++) {
        try {
            targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t) => t.type === "page");
        } catch {}
        if (!targets.length) await sleep(250);
    }
    if (!targets.length) throw new Error(`Chrome didn't start (${CHROME}); set CHROME_PATH`);

    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    let id = 0;
    const pending = {};
    const listeners = [];
    ws.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.id && pending[message.id]) pending[message.id](message);
        else listeners.forEach((listener) => listener(message));
    };

    const send = (method, params = {}) =>
        new Promise((resolve) => {
            pending[++id] = resolve;
            ws.send(JSON.stringify({ id, method, params }));
        });

    const evaluate = async (expression) => {
        const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (reply.result?.exceptionDetails) throw new Error(JSON.stringify(reply.result.exceptionDetails).slice(0, 400));
        return reply.result?.result?.value;
    };

    const key = async (name, type) => {
        const code = name === " " ? "Space" : name;
        if (type) return send("Input.dispatchKeyEvent", { type, key: name, code });
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: name, code });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: name, code });
    };

    const size = (w, h) =>
        headful ? Promise.resolve() : send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });

    /** Open the painting with a query like `seed=7&style=pillars`, paused, controls hidden */
    const open = async (query, { wait = 4500, play = false } = {}) => {
        await send("Page.navigate", { url: `${BASE_URL}/?${query}` });
        await sleep(wait);
        // The painting plays on load: space pauses it
        if (!play) await key(" ");
    };

    const screenshot = async (file, quality = 75) => {
        const reply = await send("Page.captureScreenshot", { format: "jpeg", quality });
        fs.writeFileSync(file, Buffer.from(reply.result.data, "base64"));
    };

    const close = async () => {
        ws.close();
        const exited = new Promise((resolve) => chrome.once("exit", resolve));
        chrome.kill();
        await Promise.race([exited, sleep(3000)]);
        try {
            fs.rmSync(profile, { recursive: true, force: true });
        } catch {
            // Chrome may still be writing; the system cleans its temp folder anyway
        }
    };

    await send("Page.enable");
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await size(width, height);

    return { send, evaluate, key, size, open, screenshot, close, onEvent: (fn) => listeners.push(fn) };
};
