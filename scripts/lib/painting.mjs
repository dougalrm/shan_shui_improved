// Runs the painting's generator in Node, without a browser: the TypeScript under src/ is
// transpiled (no type checking, that's `tsc`'s job) to CommonJS in node_modules/.cache, then
// loaded like any module. Only the generator is needed, so the UI is left out.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "node_modules/.cache/shanshui-node");
const SKIP = new Set(["ui", "App.tsx", "index.tsx", "generator.worker.ts"]);

const compileDir = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(entry.name)) continue;
        const from = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            compileDir(from);
            continue;
        }
        if (!/\.ts$/.test(entry.name) || entry.name.endsWith(".d.ts")) continue;

        const to = path.join(OUT, path.relative(SRC, from)).replace(/\.ts$/, ".js");
        const { outputText } = ts.transpileModule(fs.readFileSync(from, "utf8"), {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
                esModuleInterop: true,
            },
            fileName: from,
        });
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.writeFileSync(to, outputText);
    }
};

let loaded;

/** The generator (src/workers/generate.ts), freshly compiled from src/ */
export const loadGenerator = () => {
    if (loaded) return loaded;
    fs.rmSync(OUT, { recursive: true, force: true });
    compileDir(SRC);
    loaded = createRequire(import.meta.url)(path.join(OUT, "workers/generate.js"));
    return loaded;
};

/** The painting options, filled in with the defaults */
export const options = ({ style = "classic", season = "summer", weather = "clear" } = {}) => ({
    style,
    season,
    weather,
});

/** A short, stable hash of a string (cyrb53, as PRNG uses), in base 36 */
export const hash = (text) => {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ char, 2654435761);
        h2 = Math.imul(h2 ^ char, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

/** The pictures the checks paint: every style, season and weather appears at least once */
export const PICTURES = [
    { seed: "7", style: "classic" },
    { seed: "3", style: "classic", season: "spring" },
    { seed: "abc", style: "pillars", season: "winter" },
    { seed: "7", style: "blend", season: "autumn", weather: "rain" },
];

export const describe = ({ seed, ...rest }) =>
    [`seed=${seed}`, ...Object.entries(rest).map(([k, v]) => `${k}=${v}`)].join("&");
