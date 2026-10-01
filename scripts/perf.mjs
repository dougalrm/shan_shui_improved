// Frame pacing while auto-scrolling, measured from a Chrome trace. Opens a real Chrome window
// for about 20 s (headless Chrome doesn't pace frames like a real one). Needs `npm start`.
//
//   npm run perf
//   npm run perf -- "seed=abc&style=pillars" --seconds 20
import { launch, requireServer, sleep } from "./lib/chrome.mjs";

const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : fallback;
};
const seconds = Number(arg("seconds", 10));
const query = process.argv.slice(2).find((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--")) ?? "seed=perf";

await requireServer();
const chrome = await launch({ headful: true, width: 1680, height: 900 });

const events = [];
let finished;
chrome.onEvent((message) => {
    if (message.method === "Tracing.dataCollected") events.push(...message.params.value);
    if (message.method === "Tracing.tracingComplete") finished();
});

// Let it load and settle into auto-scrolling before measuring
await chrome.open(query, { wait: 8000, play: true });
await sleep(2500);

const done = new Promise((resolve) => (finished = resolve));
await chrome.send("Tracing.start", {
    traceConfig: { includedCategories: ["viz", "benchmark", "devtools.timeline", "disabled-by-default-devtools.timeline.frame"] },
    transferMode: "ReportEvents",
});
await sleep(seconds * 1000);
await chrome.send("Tracing.end");
await done;
chrome.close();

const swaps = events
    .filter((e) => e.name === "Display::DrawAndSwap" && e.ph === "X")
    .map((e) => e.ts)
    .sort((a, b) => a - b);
const gaps = swaps.slice(1).map((t, i) => (t - swaps[i]) / 1000);
const typical = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
// A frame is late when it took noticeably longer than the display's usual frame
const late = gaps.filter((g) => g > typical * 1.5 + 2);
const longTasks = events.filter((e) => e.name === "RunTask" && e.ph === "X" && e.dur > 50000).length;

console.log(`${query}, ${seconds} s of auto-scroll`);
console.log(`  frames presented   ${swaps.length} (${(swaps.length / seconds).toFixed(0)} fps, typical frame ${typical.toFixed(1)} ms)`);
console.log(`  late frames        ${late.length}${late.length ? `, worst ${Math.max(...late).toFixed(0)} ms` : ""}`);
console.log(`  tasks over 50 ms   ${longTasks}`);
if (!swaps.length) console.log("  (no frames traced: was the window hidden or minimised?)");
