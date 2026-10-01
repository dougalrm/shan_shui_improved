// Memory over a long scroll: scrolls far through a picture and reports the page's JS heap, DOM
// nodes and how long the scroll stays ahead of the painting. Headless is fine. Needs `npm start`.
//
//   npm run soak
//   npm run soak -- "seed=abc&style=pillars" --views 200
import { BASE_URL, launch, requireServer, sleep } from "./lib/chrome.mjs";

const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : fallback;
};
const views = Number(arg("views", 120));
const query = process.argv.slice(2).find((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--")) ?? "seed=soak";

await requireServer();
const chrome = await launch({ width: 1600, height: 900 });

const metrics = async () => {
    await chrome.send("HeapProfiler.collectGarbage");
    const { result: { metrics } } = await chrome.send("Performance.getMetrics");
    const get = (name) => metrics.find((m) => m.name === name)?.value ?? 0;
    return { heap: get("JSHeapUsedSize") / 1e6, nodes: get("Nodes"), documents: get("Documents") };
};
const layers = () => chrome.evaluate("document.querySelectorAll('svg.Layer').length");

await chrome.send("Performance.enable");
// How long the first layers take to appear
const started = Date.now();
await chrome.send("Page.navigate", { url: `${BASE_URL}/?${query}` });
for (;;) {
    await sleep(25);
    const count = await chrome.evaluate("document.querySelectorAll('svg.Layer').length").catch(() => 0);
    if (count > 0) break;
}
console.log(`${query}: first layer after ${Date.now() - started} ms`);
await sleep(3000);
await chrome.key(" ");

const rows = [];
for (let view = 1; view <= views; view++) {
    await chrome.key("PageDown");
    await sleep(350);
    if (view % 20 === 0) {
        const m = await metrics();
        rows.push({ view, layers: await layers(), ...m });
        console.log(`view ${String(view).padStart(4)}   heap ${m.heap.toFixed(0).padStart(5)} MB   DOM nodes ${String(m.nodes).padStart(8)}   layers ${rows.at(-1).layers}`);
    }
}
await chrome.close();
