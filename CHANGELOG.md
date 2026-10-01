# Changelog

Everything changed since this fork was taken from upstream [Megaemce/shan_shui](https://github.com/Megaemce/shan_shui) at `312ea4e` (the `Baseline` commit, `b66cbbd`). Newest at the bottom of each section; commit hashes link each entry to its full commit message.

**At a glance**

- **Scrolling** is smooth: it runs on the compositor, and generation happens in a web worker.
- **Controls** now include drag and fling, trackpad and wheel panning, a play/pause bar and keyboard shortcuts.
- **The art** reads as a pure-ink Shan Shui painting: ink tones, mist, depth, a handscroll's sequence of scenes, inscriptions and seals, brushwork, and motifs. There is a real night mode.
- **Mountain styles:** Zhangjiajie-like pillars are available with `?style=pillars` or `?style=blend`.
- **More scenery:** seasons (`?season=`), rain and fog (`?weather=`), dusk (`?time=dusk`), paths, bridges and drifting clouds.
- **Seeds**: the same `?seed=` now paints the same landscape on any screen. Seeds from before these changes paint different pictures now.

---

## Setup and tooling

### Runs with npm (no Bun needed)
*Part of `11975dc`*

- **What changed:** added `typescript` and `ajv@^8` to `devDependencies`.
- **Effect:**
  - `npm install --legacy-peer-deps` followed by `npm start` now works.
  - Bun used to resolve these packages implicitly and npm didn't, so `npm start` crashed with `Cannot find module 'typescript'` and then `ajv/dist/compile/codegen`.
  - `--legacy-peer-deps` is still needed because `react-scripts` 5 declares TypeScript 4 as a peer dependency.

### .gitignore expanded
*`c8e2ba1`*

- Ignores lockfiles, env files, logs, caches and editor files.

### Checks and tools in `scripts/`
*`d5b02eb`*

- **What changed:** the test scripts used during this work are now part of the repo, as npm scripts (see `scripts/README.md`):
  - `npm run check` runs type checks, then paints four pictures in Node. It checks that chunks come out the same in any painting order and contain no `NaN` or `undefined`, and lists which kinds of layer changed against `scripts/baseline.json` (`--update` accepts the changes).
  - `npm run check:browser` checks that the painting is identical in the browser at two window sizes.
  - `npm run stats` counts placements, `npm run shots` saves screenshots along the scroll, and `npm run perf` measures frame pacing in a real Chrome window.
- **Supporting changes:**
  - Chunk generation moved out of the worker into `src/workers/generate.ts`, so the app and the checks run the same code. The output is byte-identical.
  - `tsconfig.json` gained `skipLibCheck`, as TypeScript's DOM types clash with Node's.
- **Effect:** big changes, like the scene planning that comes next, can be checked for seams, broken numbers, unintended changes and scroll smoothness in a minute.

---

## Performance and scrolling

Six rounds of work took scrolling from jumping in 100px steps to a steady 60fps. Each was measured in Chrome with frame timing and traces.

### Smooth scrolling foundation
*`11975dc`*

- **Before:** every scroll step spawned a web worker per visible layer, replaced the whole SVG, and re-ran the full-screen paper filter.
- **What changed:**
  - Each layer is rendered once and cached.
  - Renders are queued so they can't race or arrive out of order.
  - The canvas only adds or removes the layers that changed.
  - The picture moves with a CSS `translate3d` on its own GPU layer.
  - The paper texture is a separate static layer, painted once.
  - A new `ScrollEngine` animates the position with a critically damped spring.
  - Held arrow keys scroll at a constant speed instead of a 200ms debounce, and are ignored while typing in the menu.
  - Scrolling left past the start stops quietly instead of showing an `alert()`.
  - Reload goes through the same render path as everything else, instead of its own copy.
- **Effect:** scrolling glides instead of jumping.
- **Main files:** `ScrollableCanvas.tsx`, `Renderer.ts`, `Layer.ts`, new `ScrollEngine.ts`.

### Idle-time generation
*`efc7247`*

- **What changed:** building layers and inserting them into the page now happen in spare time between frames, via a new `utils/idle.ts` (`runWhenIdle`).
- **Effect:** the stall while new scenery loaded roughly halved, but didn't go away. This was superseded by the worker below.

### Generation in a web worker
*`a56096d`*

- **Cause found:** each layer build takes 6–30ms on the main thread, too long for a 16ms frame.
- **What changed:**
  - `workers/generator.worker.ts` now designs and builds all layers off the main thread.
  - `Renderer.reset()` replaces the menu poking at the renderer's internals.
  - The per-layer worker blob (`utils/layerWorker.ts`) is removed.
- **Effect:** dropped frames while scrolling fell from 12–21 to 2–3 in a 6-second test.

### Compositor-driven scrolling and sliced insertion
*`5e68f57`*

- **Cause found:** moving the picture from JavaScript every frame forced a full main-thread frame each time, so any main-thread work delayed the scroll.
- **What changed:**
  - `ScrollEngine` now plans the motion and hands it to the browser as a Web Animation, which runs on the compositor thread.
  - New layers are added in ~16KB slices instead of whole ~180KB layers.
- **Effect:** at 4× slowed CPU, the worst frame went from 78ms to 32ms. Main-thread frames fell from 566 to 110 per 10 seconds.

### One `<svg>` per layer
*`50d2d24`*

- **Cause found:** with the whole picture in a single `<svg>`, adding any slice repainted all ~50,000 elements (25–40ms of paint).
- **What changed:** each layer is now its own `<svg>` inside a moving `#World`.
- **Effect:**
  - In a visible Chrome window, late frames went from 9 (worst 81ms) to 1 (at startup).
  - Rendering is pixel-identical to before.
  - The once-a-second 60ms freezes in the user's trace were caused by the LastPass extension scanning the page, not by the app.

### Memory stays flat on long scrolls
*`276751c`*

- **Cause found:** a new `npm run soak` scrolls 200 screens and samples the page's heap. It grew about 3 MB per screen (79 MB, then 623 MB after 200 screens) while the DOM stayed the same size. The renderer kept the markup of every chunk it had ever made, about 1.5 MB each.
- **What changed:** chunks more than 4 behind the visible ones are forgotten. A chunk is painted the same every time, so scrolling back regenerates it identically (checked: 80 layers in common, none different).
- **Effect:** the heap stays at 25–45 MB however far it scrolls, so the painting can run for hours as a screensaver. Nothing drawn has changed.

### The first view appears sooner
*(see git log: "Show the first view before the chunks ahead")*

- **Cause found:** at the start, and after changing the mountains, season or weather, nothing was shown until all six chunks in the lookahead range were drawn (about 80ms each), though the screen needs only the first two or three.
- **What changed:** when the page is empty, the view's own chunks are shown first, then the ones ahead are filled in. The loader hides as soon as the first view is on screen.
- **Effect:** the first layer appears after about 500ms instead of 760–840ms (a Chrome page load in `npm run soak`). The layers are identical (`npm run check:browser`), and scrolling stays at 60fps.

---

## Controls

### Drag, fling, play/pause and keyboard shortcuts
*`ca4fa2d`*

- **Pointer:**
  - Drag the picture (mouse, pen or touch) to pan.
  - A flick keeps it gliding while it slows to a stop.
  - Trackpads pan directly.
  - Mouse-wheel notches ease smoothly.
  - Vertical wheeling pans sideways.
- **Control bar at the bottom:**
  - Back to start, slower, play/pause and faster, with a speed readout (0.25×–4×).
  - Fullscreen and a `?` shortcut list.
- **Keyboard:**

  | Key | Action |
  |---|---|
  | Space | Play / pause |
  | ← → | Scroll while held (Shift for 3×) |
  | Page Up / Page Down | Move a screen |
  | Home | Back to the start |
  | + / − | Auto-scroll speed |
  | F | Fullscreen |
  | H | Hide or show the controls |
  | D | Dark mode (now night / daylight, see the settings panel) |
  | ? | Shortcut list |
  | Esc | Close |

- **Behaviour:**
  - It plays on load (`PLAY_ON_LOAD` in `App.tsx`).
  - While playing, the controls and cursor fade after 2.5 seconds without input.
  - Auto-scroll speed is now separate from the menu's click step.
  - The menu's auto-scroll checkbox follows Space.
  - Clicking a button doesn't leave it focused, so Space still pauses.
- **Main files:** new `ui/usePanGestures.ts`, `ui/useKeyboardControls.ts`, `ui/Controls.tsx` and `ui/Shortcuts.tsx`; `ScrollEngine.ts` gained `grab`, `dragTo`, `release` and `scrollTo`.


### The painting's settings panel
*`0ba06cc`*

- **The problem:** the old menu (☰ at the top left) mostly duplicated other controls or was hard to use:
  - a position readout with a step box and ◀ ▶ buttons;
  - an Auto-scroll checkbox, the same as play/pause;
  - start/end number boxes, "Auto-load" and "Import current range", just to download;
  - Reload behind a confirm dialog.

  The painting's own options could only be set by editing the URL.
- **The new panel** is behind the ☰ button:
  - **Seed:** type any word or number and press Enter (or Paint), or click New for a fresh landscape.
  - **Mountains, Season, Weather and Light:** a row of buttons each. Changing the mountains, season or weather redraws the picture where you are (no jump back to the start). Changing the light only restyles it.
  - **Copy link** confirms in place rather than with an alert.
  - **Download view** and **Download ×5** (five screens from here on) save an SVG named `shan-shui_<seed>_<start>-<end>.svg`.
  - A credit links to the original project.
- **The URL follows the panel** (`replaceState` for options, a new history entry for a new seed), so the link always paints what is on screen. Back and Forward now move between the pictures you painted.
- **Night is one of the lights:** `?time=night`. Without `?time=`, it follows the system's dark mode. The ☾ button and D toggle night and the light before it. Night is now a body class only; the per-element `darkmode` classes are gone.
- **Removed:**
  - the edge ◀ ▶ scroll buttons and the top-right GitHub button (dragging, the wheel, the keys and the bottom bar cover scrolling);
  - the old `SettingPanel`, `Menu` and their interfaces.
- **Works at night and on phones:** the panel inverts with the night palette and wraps to fit narrow screens.

---

## Art (pure ink Shan Shui)

The goal was for the app to read as a Shan Shui ink painting rather than line art. Pure ink (水墨) is the default style.

### 1. Ink tones and a real night mode
*`2cefbda`*

- **What changed:**
  - Every colour now becomes an ink class via `utils/ink.ts`:
    - `f`/`s` classes: translucent ink fill/stroke in 50 strengths.
    - `w`/`v` classes: opaque washes.
    - `fp`/`sp` classes: silk-coloured fill/stroke.
  - The classes take their colours from CSS variables (`--ink`, `--silk`, `--paper-light`).
- **Effect:**
  - Palettes switch instantly without regenerating the picture, and the markup is much smaller.
  - Night mode is pale ink on dark silk instead of an inverted photographic negative.
- **SVG download:**
  - The file now carries its palette.
  - The paper texture covers exports that don't start at 0 (a bug before).
  - It uses a Blob URL, since large pictures overflowed the old data URL.

### 2. Quick wins
*`fb0368d`*

- **Moss dots (苔点):** short, flat dark dabs along ridges, rocks and hills.
- **Outlines:** a little darker, for more tonal range.
- **Water:** mostly bare paper now, with a few ripples fading from the shore instead of dark stripes.
- **Pylon:** the electricity pylon is removed.

### 3. Scaled to the window
*`1976e22`*

- **What changed:** the painting (designed about 900 units tall) scales to the window height.
- **Effect:**
  - Every window shape shows the same composition, including tall screens and phones.
  - Positions, speeds, ranges and downloads stay in the painting's own units; only the display is scaled.

### 4. Deterministic chunks and compositional rhythm
*`86cf618`*

- **Deterministic chunks:**
  - The world is built in fixed 1000-unit chunks, each seeded from `seed#chunk`.
  - The same seed therefore paints the same landscape on any screen, whatever the scroll order. This was verified byte-for-byte.
  - The seed hash is now `cyrb53`. The old one overflowed and could collide.
- **Rhythm:**
  - A slow "intensity" curve moves the scroll between open water with a few boats, rising hills, and massifs crowned by a host peak (主峰).
  - Host peaks are at least 3000 units apart.
- **Seeds:** existing seeds paint different pictures from this point on.

### 5. Mist and depth
*`78a4079`*

- **Mist:** every middle mountain rises out of mist, drawn as a soft silk-coloured radial fade over its foot. It separates near and far planes, and villages and forests fade into it.
- **Depth:** distant mountains get down to 50% of the ink (atmospheric perspective, via `withInkStrength`).

### 6. Inscriptions and seals
*`d5f1432`*

- **Poems:**
  - Classical landscape poems (public domain, e.g. Liu Zongyuan's *River Snow*, Wang Wei, Li Bai, Su Shi), in vertical columns read right to left.
  - Each has a signature column and a red cinnabar seal (e.g. 卧游, 山水清音, 林泉高致).
- **Placement:** in open sky, clear of mountains, roughly every 7000–10000 units.
- **Font:** Ma Shan Zheng (SIL OFL) from Google Fonts.

### 7. Brushwork
*`f69cc7b`*

- **What changed:** strokes now have smooth pressure swell, brush grain, a heavier entry that tapers out, and dry-brush lifts (飞白) on long strokes.
- **Seeds:** pictures change again from this commit (still deterministic).

### 8. Motifs
*`47414c7`*

- **Waterfalls:** two-tier waterfalls (叠泉) on host peaks, falling into the mist.
- **Geese:** flocks in open sky.
- **Travellers:** figures with staffs on foreground hills, sometimes with an attendant.
- **Moon:** at night the moon stays fixed while the landscape passes in front of it.

### 9. Zhangjiajie pillars as a URL variant

- **How to choose:** `?style=pillars` or `?style=blend`. Classic stays the default, and there is no on-screen toggle.
- **Pillars:**
  - Each mountain position in the plan becomes a cluster of 2–6 sandstone columns, in ranks. Back columns are paler and rise out of a band of mist between the ranks.
  - Each column has ragged, stepped, slightly leaning sides with ledges, a rounded summit crowned with pines and moss dots, and pines clinging to ledges.
  - It also has short vertical fissures, axe-cut shading down the shadow side, and faint rock bands.
  - Widths range from needles to broad blocks, and summits sit at every height.
- **Distant skyline:** in pillar country it steps between flat-topped columns instead of rolling.
- **Blend:** a slow noise marks out stretches of "pillar country", so columns come in regions rather than one here and there.
- **Unchanged:** foreground hills stay classic in every style. Classic pictures are byte-identical to before (all 173 layers checked across four screens).
- **Links:** the style is part of the link. Opening `?style=pillars` alone gets a fresh seed that keeps the style, Reload and Share keep it, and an unknown style falls back to classic.
- **Main files:** new `utils/style.ts`, `classes/layers/PillarLayer.ts`, `classes/structures/Pillar.ts` and `classes/structures/Mist.ts` (the foot mist, now shared). `withInkStrength` now multiplies when nested.

### 10. Waterfalls fixed
*`7974e76`*

- **Before:** the two-tier waterfall set its lower drop to one side. With a nearer mountain in front, that drop could sit on top of it and read as a second waterfall hanging in the air.
- **Now:** one continuous fall from a lip of rock, ending in the mist at its own mountain's foot.
- **Seeds:** this changes classic pictures.

### 11. Pillars laid out like the real Wulingyuan peak forest
*`7014472`*

Research on how the landscape formed gave three rules:
- **Common summit level:** the pillars were carved from one plateau, so nearby summits sit near a common height.
- **Erosion stages:** from the high ground down to the valleys, the land runs from flat-topped mesas, to peak walls, to pillar forests, to low remnant peaks.
- **Joint lines:** vertical joints line the pillars up in rows and fins, with narrow gorges between them.

What `PillarLayer` now does with them:
- **Stages:** it picks a stage from the landscape's intensity.
- **Groups:** columns stand in groups along joint lines, sharing a summit level, with misty gorges between the groups.
- **Ranks:** back ranks are smaller, higher and paler, and rise out of forest canopy and mist.
- **Arches:** a natural stone arch occasionally bridges two columns, like the "First Bridge Under Heaven".
- **Columns and density:** columns are sturdier, with thickly wooded summits. Pillar country is airier, and its ranks spread into the foreground.
- **Classic:** unchanged by this commit.

### 12. Paths and bridges
*`d8eb825`*

- **Paths:** faint, broken switchback footpaths climb some classic mountains.
- **Bridges:** foreground hills with a small gap between them are joined by a humped stone arch or a plank bridge on piers, sometimes with a traveller crossing.

### 13. Drifting cloud bands
*`2a03cd6`*

- **Bands:** long soft bands of cloud lie across the massifs at mid-height, over classic mountains and pillars.
- **Motion:** each drifts slowly at its own pace, animated by the compositor and off for reduced motion.

### 14. Seasons and weather
*`4dfeb84`*

- **How to choose:** `?season=spring|autumn|winter` and `?weather=rain`, defaulting to summer and clear. They combine with `?style=`, and links, Share and Reload keep them.
- **Winter:**
  - Painted the way ink painters paint snow. The sky and water are washed grey (`--ground`), so the mountains, left as bare silk, read as snow-covered, with dark rocks and moss showing through.
  - Textures are lighter, deciduous trees bare, and foliage lightened.
  - Snow falls, and mist and clouds are thinned (`--mist`) so they don't glow against the grey.
- **Spring:** blossom pinks on the deciduous trees, as twig blossom and tinted foliage wash.
- **Autumn:** ochre and rust leaves, half-mixed into the ink wash so the shading stays.
- **Rain:** fine slanting rain, paler ink, a greyer light and more cloud.
- **How the effects are drawn:** falling snow and rain are two parallax sheets with repeating masks, coloured from the palette and moved by the compositor. They're still for reduced motion.
- **Mist:** it is now a soft ellipse fading on every side, so it has no edge against a washed sky. This slightly changes the mist in every style.
- **Seeds:** summer and clear weather paint exactly what they did before this commit, apart from the mist shape.

### 15. Boats on open water, visible rain
*`7e15bb0`*

- **Boats:**
  - **The bug:** the collision check used boxes extending *down* from each mountain's base, but mountains rise *up* from it. About one boat in five was placed in front of a mountain, which hid part of it and left the rest looking stranded on the slope.
  - **The fix:** boats are now checked against the real shape of the mountains, in this chunk and the chunks either side. None now land on a mountain.
- **Rain:** it was being drawn, but it was too fast and faint to see in motion. It now falls at about half the speed and nearly twice as dark, with longer, thicker drops.

### 16. Open water wash
*`269ba0a`*

- **The problem:** sky and water were both bare silk, so the water blended into the paper everywhere except winter.
- **The wash:** a pale wash now covers the water, from the far shore down. The far shore is the line the distant mountains stand on, about 230–280 units down. The wash fades in over that band so the uneven shore has no hard edge, and it is a little deeper towards the far shore.
- **Where it shows:** mountains hide it where they stand, so they read as islands. Mist and cloud bands (silk-coloured) now show as pale veils over the water.
- **Palettes:** day, night and winter each have their own water colours (`--water-far`, `--water-near`). Winter water is darker than its snowy sky, as in classic snow scenes.
- **Downloads:** exports include the wash.

### 17. Grounded bridges, waterfalls set into the rock
*`74313fe`*

- **Bridges:**
  - **The bug:** a bridge could join hills in different depth rows, sitting at their average height, so it floated above one hill and below the other.
  - **The fix:** bridges now only join hills in the same row. They sit at the shared foot, near the ends of the hills where they come down to the water, with a rock bedding each end into its bank.
  - **Frequency:** there are fewer of them, about 2–4 per 40,000 units.
- **Waterfalls:** these used to start at a dark bar in the middle of a slope, as two parallel lines. Now each one:
  - emerges from a faint V-shaped gully climbing towards the ridge;
  - pours between dark boulders and moss, narrow at the top and spreading as it falls;
  - is set into the rock by short dark strokes down both banks;
  - has edges that grow fainter and more broken until it disappears into the mist.

### 18. Lighter mist, season colour, calmer paper
*`e696224`*

- **Mist:** the mist at mountain feet is about 25% more transparent, so the bases no longer wash out. Cloud bands keep their own strength.
- **Season colour:**
  - A faint haze of the season's colour lies along the horizon, and the water takes a slight tint: jade in summer, peach-pink in spring, amber in autumn, cool grey-blue in winter, and a moonlit grey at night.
  - Both are kept subtle (`--horizon`, `--water-far`, `--water-near`).
- **Paper:** the paper texture used to be a filter fixed to the window while the painting slid beneath it. It is now two layers:
  - a flat paper tint that stays put, which is uniform so nothing appears to move;
  - the grain, which is gentler and finer, drawn as a seamless tile that scrolls with the picture. It sits on a strip three windows wide that re-anchors to whole tiles, so it never jumps.
- **Downloads:** exports use the gentler texture too.

### 19. Waterfalls you can actually see
*`bf33803`*

Counting them in the generator showed only 4 waterfalls in 12 chunks, all small (falls of 51–190 units, about 10 wide) and faint.

- **Where they start:** in a saddle of the ridge, the dip between peaks where water would gather, high enough above the foot for a long fall. If a mountain has no saddle, a waterfall starts just below the high point instead. Very short drops are skipped.
- **How often:** on 30% of tall mountains, up from 12%, and on 90% of host peaks.
- **How they look:** they are wider (12–18 units, 1.4× on host peaks) and framed by darker washes of rock on both banks, fading down the fall, so the white water stands out the way ink painters frame it. The edges are firmer too.
- **Result:** 7 waterfalls in the same stretch, falling 95–225 units, and clearly visible.

### 20. Pavilions in proportion, on their hills
*`29637c3`*

The thatched pavilions (茅亭) on foreground hills read as shacks.

- **What was wrong:**
  - **Size:** each was about as big as a hilltop, roughly three times the height of the figures inside, which were drawn the same size whatever the pavilion's size.
  - **Placement:** each was placed at a random point across the hill's flat top without allowing for its own width, so platforms and railings hung off the edge.
  - **Frequency:** at a 25% chance per hill, three could end up side by side.
- **What changed:**
  - **Size:** pavilions are about a third smaller (44–58 tall, 76–100 wide). The figures inside scale with them, and the roof hatching thins with the size, so a small roof isn't a dark mass.
  - **Placement:** a pavilion only goes where the flat top is wide enough to hold it, and stays within it.
  - **Frequency:** the chance per hill is now 15%.
  - **Other figures:** travellers and figures crossing bridges are drawn at the same smaller scale.

### 21. Waterfalls stay on their mountain
*`f0d2873`*

- **What was wrong:** on mountains without a saddle, a waterfall started at the summit and its gully lines climbed above the peak into the sky. The darker rock beside the water was a uniform band, so falls read as vertical stripes.
- **Where they start:** water no longer comes off a summit. Without a saddle, a fall emerges from a cleft well down the face, below the high point.
- **The gully:** it is clipped so it always stops just below the ridge.
- **The rock beside the water:** broken, irregular patches of wash with varying width and strength, fading down the fall, like brushwork.
- **How often:** on 45% of tall mountains (was 30%) to make up for the stricter placement.

### 22. Waterfalls cascade down the slope
*`d11aff5`*

- **The problem:** straight drops only make sense off a cliff edge. On a slope they didn't sit right, and the gully above the source read as stray lines.
- **The course:** the water now follows the ground. Starting at the saddle, or below the high point if there isn't one, its course is traced down through the mountain's nested ridges, drifting sideways at each and only ever going downhill. It is then smoothed so it meanders rather than zigzags.
- **The stream:** a ribbon of bare silk along that course, widening as it goes and spilling over 2–4 small rounded rock lips.
- **The banks:** framed by the broken rock patches and bank strokes as before.
- **The source:** the gully lines are gone. Dark boulders mark where the water rises.

### 23. More boats on the water
*`e753eac`*

- **The problem:** boats had become rare: 20, 14 and 4 per 30 chunks on seeds 7, 3 and abc. Two earlier changes compounded. The chance had been cut to avoid fleets, and then the open-water check rejected more spots, leaving massif-heavy stretches with almost none.
- **The chance:** raised everywhere, more on quiet open water, and capped at four boats per chunk so fleets can't return.
- **Result:** 36, 29 and 9 on the same seeds, still none on a mountain. Seed abc stays lower because it is mostly massifs with little open water.
- **Drawing order:** boats are now drawn after the mist and cloud bands, so a boat near a mountain's misty foot stays crisp. Since they only go on open water, they never overlap a mountain.

### 24. Four kinds of boat
*`3d35179`*

There used to be one boat: a skiff with a crouching fisherman. Now there are four river craft from classical painting, all on the same hull and in the same ink:

| Boat | Share | What it shows |
|---|---|---|
| Fisherman's skiff | 40% | A fisherman crouched with his rod, as before |
| Sampan (篷船) | 25% | An arched woven-mat canopy amidships, with a boatman sculling a long oar at the stern |
| Sailing junk (帆船) | 15% | A mast with a battened sail, a figure at the helm, and a faint wake |
| Punt | 20% | A boatman standing at the stern pushing a long pole into the water. 60% carry a seated passenger in a broad hat, with a faint wake |

### 25. A near bank joins the foreground hills
*`f1eb1cb`*

- **The problem:** the foreground hills stood in open water right to the bottom of the picture, so they read as isolated islands, out of place.
- **The bank:** a new "bank" layer (`BankLayer`) runs along the front of the whole picture. It is low ground, as in Shan Shui foregrounds, that the near hills now stand on, so they read as one continuous shore. Hills further back stay as islands in the lake, which keeps the depth.
- **Its shape:**
  - The shoreline rolls gently, with a finer irregular edge on top (`config.layers.bank`).
  - Now and then it falls away into an inlet where the water comes right to the front.
  - It is a smooth function of position alone, so it is seamless across chunks and the same for a given seed.
- **Its detail:** the water's edge is drawn as broken brush strokes of varying weight, with short strokes sloping down to show the bank shelving into the water. There are a few faint ground lines, reed tufts and pebbles at the edge.
- **Drawing order:** it is drawn in front of the water, boats and the feet of the middle mountains, and behind the foreground hills.

### 26. Real pavilions, a wooded foreground
*`62fd3a0`*

- **Pavilions:**
  - **The problem:** the pavilion roof was a cone of hatched lines, which read as a haystack or tent.
  - **The redraw:** it now has a proper thatched pavilion (茅亭) form: a square floor with a low railing, four slender posts (the far two fainter), and a pyramidal roof with concave slopes, eaves turned up at the corners, light thatch lines and a small finial. The seated figures sit between the posts.
- **Foreground trees:**
  - **The problem:** the near bank felt empty.
  - **The groves:** clumps of small trees and shrubs now grow along it, mixing pines, conifers and low bushes.
  - **Their layout:** clumps are tightly gathered, with irregular open stretches between them, and none in an inlet. Within a clump, nearer trees sit lower on the bank and are larger and darker; ones towards the water are smaller and paler. Now and then a taller tree stands out.

### 27. A far shore and sandbars
*`98aca4c`*

- **The problem:** past the occasional distant mountain the lake opened into wide, empty water.
- **Far shore:** a new "farShore" layer (`FarShoreLayer`) adds low, pale strips of distant land along the horizon, between and in front of the distant mountains. They roll into low hills with smaller bumps and carry tiny dots of far-off trees. The shore comes and goes rather than running on, covering about 60% of the horizon (`config.layers.farShore.cover`). Like the near bank, it is a smooth function of position, so it is seamless and the same for a seed.
- **Sandbars:** a new "sandbar" layer (`SandbarLayer`) adds long, low spits of sand (平沙) with reeds, lying on the open water.
  - **Placement:** each chunk gets two attempts, more likely in quiet stretches, kept clear of mountains and of each other.
  - **Frequency:** 7–13 per 30 chunks.
  - **Boats** keep off them.

### 28. The scroll moves through scenes
*`a4f93f6`*

- **The problem:** a single noise curve set the pace. It drifted between busy and quiet but never built to anything, and its quiet stretches were mostly empty water.
- **Scenes:** a new `Scenes` class (`src/classes/Scenes.ts`) plans the scroll as a sequence of scenes, after Guo Xi's three distances (三远):
  - **Level** (平远): wide water seen across to the far shore, with low distant ranges, sandbars and boats.
  - **Near:** the foreground comes forward, with more hills and groves on a higher near bank.
  - **Deep** (深远): ranges layered one behind another, back into the distance.
  - **High** (高远): a crowded massif that climbs to its host peak, with cloud bands.
- **The order:** like a handscroll, it opens quietly on level water, then alternates tension and release. A high scene is followed by level water or the near shore, and deep ranges usually build up to a high scene (`config.scenes.next`). Scenes last about 1.5 to 5 chunks (`config.scenes.length`).
- **Smooth changes:** each scene sets a profile (`config.scenes.profiles`) covering:
  - how built up the landscape is, with an arc rising to the middle of the scene;
  - how many middle ranges there are, how far back they're layered, and how tall they are;
  - how many foreground hills there are, and where the near shoreline runs;
  - how much far shore there is;
  - how many sandbars, boats and cloud bands appear.

  Profiles blend over 800 units at each border. The near bank and far shore read them too, so they change gradually, without seams.
- **Determinism:** the sequence only depends on the seed (it uses its own hashed random numbers), so it is the same from any chunk.
- **Lighter chunks:** each spot now stacks at most 7 mountains, spread over its depth, where it used to stack up to 16 that mostly hid behind each other. Mountains also get rarer as a chunk fills up. So even a massif's climax stays under about 4 MB of SVG, where some chunks used to reach 6 MB.
- **Effect:**
  - The scroll now has a shape: quiet openings, near shores, layered valleys and climaxes.
  - The quiet stretches have low ranges and islands in them rather than wide empty water.
  - Seeds paint different pictures from before this change.
- **Tools:**
  - `npm run stats` lists each picture's scenes.
  - `npm run shots` now steps one page at a time and prints where each view starts. It used to skip about 1,000 units between views.

### 29. A journey through the landscape
*`c84f827`*

- **The problem:** people and buildings were scattered at random, so the scroll had no thread to follow through it.
- **A road and travellers:** a faint, broken road now runs along the near bank and stops at inlets. Now and then a traveller with a staff walks it, sometimes followed by a young attendant. They are most frequent in the near scenes (`config.layers.bank.travellerChance`).
- **Villages:** on the near bank, mostly in the near scenes, a few thatched houses stand by the road with trees behind them, a haystack and a low fence (`villageChance`). The groves leave room for them.
- **Temples:** a new `Temple` structure appears up the valleys of the deep scenes, on a lower ridge of a mountain in the middle distance (`templeChance`). It has:
  - a two-storey main hall on the highest terrace, with side halls stepping down in front;
  - sometimes a pagoda beside it;
  - pines around it, terrace walls, and mist across its lower half.

  A path always climbs to its gate from the foot of the mountain.
- **Ridge pagodas:** pagodas now stand on a shoulder of the ridge of tall mountains, mostly in the high scenes, as a landmark (`pagodaChance`). The old 2% chance of a pagoda on any mountain remains.
- **Pavilions** are most likely on the foreground hills by level water. Travellers on the hills follow the scenes too.
- **How:** each scene's profile gained `temple`, `pagoda`, `village`, `pavilion` and `travellers`. These scale the chances above and blend across borders like the rest.

### 30. Texture strokes that suit the rock
*`13883fc`*

- **The problem:** every mountain was modelled with the same strokes along its contours, whether it was a soft rounded hill or a sheer cliff.
- **Two classic texture strokes (皴法):** a new `Cun.ts` provides two kinds:
  - **Hemp-fibre (披麻皴):** long, soft, slightly wavering lines in parallel bundles. They run from just under a ridge a long way down the slope's fall line (`HempFibre`).
  - **Axe-cut (斧劈皴):** short, broad, angular wedges dragged slanting across the fall line, as with the side of the brush. They are stacked in clusters down the faces, mostly on the shadow side (`AxeCut`, and `CliffAxeCut` for cliff faces).
- **Chosen by the rock:**
  - **Middle mountains** measure how steep their drawn ridge really is (most rise well short of their nominal height). Rounded ones get hemp-fibre, steep ones get axe-cut, and those in between get a mix. Hemp-fibre mountains also have fewer of the old contour strokes.
  - **Pillars** now carry axe-cut wedges down their shadow faces, as sandstone cliffs are painted, among fewer of the short vertical strokes.
  - **Foreground rocks** taller than 80 get a few axe-cut clusters.
- **Effect:** the mountains read as different kinds of rock, and the texture follows the slope rather than wrapping round it. Chunk weight is about the same (the heaviest is about 4 MB).

### 31. An old pine or a boulder frames the view
*`191dd2a`*

- **What changed:** a new "framing" layer (`FramingLayer`, drawn in front of the foreground hills) places one of three things in the very front, cut off by the bottom edge:
  - an old pine (古松);
  - a great boulder with grass and shrubs on top;
  - a pine rising behind a boulder.
- **The pine:** a new `OldPine` has a gnarled, leaning trunk with a shadow-side wash and rounded bark plates. Long branches reach out sideways and end in flat pads of needle wheels.
- **Placement:** `Designer.wantsFraming` uses noise peaks, so framing pieces are never in neighbouring chunks. They come most readily in near scenes (about one per 3–4 chunks) and rarely by level water (scene profile `framing`, `config.designer.framing.threshold`).
- **Effect:** the near distance now has depth, a classic way to push the landscape back.

### 32. Snow on the branches, fog and dusk
*`d89d382`*

- **Snow on the branches:** in winter, snow now lies on the trees as ink painters paint it, by leaving it unpainted. A new `utils/snow.ts` helps with this:
  - **Leaves and needles:** the pines and conifers on the mountains and the bank (`Tree01`, `Tree03`) get a lid of bare silk on each leaf. It is thickest in the middle and thins to nothing at the ends, so the dark undersides still show (`snowCap`).
  - **Twigs:** the bare twigs carry a ridge of snow (`snowLine`), so the winter pines on the foreground hills look snow-laden.
  - **Old pines:** the framing pines get snow on their branches and needle pads.
  - **Weight:** shapes too small for snow to show get none, which keeps winter chunks as light as summer ones. Only winter pictures change.
- **`?weather=fog`:**
  - The ink is lighter, and the distance fades much faster (a steeper depth curve), so ranges dissolve one behind another.
  - There are more cloud bands, as in rain, and a pale, damp palette with thick mist.
  - Wide, soft banks of fog drift slowly across the middle distance, as compositor animations that cost nothing.
- **`?time=dusk`:**
  - A pale vermilion sun sits low over the far shore in a soft glow. It is hidden at night, when the moon is up.
  - There is a warm glow along the horizon and on the water, and the paper is warmer.
  - It combines with every other option.
- **Checks:** a fifth check picture covers fog and dusk. Frame pacing is unchanged with the fog banks drifting (60 fps, no late frames).

---

## Known limits and ideas not yet built

- **Font in downloads:** downloaded SVGs don't embed the calligraphy font. They fall back to an installed Kai font.
- **Waterfall placement:** waterfalls sometimes start partway down a slope rather than at a visible cliff edge.
- **Narrow screens:** the "screen too small" `alert()` is still shown on narrow windows.
