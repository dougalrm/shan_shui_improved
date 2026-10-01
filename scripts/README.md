# Checks and tools

Scripts for working on the painting. They need Node 22 or later. The browser ones also need Google Chrome (set `CHROME_PATH` if it isn't in the usual place) and the app running with `npm start` (set `BASE_URL` if it isn't on `http://localhost:3000`).

| Command | Needs | What it does |
| --- | --- | --- |
| `npm run check` | Node | Type checks, then paints four pictures (every style, season and weather) in Node. It checks that every chunk comes out the same whatever order it's painted in, that no drawing has `NaN` or `undefined` in it, and which kinds of layer changed against `scripts/baseline.json`. |
| `npm run check -- --update` | Node | Accepts the changes: writes the new baseline. Commit it with the change. |
| `npm run check:browser` | Chrome, `npm start` | Checks that the painting in the browser is identical at two window sizes, scrolled two different ways. |
| `npm run stats` | Node | Counts how often each thing is placed over 30 chunks (`--chunks`, `--seed`, `--style`, `--season`, `--weather`). |
| `npm run shots` | Chrome, `npm start` | Saves screenshots along the scroll to `shots/`. You can pass a query (`npm run shots -- "seed=9&style=pillars" --views 8 --size 1280x720`). |
| `npm run perf` | Chrome, `npm start` | Opens a real Chrome window and traces 10 s of auto-scroll. Reports fps, late frames and long tasks. Keep the window visible while it runs. |

## Workflow

1. Before a change, run `npm run check`. It should pass.
2. After it:
   - Run `npm run check` again. Changes should show up only in the kinds of layer you meant to change. If a change meant for waterfalls also moves boats, something leaked into the random numbers.
   - Run `npm run shots` and look at the pictures.
   - If the change touches rendering or how much is drawn, run `npm run perf`.
3. Accept the change with `npm run check -- --update`, then commit the baseline with the change.

`scripts/lib/painting.mjs` runs the same generator as the app's worker (`src/workers/generate.ts`). It transpiles `src/` into `node_modules/.cache` on each run, so there's no build step.
