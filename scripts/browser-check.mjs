// The painting in a real browser comes out the same at different window sizes and however it
// was scrolled to: the renderer's side of what `npm run check` checks for the generator.
// Needs `npm start`.
//
//   npm run check:browser
import { launch, requireServer, sleep } from "./lib/chrome.mjs";

const QUERY = "seed=determinism&style=blend&season=winter";

/** A hash of every drawn layer of the first three chunks */
const HASHES = `(() => {
    const out = {};
    for (const svg of document.querySelectorAll("#Scaled svg.Layer")) {
        const m = /^chunk(\\d+)-layer(\\d+)/.exec(svg.id);
        if (!m || +m[1] > 2) continue;
        let h = 0;
        const s = svg.innerHTML;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
        out[svg.id] = h;
    }
    return out;
})()`;

await requireServer();
const chrome = await launch();

const runs = [
    ["1600x900, held arrow key", 1600, 900, async () => {
        await chrome.key("ArrowRight", "keyDown");
        await sleep(2500);
        await chrome.key("ArrowRight", "keyUp");
    }],
    ["1000x700, paged", 1000, 700, async () => {
        await chrome.key("PageDown");
        await sleep(1200);
        await chrome.key("PageDown");
    }],
];

const results = [];
for (const [name, width, height, scroll] of runs) {
    await chrome.size(width, height);
    await chrome.open(QUERY);
    await scroll();
    await sleep(1500);
    await chrome.key("Home");
    await sleep(2500);
    results.push([name, await chrome.evaluate(HASHES)]);
}
await chrome.close();

const [[nameA, a], [nameB, b]] = results;
const common = Object.keys(a).filter((k) => k in b);
const differing = common.filter((k) => a[k] !== b[k]);
console.log(`${nameA}: ${Object.keys(a).length} layers, ${nameB}: ${Object.keys(b).length} layers, ${common.length} in both`);
if (!common.length || differing.length) {
    console.log(`FAIL  ${differing.length} layers differ: ${differing.slice(0, 10).join(", ")}`);
    process.exit(1);
}
console.log("ok    every layer identical");
