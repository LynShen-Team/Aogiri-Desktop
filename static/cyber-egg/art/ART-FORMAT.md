# 赛博鸡蛋卡面资产格式（lynshen-cyber-egg-art v1）

One bundle of 赛博鸡蛋 card art, exported from the gateway's web card and read by every client (the phone app, the
desktop app). Nobody edits it by hand: change the web card, then export again.

## 从哪来、怎么导出

- Source: monoizeovo `frontend/src/pages/cyber-egg/card` (`card3d.tsx`, `frame*.ts*`, `foil.tsx`, `layer.tsx`,
  `artworks/*`, `card-back.tsx`, `pack-art.ts`, `cards.ts`, `tiers.ts`) and the `.ce-*` CSS in `frontend/src/index.css`.
  `manifest.json → source` records the repo, the commit and whether those files had uncommitted changes.
- Exporter: aogiri `scripts/cyber-egg/export-art.ts` (helpers: `serialize-dom.ts` runs in Chrome, `svg-tools.ts`,
  `verify-page.ts`), run through `export-art.sh` from the aogiri repo root:

  ```
  scripts/cyber-egg/export-art.sh --frontend ~/lynshen-wt/gw-cyber-egg-g94/frontend --out assets/cyber-egg/art \
    --copy ~/lynshen-wt/deliverables/网关/赛博鸡蛋/卡面资产
  ```

  | argument | meaning |
  |---|---|
  | `--frontend <dir>` | the monoizeovo `frontend` to export from (with its `node_modules`: `npm ci` there once) |
  | `--out <dir>` | where the bundle goes (the folder is replaced); default `assets/cyber-egg/art` |
  | `--copy <dir>` | also copy the bundle to `<dir>/art` and this file to `<dir>/ART-FORMAT.md` (repeatable) |
  | `--verify <dir>` | check images; default `deliverables/网关/赛博鸡蛋/手机端-实现/导出核对/` |
  | `--work <dir>` | scratch (page build, `dump.json`); default `$TMPDIR/cyber-egg-export` |
  | `--from-dump <file>` / `--no-verify` | rewrite the bundle from an earlier `dump.json` / skip the check images |

  Prerequisites: `bun` (`~/.bun/bin/bun`), Google Chrome, Playwright (env `PLAYWRIGHT=<…/playwright/index.mjs>`,
  default the copy in `~/lynshen-wt/gw-creator-program/frontend/node_modules`; env `CHROME=<executable>` for another
  Chrome). `export-art.sh` takes the machine's heavy-job lock `~/lynshen-wt/heavy.lock` (waits while another job has
  it, always releases it). A run takes about two minutes.

  It renders every card (all packs and each pack's 典藏 card) with `live={false}` in Chrome and serialises the live
  DOM, so pictures drawn by script and CSS animations frozen at their first frame are captured as the web shows a
  still card. The check images are: `<card>-白天/夜间.png` (left the web card, right the exported pieces composed
  flat as a client would), `背面和卡包.png`, `缩略图核对.png` (every thumbnail cut from its sheet by the manifest).
- Copies: the phone app keeps the bundle at `assets/cyber-egg/art/`; the desktop app takes it from
  `deliverables/网关/赛博鸡蛋/卡面资产/art/` (this file sits next to it). Copy the whole folder as is.

## 坐标和单位

Everything is in **card units**: a card is 300 × 420. The web sizes things in `cqw` of the card: 1cqw = 3 units.

| geometry | value |
|---|---|
| card | 300 × 420, corner radius 13.2 (4.4cqw) |
| window (the picture) | x 24, y 24, 252 × 278, radius 5 |
| plane box (`planeBox`) | x −12.6, y −13.9, 277.2 × 305.8 in **window units** (the window plus 5 % bleed each side) |
| clipped plane | clipped to the window rect (0, 0, 252, 278 in window units), radius 4.8 |
| perspective | 1100 px on a ~300 px card → 3.667 × card width |

Window units = card units with the origin moved to the window's top-left corner (24, 24).

## 文件

```
manifest.json            the index (below)
README.md                this file
svg/cards/<id>-<i>.svg   picture plane i of card <id>, far → near; viewBox = the plane's box (window units)
svg/frames/<tier>-<period>.svg   the frame of a card face (viewBox 0 0 300 420)
svg/grounds/<tier>.svg   the security print of the paper, transparent elsewhere (viewBox 0 0 300 420)
svg/backs/<period>.svg   the card back over its paper: halo, guilloché, frame, emblem, text (viewBox 0 0 300 420)
svg/wrappers/<period>.svg  the pack's printed wrapper (viewBox 0 0 345 500, preserveAspectRatio none)
png/grain-{light,dark,back}.png  paper grain tiles, 105 × 105 units at 2 px/unit, seamless (stitched noise)
png/shadows/<id>-<i>.png the cast shadow of plane i (0.5 px/unit), placed at `planes[i].shadow.box`
png/card-shadow.png      the card's soft shadow at rest (black alpha; tint and fade it), box in manifest
jpg/thumbs-p<period>.jpg the pack's cards flat at rest, 345 × 483 px each, 4 a row (for grids)
app/pack<period>.json    { "<file>": "<content>" } for the pack's plane SVGs and shadow PNGs (data: URLs)
app/face.json            the same for frames, grounds and backs
app/wrappers.json        the same for wrappers
```

The paper colour and its grain are not in the ground and back SVGs: paint the colour (`tiers[tier].ground`,
`packs[].back.ground`), lay the grain tiles over it, then the SVG — the web's order.

### SVG rules (all files)

Self-contained and safe for react-native-svg 15 (`SvgXml`): no `<style>`, classes, CSS variables, `currentColor`,
filters, `mix-blend-mode` or `textPath`. Every colour, opacity and stroke is a plain attribute; the
defs a picture uses are inside it; ids are unique per picture (and across the bundle); numbers have ≤ 2 decimals;
path data is relative. Text has one position per glyph (`<tspan x="x1 x2 …" y="…">`), so a device font with other
metrics still puts each glyph where the web put it; families are `Georgia`, `Times New Roman`, `Songti SC`,
`Courier New`, `Menlo` (map them to what the platform has, e.g. `serif` / `monospace` on Android). Text may contain a
bare `&` (react-native-svg reads no entities): escape it before giving a file to a strict XML parser.

Gradients: react-native-svg ignores `spreadMethod`, so a reflect / repeat gradient has its stops laid out over the
whole picture (the attribute stays, for readers that honour it; beyond the stops nothing is drawn).

**Foil** (`<linearGradient data-foil="w h k" gradientUnits="userSpaceOnUse">`): the metal of foil-stamped lines. On
the web it slides as the card turns: `gradientTransform="translate(x·w·k y·h·k)"` for the tilt (x, y) ∈ [−1, 1]²
(web card3d.tsx). Its stops already reach that far, so a client may set that transform as it is (frames: w h = 300
420, k .42; pictures: 252 278 in window units, k .42, holo 1.1). Leave it out and the foil sits as at rest.

**Idle motion** (`data-anim`): the web animates some parts of the pictures with CSS (a spinning ring, drifting
clouds, rain, a blinking lamp…). The SVGs hold the first frame; each animated element says how it moves:
`data-anim` = keyframes name(s) (their CSS is in `manifest.json → animations`), `data-anim-css` = duration, timing,
delay, iteration count, direction (CSS syntax; several comma-separated), `data-anim-origin` = the transform origin
in the element's own user units. A client that animates replaces the element's `transform` / `opacity` /
`stroke-dashoffset` with the keyframes' values. Pictures the web draws by script every frame (Lorenz, armillary,
Möbius…) are exported as their first frame only.

### app/*.json

The same SVGs as `svg/`, keyed by their file path, for apps whose bundler can't read files as text (React Native).
One difference: long polylines are packed as `d='~<digits><base64>'` — per point `varint(zigzag(dx)·2 + isMove)`,
`varint(zigzag(dy))`, deltas on a 10^−digits grid — about a third of the text. `src/content/cyberEgg/unpack.ts`
(aogiri) turns them back into path data; a reader that uses `svg/` never sees them. Shadow PNGs are `data:` URLs.

## manifest.json

```jsonc
{
  "format": "lynshen-cyber-egg-art", "version": 1,
  "source": { "repo", "commit", "dirty", "path", "exportedAt", "exporter" },
  "geometry": { "card", "window", "planeBox", "clipRadius", "perspective", "depth", "units" },
  "tiers": { "n": { "code", "label", "ground", "ink", "soft", "metal", "dark", "edge", "light", "glow" }, … },
  "packs": [{ "period", "name", "line", "ready", "cards": [ids], "set": "p1-set",
              "back": { "ground", "line", "accent", "svg" }, "wrapper", "thumbs", "app" }],
  "cards": [{ "id", "period", "no", "of", "tier", "name", "line", "ground", "special"?: "set",
              "thumb": { "file", "x", "y", "w", "h" },          // px on the sheet
              "planes": [{ "depth", "pop", "cast", "clip", "box", "opacity"?, "file",
                           "shadow"?: { "file", "box" } }] }],   // boxes in window units
  "frames": { "<tier>:<period>": file }, "grounds": { "<tier>": { "svg", "grain" } },
  "animations": { "<keyframes name>": "@keyframes … { … }" },
  "grain": { "light" | "dark" | "back": { "file", "tile": 105 } },
  "cardShadow": { "file", "box", "rest": { "dx", "dy" } },
  "app": { "face", "wrappers", "packs": { "<period>": file } }
}
```

## 怎么拼一张卡（the web's Card3D, flat）

Back to front, all in card units:

1. **Shadow**: `cardShadow` at its box, moved by `rest` (and by `(−x · 5cqw, −y · 4cqw)` when tilted), opacity 0.36
   on light pages (colour rgb(20 16 10)), 0.6 on dark ones (black).
2. **Card stock**: three rounded slabs in the pack's `back.ground` colour at lifts −1.07, −0.77, −0.47 cqw.
3. **Paper**: the tier's `ground` colour, the grain tile repeated (`grounds[tier].grain`), `grounds[tier].svg`
   (the security print).
4. **Window** (clip to the window, radius 5): the card's `ground` colour, then each plane with `pop: false`, far
   first, at its box, scaled about the card centre by `(P − f) / (P − f − lift)` (P = perspective × 300, f = 0.62cqw,
   lift from `geometry.depth`, pop amount 1), its shadow PNG under it, clipped to the window rect when `clip`; then
   the wall shadow (CSS: `inset 0 1.8cqw 2.6cqw −0.4cqw rgb(0 0 0/.55), inset 0 0 0 .35cqw rgb(0 0 0/.28),
   inset 0 −.6cqw 1.2cqw −.4cqw rgb(255 255 255/.18)`).
5. **Frame**: `frames["<tier>:<period>"]`.
6. **Light**: UR and 典藏: the holo rainbow (colour-dodge); every card: the glare (soft-light; SSR: screen) — see the
   web CSS `.ce-holo`, `.ce-glare`.
7. **Text** (drawn by the client): name, tier code (典藏 for the set card), line, foot `packName · 08/15` and `№ 000123`.
   Positions and sizes: web `.ce-name/.ce-code/.ce-line/.ce-foot`; SSR name and code in a gold gradient.
8. **Glaze** (`.ce-glaze`), then the planes with `pop: true` above everything (they may reach over the frame).

When the card turns by (x, y) ∈ [−1, 1]² (20° each way), a plane `lift` units above the face shifts by
`lift · tan(20° · x)`, `lift · tan(20° · y)` in the card's own plane; far planes (negative lift) move the other way.
