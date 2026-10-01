// How often each thing is placed: the Designer's plan, counted over many chunks. Fast, as it
// only plans and doesn't draw.
//
//   npm run stats                                every check picture, 30 chunks each
//   npm run stats -- --seed 9 --style pillars --chunks 60
import { PICTURES, describe, loadGenerator, options } from "./lib/painting.mjs";

const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : undefined;
};
const CHUNKS = Number(arg("chunks") ?? 30);
const asked = ["seed", "style", "season", "weather"].filter(arg);
const pictures = asked.length
    ? [Object.fromEntries([["seed", "7"], ...asked.map((k) => [k, arg(k)])])]
    : PICTURES;

const { startPicture, planChunk, Scenes } = loadGenerator();
const rows = {};
const sequences = {};

for (const picture of pictures) {
    startPicture(picture.seed, options(picture));
    const counts = {};
    for (let i = 0; i < CHUNKS; i++) {
        // With its neighbours' plans, as the generator does
        const left = i > 0 ? planChunk(i - 1) : [];
        const right = planChunk(i + 1);
        for (const sketch of planChunk(i, left, right)) {
            counts[sketch.tag] = (counts[sketch.tag] ?? 0) + 1;
        }
    }
    rows[describe(picture)] = counts;
    const scenes = [];
    for (let x = 0; x < CHUNKS * 1000; ) {
        const scene = Scenes.at(x);
        scenes.push(`${scene.kind} ${((scene.end - scene.start) / 1000).toFixed(1)}`);
        x = scene.end;
    }
    sequences[describe(picture)] = scenes.join(", ");
}

const tags = [...new Set(Object.values(rows).flatMap(Object.keys))].sort();
const width = Math.max(...tags.map((t) => t.length)) + 2;
console.log(`Placements per ${CHUNKS} chunks\n`);
console.log("".padEnd(width) + Object.keys(rows).map((_, i) => `#${i + 1}`.padStart(6)).join(""));
for (const tag of tags) {
    console.log(tag.padEnd(width) + Object.values(rows).map((c) => String(c[tag] ?? 0).padStart(6)).join(""));
}
console.log("");
Object.keys(rows).forEach((name, i) => console.log(`#${i + 1} ${name}\n   scenes (chunks long): ${sequences[name]}`));
