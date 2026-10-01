// Screenshots along the scroll, to look at a change with your own eyes. Needs `npm start`.
//
//   npm run shots                                  every check picture, 4 views each
//   npm run shots -- "seed=9&style=pillars" --views 8 --size 1280x720
//
// Pictures go to shots/ (not committed).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, requireServer, sleep } from "./lib/chrome.mjs";
import { PICTURES, describe } from "./lib/painting.mjs";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../shots");
const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : fallback;
};
const views = Number(arg("views", 4));
const [width, height] = arg("size", "1600x900").split("x").map(Number);
const asked = process.argv.slice(2).find((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));
const queries = asked ? [asked] : PICTURES.map(describe);

await requireServer();
fs.mkdirSync(OUT, { recursive: true });
const chrome = await launch({ width, height });

for (const query of queries) {
    await chrome.open(query);
    await chrome.key("h");
    const name = query.replace(/[^a-z0-9=]+/gi, "_").replace(/=/g, "-");
    for (let v = 0; v < views; v++) {
        // Give the chunks coming into view time to be inserted
        await sleep(3000);
        const file = path.join(OUT, `${name}_${v}.jpg`);
        await chrome.screenshot(file);
        console.log(path.relative(process.cwd(), file));
        await chrome.key("PageDown");
        await chrome.key("PageDown");
    }
}

chrome.close();
