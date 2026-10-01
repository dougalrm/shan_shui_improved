# Changelog

Everything changed since this fork was taken from upstream [Megaemce/shan_shui](https://github.com/Megaemce/shan_shui) at `312ea4e` (the `Baseline` commit, `b66cbbd`). Newest at the bottom of each section; commit hashes link each entry to its full commit message.

**At a glance**

- **Scrolling** is smooth: it runs on the compositor, and generation happens in a web worker.
- **Controls** now include drag and fling, trackpad and wheel panning, a play/pause bar and keyboard shortcuts.
- **The art** reads as a pure-ink Shan Shui painting: ink tones, mist, depth, compositional rhythm, inscriptions and seals, brushwork, and motifs. There is a real night mode.
- **Mountain styles:** Zhangjiajie-like pillars are available with `?style=pillars` or `?style=blend`.
- **More scenery:** seasons (`?season=`), rain (`?weather=`), paths, bridges and drifting clouds.
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
  | D | Dark mode |
  | ? | Shortcut list |
  | Esc | Close |

- **Behaviour:**
  - It plays on load (`PLAY_ON_LOAD` in `App.tsx`).
  - While playing, the controls and cursor fade after 2.5 seconds without input.
  - Auto-scroll speed is now separate from the menu's click step.
  - The menu's auto-scroll checkbox follows Space.
  - Clicking a button doesn't leave it focused, so Space still pauses.
- **Main files:** new `ui/usePanGestures.ts`, `ui/useKeyboardControls.ts`, `ui/Controls.tsx` and `ui/Shortcuts.tsx`; `ScrollEngine.ts` gained `grab`, `dragTo`, `release` and `scrollTo`.

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

---

## Known limits and ideas not yet built

- **Font in downloads:** downloaded SVGs don't embed the calligraphy font. They fall back to an installed Kai font.
- **Waterfall placement:** waterfalls sometimes start partway down a slope rather than at a visible cliff edge.
- **Narrow screens:** the "screen too small" `alert()` is still shown on narrow windows.
- **Snow on trees:** in winter, trees are lightened rather than drawn with snow lying on their branches.
