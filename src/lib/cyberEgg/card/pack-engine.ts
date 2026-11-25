// cyber-egg.spec.md CE-R2: the sealed pack of the day, a foil pouch with thickness, crimped seals and a glint that
// slides as it turns, and a tear that is the player's own (owner 2026-11-24: 「不要留划痕，我要让他们自己撕掉」「你要支持
// 各种撕裂，而不是固定」) and behaves as real foil does (owner 2026-11-25: 「你要去思考真实撕卡包的物理逻辑和行为操作,
// 不能想当然」).
//
// The pack is a shape (a polygon, at first its rectangle) and a tear is a path, made by the hand:
//   - Fingers can only pinch foil at an edge: press within a finger's width of any edge (the torn ones too) and pull.
//     A press in the middle only pushes the pack, which leans under it.
//   - Starting takes some pull: at a notch or along the serrated crimps (top and bottom) almost none; on a plain side
//     the film stretches first and then gives.
//   - The tear runs in from the edge, then turns towards where the hand pulls, but foil can't turn sharply, and a
//     tear meeting a crimped seal at a slant runs along it. Near the crimps it tears easily and fairly straight;
//     through the body it takes more pull and comes out ragged. It never crosses itself.
//   - It runs only while the hand pulls the torn strip taut ahead of the tip. Pulling back slackens the strip and
//     tugs the whole pack; nothing tears.
//   - Let go and the tear stops where it is; the strip hangs from it with a little curl. Nothing heals, nothing runs
//     on by itself. Take the strip again and pull on, or start another tear elsewhere (the first stays a slit).
//   - When a tear reaches an edge or another tear, that piece is off in the hand and goes the way the hand went.
//   - The pack is open when the mouth is big enough for the cards to come out (most of the top or bottom, or most
//     of a side); a smaller hole only lets light out and the line under the pack says so.
// Light comes from inside through whatever is torn: a hot line along each torn edge, warm haze leaving it, motes.
// Enter on it (keyboard) tears it by itself: a made-up hand pinches a notch and pulls the strip across.
import { seeded } from "./geometry";
import { wrapperUrl } from "./pack-art";
import { playCrackle, playRip, playRustle } from "./sound";

/** The notches, one on each side, where light leaks before the pack is torn (share of the height). */
const NOTCH_Y = 0.125;
/** The canvases reach this far past the pack on each side (share of its size). */
const BLEED = 0.6;
/** The light swelling out of the mouth once open (ms). */
const BURST_MS = 1900;
/** The haze is drawn at this fraction of the resolution and scaled up: a soft blur for free. */
const HAZE_SCALE = 0.25;
/** A tear advances in steps of this many px. */
const STEP = 4;
/** Fingers pinch foil only near an edge: how far from the outline a press still grips it (share of the width). */
const GRIP = 0.1;
const GRIP_TOUCH = 0.14;
/**
 * Pull needed before the foil gives (share of the width): almost none at a notch, a torn lip or the serrated crimped
 * edges top and bottom (each tooth is a little notch); more on a plain side, where the film first stretches.
 */
const START_EASY = 0.012;
const START_EDGE = 0.05;
/** The crimped seals, top and bottom (share of the height). */
const SEAL = 0.07;
/** Near the crimps (this share of the height from top and bottom) foil tears easily and fairly straight; through the
 * body of the pack it takes more pull and tears raggedly. */
const EASY_BAND = 0.18;
/** Foil can't turn sharply: the tightest radius a tear runs (share of the width). */
const TURN_RADIUS = 0.09;
/** The torn strip is taut, and tears on, once the hand is this far ahead of the tip (share of the width): little along
 * the crimps, more through the body. */
const SLACK = 0.025;
const SLACK_BODY = 0.07;
/** The hand behind the tip (cosine to the way it runs below this) only slackens the strip and tugs the pack. */
const BEHIND_COS = -0.15;
/** How far the pack leans under the finger (degrees at the corner). */
const LEAN_DEG = 9;
/** A made-up hand pulls across in this long (ms). */
const AUTO_MS = 950;

type P = { x: number; y: number };
/** A vertex of the pack's shape; `cut`/`seq` say it lies on a tear (which one, how far along). */
type V = P & { cut?: number; seq?: number };
type Hit = { p: P; edge: number; t: number };

interface Tear {
  id: number;
  start: Hit;
  /** The points after the start; the last is the tip. */
  path: P[];
  dir: P | null;
  length: number;
  random: () => number;
  drift: number;
}

interface Piece {
  poly: V[];
  born: number;
  ms: number;
  c: P;
  v: P;
  spin: number;
  flipRate: number;
  axis: number;
  flutter: number;
}

/** A made-up hand (Enter): it pinches at `from` and pulls along to `to`, wavering a little. */
interface Auto {
  t0: number;
  from: P;
  to: P;
  wave: number;
  tries: number;
}

/** What the fingers hold: an edge (no tear yet: it starts once pulled `need` px), or the strip of a running tear. */
interface Grip {
  kind: "edge" | "strip";
  at: Hit;
  start: P;
  need: number;
  inward: P;
}

export type TearHint = "edge" | "small" | "slack" | null;

interface State {
  /** The size (px) the shape is kept in; percentages carry it to any size. */
  size: { w: number; h: number };
  body: V[];
  tear: Tear | null;
  pieces: Piece[];
  nextCut: number;
  holding: boolean;
  finger: P;
  /** The finger's velocity, smoothed (px per ms), and where and when it was last seen. */
  vel: P;
  last: { p: P; t: number };
  /** How far the hanging flap is folded (radians, sprung). */
  fold: number;
  foldVel: number;
  shake: number;
  auto: Auto | null;
  raf: number;
  opened: number;
  removed: number;
  /** Pieces torn off so far. */
  torn: number;
  grip: Grip | null;
  /** The strip went slack this hold (the hand behind the tip): said once. */
  slackSaid: boolean;
  /** The lean under the finger (-1..1 each way, sprung). */
  lean: P;
  leanVel: P;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
  soft: boolean;
}

// ——— plane geometry ———
const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k });
const len = (a: P) => Math.hypot(a.x, a.y);
const norm = (a: P): P => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
const cross = (a: P, b: P) => a.x * b.y - a.y * b.x;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function signedArea(poly: P[]): number {
  let sum = 0;
  for (let k = 0; k < poly.length; k += 1) sum += cross(poly[k], poly[(k + 1) % poly.length]);
  return sum / 2;
}

function centroid(poly: P[]): P {
  const a = signedArea(poly) || 1e-9;
  let cx = 0;
  let cy = 0;
  for (let k = 0; k < poly.length; k += 1) {
    const p = poly[k];
    const q = poly[(k + 1) % poly.length];
    const f = cross(p, q);
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

function inside(poly: P[], p: P): boolean {
  let hit = false;
  for (let k = 0, j = poly.length - 1; k < poly.length; j = k, k += 1) {
    const a = poly[k];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Where segment a→b crosses segment c→d: the share along each, or null. */
function crossing(a: P, b: P, c: P, d: P): { t: number; u: number } | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-9) return null;
  const t = cross(sub(c, a), s) / den;
  const u = cross(sub(c, a), r) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
}

function nearestOnEdge(poly: P[], p: P): Hit & { d: number } {
  let best = { p: poly[0], edge: 0, t: 0, d: Infinity };
  for (let k = 0; k < poly.length; k += 1) {
    const a = poly[k];
    const b = poly[(k + 1) % poly.length];
    const ab = sub(b, a);
    const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y || 1), 0, 1);
    const q = add(a, mul(ab, t));
    const d = len(sub(p, q));
    if (d < best.d) best = { p: q, edge: k, t, d };
  }
  return best;
}

/** The shape's vertices met going forward from one point of its outline to another. */
function walk(poly: V[], from: Hit, to: Hit): V[] {
  if (from.edge === to.edge && to.t >= from.t) return [];
  const out: V[] = [];
  let k = (from.edge + 1) % poly.length;
  for (let guard = 0; guard <= poly.length; guard += 1) {
    out.push(poly[k]);
    if (k === to.edge) break;
    k = (k + 1) % poly.length;
  }
  return out;
}

/** The two shapes a path from one point of the outline to another cuts the shape into. */
function split(poly: V[], a: Hit, path: P[], b: Hit, cut: number): [V[], V[]] {
  const line: V[] = [a.p, ...path, b.p].map((p, seq) => ({ ...p, cut, seq }));
  const one = [...line, ...walk(poly, b, a)];
  const two = [...line.slice().reverse(), ...walk(poly, a, b)];
  return [one, two];
}

function isTorn(a: V, b: V): boolean {
  return a.cut !== undefined && a.cut === b.cut && Math.abs((a.seq ?? 0) - (b.seq ?? 0)) === 1;
}

/** The torn edges of a shape, as runs of points. */
function tornRuns(poly: V[]): P[][] {
  const runs: P[][] = [];
  const n = poly.length;
  // Start where an untorn edge ends, so a run is never split by the wrap round.
  let start = 0;
  for (let k = 0; k < n; k += 1) {
    if (!isTorn(poly[(k + n - 1) % n], poly[k])) {
      start = k;
      break;
    }
  }
  let run: P[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = poly[(start + i) % n];
    const b = poly[(start + i + 1) % n];
    if (isTorn(a, b)) {
      if (!run.length) run.push(a);
      run.push(b);
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs;
}

const rect = (w: number, h: number): V[] => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: h },
  { x: 0, y: h },
];

const pct = (poly: P[], size: { w: number; h: number }, mirror = false) =>
  `polygon(${poly.map((p) => `${(((mirror ? size.w - p.x : p.x) / size.w) * 100).toFixed(2)}% ${((p.y / size.h) * 100).toFixed(2)}%`).join(",")})`;

/** The canvas transform that folds the plane about the line through `h` along `u`, by cos `c` across it. */
function foldMatrix(h: P, u: P, c: number): [number, number, number, number, number, number] {
  const n = { x: -u.y, y: u.x };
  const m00 = u.x * u.x + c * n.x * n.x;
  const m01 = u.x * u.y + c * n.x * n.y;
  const m11 = u.y * u.y + c * n.y * n.y;
  return [m00, m01, m01, m11, h.x - (m00 * h.x + m01 * h.y), h.y - (m01 * h.x + m11 * h.y)];
}

/** The piece a running tear has half torn: the smaller side, closed from the tip to the nearest edge. */
function hanging(s: State): { flap: V[]; rest: V[]; hinge: [P, P] } | null {
  const tear = s.tear;
  if (!tear || tear.path.length < 2) return null;
  const tip = tear.path[tear.path.length - 1];
  const close = nearestOnEdge(s.body, tip);
  if (close.d < 0.5) return null;
  const [one, two] = split(s.body, tear.start, tear.path, close, -1);
  const small = Math.abs(signedArea(one)) <= Math.abs(signedArea(two));
  return { flap: small ? one : two, rest: small ? two : one, hinge: [tip, close.p] };
}

/**
 * Is the pack open: is the mouth big enough for the cards? Most of the top or bottom gone (the strip off), or most of
 * a side, or a large part of the pack. A smaller hole only lets light out.
 */
function isOpen(s: State): boolean {
  const { w, h } = s.size;
  const gone = (at: (u: number) => P) => {
    let n = 0;
    for (let k = 0; k < 40; k += 1) if (!inside(s.body, at((k + 0.5) / 40))) n += 1;
    return n / 40;
  };
  const top = gone((u) => ({ x: u * w, y: h * 0.03 }));
  const bottom = gone((u) => ({ x: u * w, y: h * 0.97 }));
  const left = gone((u) => ({ x: w * 0.03, y: h * (0.05 + 0.9 * u) }));
  const right = gone((u) => ({ x: w * 0.97, y: h * (0.05 + 0.9 * u) }));
  return Math.max(top, bottom) >= 0.8 || Math.max(left, right) >= 0.8 || s.removed / (w * h) >= 0.3;
}

/** The way into the shape at a point of its outline. */
function inwardAt(poly: P[], at: Hit): P {
  const a = poly[at.edge];
  const b = poly[(at.edge + 1) % poly.length];
  const e = norm(sub(b, a));
  const n = { x: -e.y, y: e.x };
  return inside(poly, add(at.p, mul(n, 2))) ? n : mul(n, -1);
}

/** Starts a tear at a point of the edge, running in along `dir`. */
function begin(s: State, at: Hit, dir: P) {
  s.tear = {
    id: s.nextCut,
    start: { ...at, p: { ...at.p } },
    path: [],
    dir,
    length: 0,
    random: seeded(Math.floor(performance.now() * 1000) ^ Math.floor(Math.random() * 1e9)),
    drift: 0,
  };
  s.nextCut += 1;
}

/** A tear let go half way and left for another: it stays in the foil as a slit (both lips torn). */
function slit(s: State) {
  const tear = s.tear;
  s.tear = null;
  if (!tear || tear.path.length < 2) return;
  const out: V[] = [{ ...tear.start.p, cut: tear.id, seq: 0 }, ...tear.path.map((p, k) => ({ ...p, cut: tear.id, seq: k + 1 }))];
  const back: V[] = tear.path
    .slice(0, -1)
    .reverse()
    .map((p, k) => ({ ...p, cut: tear.id + 0.5, seq: k + 1 }));
  const loop: V[] = [...out, ...back, { ...tear.start.p, cut: tear.id + 0.5, seq: back.length + 1 }];
  const at = tear.start.edge;
  s.body = [...s.body.slice(0, at + 1), ...loop, ...s.body.slice(at + 1)];
}

/** Where a notch is, if it is still there. */
function notches(s: State): P[] {
  return [
    { x: s.size.w, y: NOTCH_Y * s.size.h },
    { x: 0, y: NOTCH_Y * s.size.h },
  ].filter((p) => nearestOnEdge(s.body, p).d < 1);
}

/** The made-up hand: pinch a notch (or the strip already half torn) and pull it across the pack. */
function startAuto(s: State, tries: number): boolean {
  const { w, h } = s.size;
  if (s.tear && s.tear.dir) {
    const tip = s.tear.path[s.tear.path.length - 1] ?? s.tear.start.p;
    s.grip = { kind: "strip", at: s.tear.start, start: tip, need: 0, inward: s.tear.dir };
    s.auto = { t0: performance.now(), from: add(tip, mul(s.tear.dir, w * SLACK)), to: add(tip, mul(s.tear.dir, w * 1.3)), wave: Math.random() * 2, tries };
    return true;
  }
  const notch = notches(s)[tries % 2] ?? notches(s)[0];
  const at = nearestOnEdge(s.body, notch ?? { x: w, y: h * NOTCH_Y });
  const inward = inwardAt(s.body, at);
  s.grip = { kind: "edge", at, start: at.p, need: 0, inward };
  begin(s, at, inward);
  s.grip.kind = "strip";
  const across = { x: at.p.x < w / 2 ? 1 : -1, y: 0 };
  s.auto = {
    t0: performance.now(),
    from: add(at.p, mul(inward, w * SLACK)),
    to: add(at.p, add(mul(across, w * 1.25), { x: 0, y: -h * 0.02 })),
    wave: Math.random() * 2,
    tries,
  };
  return true;
}

export interface PackElements {
  root: HTMLElement;
  tilt: HTMLElement;
  skin: HTMLElement;
  back: HTMLElement;
  rim: HTMLElement;
  canvas: HTMLCanvasElement;
  light: HTMLCanvasElement;
}

export interface PackProps {
  period: number;
  disabled?: boolean;
  onTorn: () => void;
  /** The pack came open (its look changes). */
  onOpen?: () => void;
  /** A piece came off but the pack is not open yet. */
  onSmallTear?: () => void;
  /** What the line under the pack should say now: grip an edge, the hole is small, pull forward. */
  onHint?: (hint: TearHint) => void;
}

/**
 * The pack's hand and foil, on the elements of its markup (Pack.svelte). `props` is read live, so the
 * caller may change `disabled` on it. Returns the pointer handlers and a way to stop.
 */
export function createPack(els: PackElements, props: PackProps) {
  const root = { current: els.root };
  const tilt = { current: els.tilt };
  const skin = { current: els.skin };
  const back = { current: els.back };
  const rim = { current: els.rim };
  const canvas = { current: els.canvas };
  const light = { current: els.light };
  const haze: { current: HTMLCanvasElement | null } = { current: null };
  const lightRaf = { current: 0 };
  const motes: { current: Mote[] } = { current: [] };
  const image: { current: HTMLImageElement | null } = { current: null };
  const wrapper = wrapperUrl(props.period);
  const setDone = (_done: boolean) => props.onOpen?.();
  const state: { current: State } = {current: {
    size: { w: 1, h: 1 },
    body: [],
    tear: null,
    pieces: [],
    nextCut: 1,
    holding: false,
    finger: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    last: { p: { x: 0, y: 0 }, t: 0 },
    fold: 0,
    foldVel: 0,
    shake: 0,
    auto: null,
    raf: 0,
    opened: 0,
    removed: 0,
    torn: 0,
    grip: null,
    slackSaid: false,
    lean: { x: 0, y: 0 },
    leanVel: { x: 0, y: 0 },
  }};

  {
    const img = new Image();
    img.decoding = "async";
    img.src = wrapper;
    image.current = img;
  }

  /** The shape, made on first use at the pack's size. */
  const shape = (): State => {
    const s = state.current;
    if (!s.body.length) {
      const element = root.current;
      s.size = { w: element?.clientWidth || 300, h: element?.clientHeight || 435 };
      s.body = rect(s.size.w, s.size.h);
    }
    return s;
  };

  /** A canvas sized to the pack plus its bleed, cleared, drawing in the shape's px. */
  const prepare = (cv: HTMLCanvasElement, W: number, H: number, s: State, scale = 1) => {
    const ratio = Math.min(2, window.devicePixelRatio || 1) * scale;
    const cw = Math.max(1, Math.round(W * (1 + 2 * BLEED) * ratio));
    const ch = Math.max(1, Math.round(H * (1 + 2 * BLEED) * ratio));
    if (cv.width !== cw || cv.height !== ch) {
      cv.width = cw;
      cv.height = ch;
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(ratio * (W / s.size.w), 0, 0, ratio * (H / s.size.h), W * BLEED * ratio, H * BLEED * ratio);
    return { ctx, ratio };
  };

  /** Draws a piece of the wrapper (or its silver inside when turned over), under the current transform. */
  const paint = (ctx: CanvasRenderingContext2D, poly: P[], facing: number, s: State) => {
    ctx.save();
    ctx.beginPath();
    poly.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    const img = image.current;
    if (facing > 0 && img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, s.size.w, s.size.h);
      // Turning away from the light darkens it; near 40° it catches a highlight.
      ctx.fillStyle = `rgba(0,0,0,${((1 - facing) * 0.55).toFixed(3)})`;
      ctx.fill();
      const spec = Math.max(0, 1 - Math.abs(Math.acos(Math.min(1, facing)) - 0.7) * 3);
      if (spec > 0) {
        ctx.fillStyle = `rgba(255,250,240,${(spec * 0.3).toFixed(3)})`;
        ctx.fill();
      }
    } else {
      // The inside of the foil: brushed silver.
      const box = poly.reduce((acc, p) => ({ x0: Math.min(acc.x0, p.x), y0: Math.min(acc.y0, p.y), x1: Math.max(acc.x1, p.x), y1: Math.max(acc.y1, p.y) }), {
        x0: Infinity,
        y0: Infinity,
        x1: -Infinity,
        y1: -Infinity,
      });
      const f = Math.abs(facing);
      const g = ctx.createLinearGradient(box.x0, box.y0, box.x1, box.y1);
      g.addColorStop(0, `rgb(${Math.round(150 + 40 * f)},${Math.round(148 + 40 * f)},${Math.round(142 + 40 * f)})`);
      g.addColorStop(0.42, `rgb(${Math.round(206 + 30 * f)},${Math.round(206 + 30 * f)},${Math.round(210 + 28 * f)})`);
      g.addColorStop(0.5, `rgb(${Math.round(176 + 30 * f)},${Math.round(178 + 30 * f)},${Math.round(184 + 28 * f)})`);
      g.addColorStop(1, `rgb(${Math.round(120 + 50 * f)},${Math.round(124 + 50 * f)},${Math.round(132 + 50 * f)})`);
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
  };

  /** A ragged bright line of metal along torn edges. */
  const lipLine = (ctx: CanvasRenderingContext2D, runs: P[][], alpha = 0.9) => {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const [width, color] of [
      [2.2, `rgba(20,18,16,${alpha * 0.35})`],
      [1, `rgba(240,236,226,${alpha})`],
    ] as Array<[number, string]>) {
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      for (const run of runs) {
        ctx.beginPath();
        run.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /** Cuts the pack to its shape (front, back, side) and draws the hanging flap, the torn lips and the pieces in the air. */
  const render = () => {
    const s = state.current;
    const element = root.current;
    const cv = canvas.current;
    if (!element || !cv || !s.body.length) return;
    const W = element.clientWidth;
    const H = element.clientHeight;
    const hang = hanging(s);
    const body = hang ? hang.rest : s.body;
    const whole = !hang && s.removed === 0;
    const clip = whole ? "" : pct(body, s.size);
    if (skin.current) skin.current.style.clipPath = clip;
    if (rim.current) rim.current.style.clipPath = clip;
    if (back.current) back.current.style.clipPath = whole ? "" : pct(body, s.size, true);

    const prepared = prepare(cv, W, H, s);
    if (!prepared) return;
    const { ctx } = prepared;
    const now = performance.now();
    // The torn lips on the pack.
    lipLine(ctx, tornRuns(s.body));
    // The flap hanging from a running tear, folded about where it is still attached.
    if (hang && s.tear) {
      const [h0, h1] = hang.hinge;
      const u = norm(sub(h1, h0));
      // A small flap (a strip, a corner) swings up from the tip and folds well up towards the eye; a big one is too
      // heavy for that: it lifts and swings a little. Pieces turn over (silver inside) once they are off.
      const share = Math.abs(signedArea(hang.flap)) / (s.size.w * s.size.h);
      const light = clamp(1 - (share - 0.06) / 0.2, 0, 1);
      // Never edge on for long: a thin sliver reads as nothing.
      const c = Math.cos(Math.min(1.15, s.fold * (0.32 + 0.68 * light)));
      const restCentre = centroid(hang.rest);
      const flapCentre = centroid(hang.flap);
      const swing = (a: number) => {
        const r = sub(flapCentre, h0);
        return len(sub(add(h0, { x: r.x * Math.cos(a) - r.y * Math.sin(a), y: r.x * Math.sin(a) + r.y * Math.cos(a) }), restCentre));
      };
      const turn = clamp(s.fold * 0.3, 0, 0.62) * (0.3 + 0.7 * light) * (swing(0.2) >= swing(-0.2) ? 1 : -1);
      const lift = Math.sin(clamp(s.fold, 0, Math.PI)) * s.size.h * 0.018;
      const place = () => {
        ctx.translate(h0.x, h0.y - lift);
        ctx.rotate(turn);
        ctx.translate(-h0.x, -h0.y);
        ctx.transform(...foldMatrix(h0, u, c));
      };
      // Its shadow on the pack.
      ctx.save();
      ctx.filter = "blur(4px)";
      ctx.globalAlpha = 0.28 * Math.min(1, s.fold * 1.4);
      ctx.translate(3, 6);
      place();
      ctx.beginPath();
      hang.flap.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();
      ctx.save();
      place();
      paint(ctx, hang.flap, c, s);
      lipLine(ctx, [[s.tear.start.p, ...s.tear.path]], 0.8);
      ctx.restore();
    }
    // Pieces off and flying: the way the hand went, turning over as they go.
    s.pieces = s.pieces.filter((piece) => now - piece.born < piece.ms);
    for (const piece of s.pieces) {
      const ms = now - piece.born;
      const t = ms / piece.ms;
      const at = add(piece.c, { x: piece.v.x * ms, y: piece.v.y * ms + s.size.h * 0.9 * t * t });
      const turn = Math.cos(piece.flipRate * t * Math.PI);
      ctx.save();
      ctx.globalAlpha = 1 - Math.pow(t, 3);
      ctx.translate(at.x, at.y);
      ctx.rotate(piece.spin * t + piece.flutter * Math.sin(t * 11) * (1 - t));
      ctx.rotate(piece.axis);
      ctx.scale(Math.max(0.04, Math.abs(turn)), 1);
      ctx.rotate(-piece.axis);
      ctx.translate(-piece.c.x, -piece.c.y);
      paint(ctx, piece.poly, turn, s);
      lipLine(ctx, tornRuns(piece.poly), 0.8);
      ctx.restore();
    }
  };

  /** The light from inside the pack: it shows only through what is torn. */
  const drawLight = (): boolean => {
    const s = shape();
    const element = root.current;
    const cv = light.current;
    if (!element || !cv) return false;
    const now = performance.now();
    const W = element.clientWidth;
    const H = element.clientHeight;
    const burstT = s.opened ? (now - s.opened) / BURST_MS : 0;
    const prepared = prepare(cv, W, H, s);
    if (!prepared) return false;
    const { ctx } = prepared;
    if (burstT >= 1 || (props.disabled && !s.opened)) {
      motes.current = [];
      return false;
    }
    if (!haze.current) haze.current = document.createElement("canvas");
    const soft = prepare(haze.current, W, H, s, HAZE_SCALE);
    const sw = s.size.w;
    const sh = s.size.h;
    // The openings: every torn edge of the pack, and a tear running now.
    const runs = tornRuns(s.body);
    if (s.tear && s.tear.path.length) runs.push([s.tear.start.p, ...s.tear.path]);
    const breathe = 0.5 + 0.5 * Math.sin(now / 1100);
    if (!runs.length) {
      // Sealed: only a breath of warm light at each notch. Nothing is drawn across the pack.
      if (soft) {
        const h = soft.ctx;
        h.globalCompositeOperation = "lighter";
        for (const [k, x] of [sw, 0].entries()) {
          const glow = h.createRadialGradient(x, NOTCH_Y * sh, 0, x, NOTCH_Y * sh, sw * 0.065);
          glow.addColorStop(0, `rgba(255, 226, 176, ${0.24 + 0.12 * (k ? 1 - breathe : breathe)})`);
          glow.addColorStop(1, "rgba(255, 220, 170, 0)");
          h.fillStyle = glow;
          h.fillRect(x - sw * 0.1, NOTCH_Y * sh - sw * 0.1, sw * 0.2, sw * 0.2);
        }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(haze.current, 0, 0, cv.width, cv.height);
        ctx.restore();
      }
      return true;
    }
    const torn = runs.reduce((sum, run) => sum + run.slice(1).reduce((acc, p, k) => acc + len(sub(p, run[k])), 0), 0);
    const opening = clamp(torn / sw, 0, 1.6);
    const strength = s.opened
      ? burstT < 0.12
        ? 1.1 + (burstT / 0.12) * 1.1
        : burstT < 0.55
          ? 2.2 - ((burstT - 0.12) / 0.43) * 0.9
          : 1.3 * Math.pow(1 - (burstT - 0.55) / 0.45, 1.4)
      : (0.35 + 0.7 * Math.min(1, opening)) * (0.92 + 0.08 * Math.sin(now / 140) * Math.sin(now / 53));
    const bodyCentre = centroid(s.body);
    if (soft) {
      const h = soft.ctx;
      h.globalCompositeOperation = "lighter";
      for (const run of runs) {
        for (let k = 1; k < run.length; k += 1) {
          const q0 = run[k - 1];
          const q1 = run[k];
          const mid = mul(add(q0, q1), 0.5);
          let n = norm({ x: -(q1.y - q0.y), y: q1.x - q0.x });
          // Into the pack the foil catches the light; out of it the light leaves.
          if (len(sub(add(mid, n), bodyCentre)) > len(sub(sub(mid, n), bodyCentre))) n = mul(n, -1);
          const depth = sh * 0.09;
          const spill = h.createLinearGradient(mid.x, mid.y, mid.x + n.x * depth, mid.y + n.y * depth);
          spill.addColorStop(0, `rgba(255, 214, 150, ${0.3 * Math.min(1.5, strength)})`);
          spill.addColorStop(1, "rgba(255, 214, 150, 0)");
          h.fillStyle = spill;
          h.beginPath();
          h.moveTo(q0.x, q0.y);
          h.lineTo(q1.x, q1.y);
          h.lineTo(q1.x + n.x * depth, q1.y + n.y * depth);
          h.lineTo(q0.x + n.x * depth, q0.y + n.y * depth);
          h.closePath();
          h.fill();
          // Haze leaving the gap: a soft swell outward (and upward, as warm air does), every few steps.
          if (k % 6 === 3) {
            const out = norm(add(mul(n, -1), { x: 0, y: -0.8 }));
            const reach = sh * (0.06 + 0.05 * Math.sin(now / 1300 + k)) * Math.min(1.7, strength);
            const at = add(mid, mul(out, reach * 0.6));
            const glow = h.createRadialGradient(at.x, at.y, 0, at.x, at.y, reach * 1.4);
            glow.addColorStop(0, `rgba(255, 228, 182, ${0.2 * Math.min(1.4, strength)})`);
            glow.addColorStop(1, "rgba(255, 220, 170, 0)");
            h.fillStyle = glow;
            h.fillRect(at.x - reach * 1.5, at.y - reach * 1.5, reach * 3, reach * 3);
          }
        }
      }
      if (s.opened) {
        const all = runs.flat();
        const c = mul(all.reduce((acc, p) => add(acc, p), { x: 0, y: 0 }), 1 / Math.max(1, all.length));
        const wash = h.createRadialGradient(c.x, c.y, 0, c.x, c.y, sw * (0.6 + burstT * 0.5));
        wash.addColorStop(0, `rgba(255, 226, 176, ${0.45 * Math.min(1, strength)})`);
        wash.addColorStop(1, "rgba(255, 226, 176, 0)");
        h.fillStyle = wash;
        h.fillRect(-sw * BLEED, -sh * BLEED, sw * (1 + 2 * BLEED), sh * (1 + 2 * BLEED));
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(haze.current, 0, 0, cv.width, cv.height);
      ctx.restore();
    }
    // The crack itself: a hot line, white at the core.
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const [width, alpha, color] of [
      [0.028, 0.22, "255, 214, 150"],
      [0.012, 0.55, "255, 236, 200"],
      [0.004, 0.95, "255, 253, 246"],
    ] as Array<[number, number, string]>) {
      ctx.lineWidth = sw * width * (s.opened ? 1 + burstT : 1);
      ctx.strokeStyle = `rgba(${color}, ${Math.min(1, alpha * Math.min(1.6, strength * 1.4))})`;
      for (const run of runs) {
        ctx.beginPath();
        run.forEach((q, k) => (k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.stroke();
      }
    }
    // Dust in the light: a few fine motes, a few out of focus.
    const points = runs.flat();
    const spawn = s.opened ? (burstT < 0.35 ? 2 : 0) : Math.random() < 0.15 + 0.25 * Math.min(1, opening) ? 1 : 0;
    for (let k = 0; k < spawn; k += 1) {
      const at = points[Math.floor(Math.random() * points.length)];
      const softMote = Math.random() < 0.3;
      motes.current.push({
        x: at.x + (Math.random() - 0.5) * 6,
        y: at.y - 2,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.25 + Math.random() * (s.opened ? 1.1 : 0.45)),
        born: now,
        life: 1800 + Math.random() * 1600,
        size: softMote ? 2.2 + Math.random() * 2.4 : 0.5 + Math.random() * 0.8,
        soft: softMote,
      });
    }
    motes.current = motes.current.filter((mote) => now - mote.born < mote.life).slice(-40);
    for (const mote of motes.current) {
      const age = (now - mote.born) / mote.life;
      mote.x += mote.vx + Math.sin((now - mote.born) / 400 + mote.size) * 0.12;
      mote.y += mote.vy;
      const alpha = Math.sin(Math.PI * age) * (mote.soft ? 0.22 : 0.8);
      if (mote.soft) {
        const g = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.size);
        g.addColorStop(0, `rgba(255, 236, 200, ${alpha})`);
        g.addColorStop(1, "rgba(255, 236, 200, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(mote.x - mote.size, mote.y - mote.size, mote.size * 2, mote.size * 2);
      } else {
        ctx.fillStyle = `rgba(255, 246, 226, ${alpha})`;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    return true;
  };

  const lightLoop = () => {
    lightRaf.current = drawLight() ? requestAnimationFrame(lightLoop) : 0;
  };
  const lightUp = () => {
    if (!lightRaf.current) lightRaf.current = requestAnimationFrame(lightLoop);
  };

  /** Open: the light swells, then the cards come. Also the last resort when made-up tears keep missing. */
  const openNow = (s: State) => {
      if (s.opened) return;
      s.opened = performance.now();
      s.auto = null;
      s.tear = null;
      s.grip = null;
      setDone(true);
      lightUp();
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => props.onTorn(), reduced ? 0 : 380);
    };

  /** The tear reached the edge at `end`: the piece comes off, flying the way the hand went. */
  const tearOff = (s: State, end: Hit) => {
      const tear = s.tear;
      if (!tear) return;
      s.tear = null;
      if (len(sub(end.p, tear.start.p)) < 3 && tear.path.length < 3) return;
      const [one, two] = split(s.body, tear.start, tear.path, end, tear.id);
      const small = Math.abs(signedArea(one)) <= Math.abs(signedArea(two));
      const piece = small ? one : two;
      s.body = small ? two : one;
      s.removed += Math.abs(signedArea(piece));
      const fast = clamp(len(s.vel) / 1.6, 0, 1);
      const random = tear.random;
      s.pieces.push({
        poly: piece,
        born: performance.now(),
        ms: Math.round(1150 - 420 * fast),
        c: centroid(piece),
        v: { x: s.vel.x * (0.35 + 0.5 * fast), y: s.vel.y * (0.35 + 0.5 * fast) - 0.12 - 0.3 * fast },
        spin: (s.vel.x >= 0 ? 1 : -1) * (0.3 + 2.6 * fast) * (0.7 + 0.6 * random()),
        flipRate: 0.4 + 2.2 * fast * random(),
        axis: random() * Math.PI,
        flutter: 0.34 * (1 - fast),
      });
      s.fold = 0;
      s.foldVel = 0;
      s.torn += 1;
      playRip();
      s.grip = null;
      if (!s.opened && isOpen(s)) openNow(s);
      else if (!s.opened) {
        props.onSmallTear?.();
        props.onHint?.("small");
      }
    };

  /**
   * Tears on while the hand holds the strip taut ahead of the tip: a step at a time, turning towards the hand no
   * tighter than foil can, along a crimped seal rather than through it, ragged, never across itself. Returns the
   * steps torn; `slack` says the hand was behind the tip.
   */
  const advance = (s: State, finger: P): { moved: number; slack: boolean } => {
      const tear = s.tear;
      if (!tear || !tear.dir) return { moved: 0, slack: false };
      const { w, h } = s.size;
      const maxTurn = STEP / (TURN_RADIUS * w);
      const seal = SEAL * h;
      let moved = 0;
      for (let guard = 0; guard < 80 && s.tear === tear; guard += 1) {
        const tip = tear.path.length ? tear.path[tear.path.length - 1] : tear.start.p;
        const toward = sub(finger, tip);
        const reach = len(toward);
        // How deep in the body the tip is: 0 along the crimps, 1 well inside (harder, more ragged).
        const body = clamp((Math.min(tip.y, h - tip.y) - EASY_BAND * h) / (EASY_BAND * h * 0.6), 0, 1);
        if (reach < w * (SLACK + (SLACK_BODY - SLACK) * body) + STEP) break;
        const u = mul(toward, 1 / reach);
        const was: P = tear.dir ?? u;
        const cos = u.x * was.x + u.y * was.y;
        if (cos < BEHIND_COS) return { moved, slack: true };
        let angle: number = Math.atan2(was.y, was.x) + clamp(Math.atan2(cross(was, u), cos), -maxTurn, maxTurn);
        let dir: P = { x: Math.cos(angle), y: Math.sin(angle) };
        // A crimped seal: met at a slant, the tear runs along it; met square on, it goes through, slowly.
        const intoTop = tip.y < seal * 1.6 && dir.y < 0;
        const intoBottom = tip.y > h - seal * 1.6 && dir.y > 0;
        if ((intoTop || intoBottom) && Math.abs(dir.y) < 0.75) {
          dir = norm({ x: dir.x, y: dir.y * 0.25 });
          angle = Math.atan2(dir.y, dir.x);
        }
        // Foil never tears clean: a slow wander across the way and now and then a snag, much more through the body.
        tear.drift = tear.drift * 0.7 + (tear.random() - 0.5) * (0.45 + 0.9 * body);
        const snag = tear.random() < 0.02 + 0.06 * body ? (tear.random() - 0.5) * (1.6 + 2.4 * body) : 0;
        const side = { x: -dir.y, y: dir.x };
        let next = add(add(tip, mul(dir, STEP)), mul(side, tear.drift + snag));
        // Never across its own path: lean away as far as it may; if that still crosses, wait for the hand.
        const crossesSelf = (to: P) => {
          for (let k = 0; k < tear.path.length - 2; k += 1) {
            const a = k === 0 ? tear.start.p : tear.path[k - 1];
            if (crossing(tip, to, a, tear.path[k])) return true;
          }
          return false;
        };
        if (crossesSelf(next)) {
          const options = [angle - maxTurn, angle + maxTurn].map((a) => add(tip, mul({ x: Math.cos(a), y: Math.sin(a) }, STEP)));
          const free = options.find((to) => !crossesSelf(to));
          if (!free) break;
          next = free;
          dir = norm(sub(free, tip));
        }
        // Out through an edge (or into another tear): that piece is off.
        let exit: Hit | null = null;
        let first = Infinity;
        for (let k = 0; k < s.body.length; k += 1) {
          const hit = crossing(tip, next, s.body[k], s.body[(k + 1) % s.body.length]);
          if (!hit) continue;
          const at = add(tip, mul(sub(next, tip), hit.t));
          if (len(sub(at, tear.start.p)) < 2.5 && tear.length < 12) continue;
          if (hit.t < first) {
            first = hit.t;
            exit = { p: at, edge: k, t: hit.u };
          }
        }
        if (exit) {
          tearOff(s, exit);
          return { moved: moved + 1, slack: false };
        }
        if (!inside(s.body, next)) {
          tearOff(s, nearestOnEdge(s.body, next));
          return { moved: moved + 1, slack: false };
        }
        tear.path.push(next);
        tear.dir = dir;
        tear.length += STEP;
        moved += 1;
      }
      return { moved, slack: false };
    };

  const loop = () => {
    const s = state.current;
    if (!root.current || !s.body.length) return;
    const now = performance.now();
    let moved = 0;
    const auto = s.auto;
    if (auto && !s.opened) {
      // The made-up hand: it pulls the strip across with a little waver, and the foil tears as the hand pulls.
      const t = clamp((now - auto.t0) / AUTO_MS, 0, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const along = add(auto.from, mul(sub(auto.to, auto.from), ease));
      const finger = add(along, { x: 0, y: Math.sin(ease * Math.PI * 2 + auto.wave) * s.size.h * 0.008 - Math.sin(ease * Math.PI) * s.size.h * 0.02 });
      s.vel = mul(sub(finger, s.finger), 1 / 16);
      s.finger = finger;
      moved = advance(s, finger).moved;
      if (moved && Math.random() < 0.35 + 0.65 * Math.min(1, moved / 4)) playCrackle(Math.min(1, moved / 6));
      if (!s.tear || t >= 1) {
        // Off (or the hand is done): if the pack is still shut, the hand goes again from the other notch.
        s.auto = null;
        if (!s.opened) {
          if (s.tear && !s.tear.path.length) s.tear = null;
          if (auto.tries < 3) startAuto(s, auto.tries + 1);
          else openNow(s);
        }
      }
    } else if (s.holding && s.grip?.kind === "strip" && s.tear) {
      const step = advance(s, s.finger);
      moved = step.moved;
      // The crinkle follows the tear: louder and denser the faster it runs, silent while the strip is slack.
      if (moved && Math.random() < 0.35 + 0.65 * Math.min(1, moved / 4)) playCrackle(Math.min(1, moved / 6));
      if (step.slack && !s.slackSaid && len(sub(s.finger, s.grip.start)) > s.size.w * 0.12) {
        s.slackSaid = true;
        props.onHint?.("slack");
      }
      if (moved) props.onHint?.(null);
    }
    // Each tug shakes the pack a little; the shake dies away.
    s.shake = Math.min(1, s.shake * 0.86 + moved * 0.06);
    // Owner 2026-11-25 「真实碰撞体积」: pressed, the pack leans in under the finger; let go, it springs back and settles.
    const half = { x: s.size.w / 2, y: s.size.h / 2 };
    const leanTo = s.holding && !s.opened ? { x: clamp((s.finger.x - half.x) / half.x, -1, 1), y: clamp((s.finger.y - half.y) / half.y, -1, 1) } : { x: 0, y: 0 };
    s.leanVel = { x: (s.leanVel.x + (leanTo.x - s.lean.x) * 0.12) * 0.78, y: (s.leanVel.y + (leanTo.y - s.lean.y) * 0.12) * 0.78 };
    s.lean = add(s.lean, s.leanVel);
    const leaning = Math.min(1, Math.hypot(s.lean.x, s.lean.y));
    if (tilt.current) {
      tilt.current.style.translate = s.shake > 0.01 ? `${(Math.sin(now / 21) * s.shake * 1.8).toFixed(2)}px ${(Math.cos(now / 17) * s.shake * 1.3).toFixed(2)}px` : "";
      // The pressed side goes back: an axis across the press, through the middle.
      tilt.current.style.rotate = leaning > 0.003 ? `${(-s.lean.y).toFixed(3)} ${s.lean.x.toFixed(3)} 0 ${(leaning * LEAN_DEG).toFixed(2)}deg` : "";
    }
    // A flap hanging from a running tear folds up as the tear grows; let go, it settles back towards flat.
    const held = (s.holding || s.auto) && s.tear;
    const target = held && s.tear ? clamp(0.45 + (s.tear.length / s.size.w) * 1.7, 0, 2.2) : s.tear ? 0.25 : 0;
    s.foldVel = (s.foldVel + (target - s.fold) * 0.14) * 0.74;
    s.fold += s.foldVel;
    render();
    if (s.tear || s.pieces.length || s.removed) lightUp();
    const settling = Math.abs(s.foldVel) > 0.0004 || s.shake > 0.01 || leaning > 0.003 || Math.hypot(s.leanVel.x, s.leanVel.y) > 0.0005;
    if (s.holding || s.auto || settling || s.pieces.length) s.raf = requestAnimationFrame(loop);
    else s.raf = 0;
  };

  const kick = () => {
    if (!state.current.raf) state.current.raf = requestAnimationFrame(loop);
  };

  const local = (event: { clientX: number; clientY: number }): P => {
    const element = root.current;
    const s = state.current;
    if (!element) return { x: 0, y: 0 };
    const r = element.getBoundingClientRect();
    return { x: ((event.clientX - r.left) / r.width) * s.size.w, y: ((event.clientY - r.top) / r.height) * s.size.h };
  };

  const tearAll = () => {
    const s = shape();
    if (s.opened || props.disabled || s.auto) return;
    startAuto(s, 0);
    playRustle();
    kick();
  };

  /** What a press at `p` takes hold of: the strip of a running tear, an edge, or (in the middle) nothing. */
  const take = (s: State, p: P, touch: boolean): Grip | null => {
    const reach = (touch ? GRIP_TOUCH : GRIP) * s.size.w;
    const hang = hanging(s);
    if (s.tear && s.tear.dir && hang) {
      const onStrip = inside(hang.flap, p) || nearestOnEdge(hang.flap, p).d <= reach;
      if (onStrip) return { kind: "strip", at: s.tear.start, start: p, need: 0, inward: s.tear.dir };
    }
    const near = nearestOnEdge(s.body, p);
    if (near.d > reach) return null;
    const a = s.body[near.edge];
    const b = s.body[(near.edge + 1) % s.body.length];
    const atNotch = notches(s).some((q) => len(sub(q, near.p)) < s.size.w * 0.06);
    const onLip = isTorn(a, b);
    const onCrimp = near.p.y < SEAL * s.size.h || near.p.y > (1 - SEAL) * s.size.h;
    const need = (atNotch || onLip || onCrimp ? START_EASY : START_EDGE) * s.size.w;
    return { kind: "edge", at: near, start: p, need, inward: inwardAt(s.body, near) };
  };

  const onDown = (event: PointerEvent) => {
    const s = shape();
    if (props.disabled || s.opened || event.button !== 0) return;
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    s.holding = true;
    s.auto = null;
    s.slackSaid = false;
    const p = local(event);
    s.finger = p;
    s.last = { p, t: performance.now() };
    s.vel = { x: 0, y: 0 };
    s.grip = take(s, p, event.pointerType === "touch");
    if (!s.grip) {
      // The middle of the pack: fingers can't pinch foil there; it only pushes the pack (it leans under the press).
      props.onHint?.("edge");
    } else if (s.grip.kind === "edge" && s.tear) {
      // Another edge while a tear hangs half done: that one stays in the foil as a slit.
      slit(s);
    }
    playRustle();
    kick();
  };
  const onMove = (event: PointerEvent) => {
    const s = state.current;
    if (!s.holding || s.opened) return;
    const p = local(event);
    const now = performance.now();
    const dt = Math.max(1, now - s.last.t);
    s.vel = add(mul(s.vel, 0.6), mul(sub(p, s.last.p), 0.4 / dt));
    s.last = { p, t: now };
    s.finger = p;
    const grip = s.grip;
    if (grip?.kind === "edge") {
      const pulled = sub(p, grip.start);
      if (len(pulled) >= grip.need) {
        // The foil gives: the tear runs in from the edge, leaning the way the hand pulls along it.
        const along = sub(pulled, mul(grip.inward, pulled.x * grip.inward.x + pulled.y * grip.inward.y));
        const dir = norm(add(grip.inward, mul(norm(along), Math.min(1, len(along) / Math.max(1, len(pulled))) * 0.9)));
        begin(s, grip.at, dir.x * grip.inward.x + dir.y * grip.inward.y < 0.35 ? grip.inward : dir);
        grip.kind = "strip";
        playCrackle(0.8);
        props.onHint?.(null);
      } else if (len(pulled) > grip.need * 0.4) {
        // Stretching before it gives: a tremor and a creak.
        s.shake = Math.max(s.shake, 0.25 + (len(pulled) / grip.need) * 0.35);
        if (Math.random() < 0.15) playCrackle(0.2);
      }
    }
    kick();
  };
  const onUp = () => {
    const s = state.current;
    if (!s.holding) return;
    s.holding = false;
    s.grip = null;
    if (s.opened) {
      kick();
      return;
    }
    // Let go: the tear stays where it is and the strip hangs from it. A tear that never ran is only a crease.
    if (s.tear && s.tear.path.length === 0) s.tear = null;
    if (!s.tear) {
      s.shake = Math.max(s.shake, 0.5);
      playRustle();
    }
    kick();
  };


  // Sealed, the breath of light at the notches is already there.
  const sealedLight = () => {
    if (props.disabled || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    lightUp();
  };
  sealedLight();

  return {
    down: onDown,
    move: onMove,
    up: onUp,
    tearAll,
    /** `disabled` changed. */
    sync: sealedLight,
    destroy() {
      cancelAnimationFrame(state.current.raf);
      cancelAnimationFrame(lightRaf.current);
      lightRaf.current = 0;
    },
  };
}
