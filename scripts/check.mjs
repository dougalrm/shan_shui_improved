// The checks to run before committing a change to the painting:
//
//   npm run check              types, determinism, sanity, and changes against the baseline
//   npm run check -- --update  accept the changes: write the new baseline
//
// Runs in Node, no browser or dev server needed. See scripts/README.md.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PICTURES, describe, hash, loadGenerator, options } from "./lib/painting.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.join(HERE, "baseline.json");
const CHUNKS = 8;
const update = process.argv.includes("--update");

let failed = false;
const pass = (name, detail = "") => console.log(`  ok    ${name}${detail ? `  (${detail})` : ""}`);
const fail = (name, detail) => {
    failed = true;
    console.log(`  FAIL  ${name}\n        ${detail.split("\n").join("\n        ")}`);
};

// 1. TYPES
console.log("Types");
try {
    execSync("npx tsc --noEmit -p .", { cwd: path.join(HERE, ".."), stdio: "pipe" });
    pass("tsc");
} catch (error) {
    fail("tsc", String(error.stdout).trim().split("\n").slice(0, 15).join("\n"));
}

const { startPicture, generateChunk } = loadGenerator();

/** Every layer of a chunk, keyed `tag#n`, as a hash of its SVG */
const chunkHashes = (frame) => {
    const counts = {};
    const out = {};
    for (const layer of frame.layers) {
        const n = (counts[layer.tag] = (counts[layer.tag] ?? 0) + 1);
        out[`${layer.tag}#${n}`] = hash(`${layer.x},${layer.y},${layer.start},${layer.end}|${layer.svg}`);
    }
    return out;
};

const paint = (picture, order) => {
    startPicture(picture.seed, options(picture));
    const chunks = {};
    for (const index of order) chunks[index] = generateChunk(index);
    return chunks;
};

const inOrder = [...Array(CHUNKS).keys()];
const current = {};
const timings = [];

// 2. DETERMINISM: a chunk comes out the same whatever order the chunks are painted in, which
// is what makes the scroll seamless on any screen
console.log("\nDeterminism and sanity");
for (const picture of PICTURES) {
    const name = describe(picture);
    const started = performance.now();
    const forward = paint(picture, inOrder);
    timings.push((performance.now() - started) / CHUNKS);

    const backward = paint(picture, [...inOrder].reverse());
    const scattered = paint(picture, [5, 2, 7, 0, 3, 6, 1, 4]);

    const differing = inOrder.filter((i) => {
        const a = JSON.stringify(forward[i]);
        return a !== JSON.stringify(backward[i]) || a !== JSON.stringify(scattered[i]);
    });
    if (differing.length) fail(`${name} determinism`, `chunks ${differing.join(", ")} depend on painting order`);
    else pass(`${name} determinism`);

    // SANITY: no broken numbers in the drawing
    const broken = [];
    for (const i of inOrder) {
        for (const layer of forward[i].layers) {
            const bad = /NaN|undefined|Infinity/.exec(layer.svg);
            if (bad) broken.push(`chunk ${i} ${layer.tag}: "${bad[0]}" in the SVG`);
        }
    }
    if (broken.length) fail(`${name} sanity`, broken.slice(0, 8).join("\n"));
    else pass(`${name} sanity`);

    current[name] = Object.fromEntries(inOrder.map((i) => [i, chunkHashes(forward[i])]));
}

// 3. CHANGES against the baseline: which kinds of layer changed, so a change meant only for
// waterfalls doesn't quietly move the boats
console.log("\nChanges against the baseline");
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : null;

if (!baseline) {
    console.log("  no baseline yet, writing one");
    fs.writeFileSync(BASELINE, JSON.stringify(current, null, 1) + "\n");
} else {
    let changedAny = false;
    for (const name of Object.keys(current)) {
        const byTag = {};
        for (const i of inOrder) {
            const before = baseline[name]?.[i] ?? {};
            const after = current[name][i];
            for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
                if (before[key] === after[key]) continue;
                const tag = key.split("#")[0];
                const kind = !(key in before) ? "added" : !(key in after) ? "removed" : "changed";
                byTag[tag] ??= { added: 0, removed: 0, changed: 0 };
                byTag[tag][kind]++;
            }
        }
        const tags = Object.entries(byTag);
        if (!tags.length) {
            pass(`${name} unchanged`);
            continue;
        }
        changedAny = true;
        const summary = tags
            .map(([tag, k]) => `${tag}: ${Object.entries(k).filter(([, n]) => n).map(([w, n]) => `${n} ${w}`).join(", ")}`)
            .join("\n");
        if (update) pass(`${name} updated`, tags.map(([t]) => t).join(", "));
        else fail(`${name} differs`, summary);
    }
    if (update && changedAny) fs.writeFileSync(BASELINE, JSON.stringify(current, null, 1) + "\n");
    if (changedAny && !update) {
        console.log("\n  If these changes are intended, accept them with: npm run check -- --update");
    }
}

const ms = timings.reduce((a, b) => a + b, 0) / timings.length;
console.log(`\nAbout ${ms.toFixed(0)} ms to design and draw a chunk in Node`);
console.log(failed ? "\nSome checks failed" : "\nAll checks passed");
process.exit(failed ? 1 : 0);
