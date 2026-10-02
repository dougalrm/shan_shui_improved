<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/img/shanshui_logo_light.png">
  <img alt="Shan Shui logo" src="./public/img/shanshui_logo_dark.png" width="200" height="200">
</picture>
<h1>{Shan, Shui}*</h1> 
</div>
<br>

An endless, procedurally generated Chinese ink landscape that unrolls like a handscroll. This is an improved fork of [Megaemce/shan_shui](https://github.com/Megaemce/shan_shui): smooth scrolling, a pure-ink look, scenes, seasons, weather and a night mode. See the [CHANGELOG](CHANGELOG.md) for everything that changed.

<img alt="Shan Shui example" src="./public/img/example.png" width="100%">

The landscape unrolls on its own. Drag it (or flick it) to look around, or use a trackpad, the mouse wheel or the arrow keys. The bar at the bottom pauses it, changes the speed and goes fullscreen, and the controls fade away while you watch. The ☰ button at the top left opens the painting's settings: the seed, the mountains, season, weather and light, a link to copy, and downloads of the view (or five screens of it) as an SVG. ☾ switches to night.

The painting follows the conventions of Shan Shui (山水) ink landscapes: pure ink tones on silk, mist dissolving the feet of the mountains, paler peaks in the distance, scenes that move like a handscroll from wide level water to the near shore, layered valleys and towering massifs crowned by a host peak, moss dots, waterfalls, travellers, fishing boats and geese, and now and then a classical poem inscribed in the sky with a red seal. Night mode paints it by moonlight. The same `?seed=` always paints the same landscape, on any screen.

Painting options, chosen in the settings or the URL (they combine, e.g. `?style=pillars&season=winter`):

| URL | Effect |
| --- | --- |
| `?style=classic` (default) | Rounded Shan Shui mountains |
| `?style=pillars` | Sheer sandstone columns like Zhangjiajie, rising out of mist |
| `?style=blend` | Stretches of pillars among classic mountains |
| `?season=summer` (default) | Pure ink |
| `?season=spring` | Blossom on the deciduous trees |
| `?season=autumn` | Ochre and rust leaves |
| `?season=winter` | A snow scene: washed grey sky, snow-covered mountains, snow on the trees, falling snow |
| `?weather=clear` (default) | — |
| `?weather=rain` | Fine falling rain, paler ink, more cloud |
| `?weather=fog` | Thick mist: the distance fades away, more cloud, banks of fog drifting across |
| `?time=day` (default) | — |
| `?time=dusk` | The sun going down over the far shore, a warm glow on the horizon and the water |
| `?time=night` | By moonlight (without `?time=`, night follows the system's dark mode) |

The URL follows the settings, so the link always paints what is on screen: the same seed and options always paint the same picture. Changing the mountains, season or weather redraws the picture where you are; Back and Forward step through the pictures you painted.

| Key | Action |
| --- | --- |
| Space | Play / pause |
| ← → | Scroll while held (Shift for faster) |
| Page Up / Page Down | Move a screen |
| Home | Back to the start |
| + − | Auto-scroll faster / slower |
| F | Fullscreen |
| H | Hide / show the controls |
| D | Night / daylight |
| ? | List of shortcuts |

## 🏗️ Tech stack

React, TypeScript and SVG. Nothing more! ✨

## ⚙️ Installation

```
git clone https://github.com/dougalrm/shan_shui_improved.git
cd shan_shui_improved
bun install
bun start
```

With npm instead: `npm install --legacy-peer-deps`, then `npm start`.

## 🧪 Checks

`npm run check` checks that the painting is still seamless and shows what a change altered. `npm run shots` and `npm run perf` take screenshots and measure smoothness. See [scripts/README.md](scripts/README.md).

## 📖 Documentation

Generate the API docs locally with TypeDoc (the upstream docs at [megaemce.github.io/shan_shui_docs](https://megaemce.github.io/shan_shui_docs/) describe the original code).

```
bun docs
```

## 📜 Lineage

This is the fourth iteration of the app:

1. Created as a [monolithic JavaScript file](https://github.com/LingDong-/shan-shui-inf) by [Lingdong Huang](https://github.com/LingDong-)
2. [Rebuilt with React 17](https://github.com/RedContritio/shan_shui_inf) by [RedContritio](https://github.com/RedContritio)
3. [Rewritten with React function components, OOP, web workers and dark mode](https://github.com/Megaemce/shan_shui) by [Megaemce](https://github.com/Megaemce)
4. This fork, taken from upstream at `312ea4e`, adds the smooth transform-based scroller, the pure-ink art direction, scenes and journey, seasons, weather and time of day, the settings panel, the checks in `scripts/`, and seeded output that is identical on any screen.

Released under the MIT licence; the original copyright notice is kept in [LICENSE](LICENSE).
