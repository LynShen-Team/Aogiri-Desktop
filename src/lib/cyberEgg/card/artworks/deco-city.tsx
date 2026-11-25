/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「不夜城」 (SSR): an art deco skyline in gilt on black. Searchlights sweep, windows come and go, a
// fine rain falls in front, mist lies in the streets.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { polyline, seeded, type Pt } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

interface Tower {
  x: number;
  w: number;
  h: number;
  /** Setbacks: [rise above the previous step, inset each side]. */
  steps: Array<[number, number]>;
  spire?: number;
  stripes: number;
}

const BASE = AH - 18;

const BACK: Tower[] = [
  { x: 2, w: 40, h: 120, steps: [[16, 6], [12, 5]], stripes: 3 },
  { x: 38, w: 34, h: 150, steps: [[14, 5]], stripes: 2 },
  { x: 182, w: 36, h: 160, steps: [[18, 6], [10, 4]], stripes: 2 },
  { x: 214, w: 40, h: 128, steps: [[14, 6]], stripes: 3 },
];
const FRONT: Tower[] = [
  { x: 18, w: 46, h: 96, steps: [[12, 6]], stripes: 3 },
  { x: 62, w: 42, h: 170, steps: [[18, 6], [14, 5], [10, 4]], spire: 26, stripes: 3 },
  { x: 100, w: 54, h: 196, steps: [[20, 7], [16, 6], [12, 6], [9, 5]], spire: 34, stripes: 5 },
  { x: 150, w: 42, h: 182, steps: [[18, 6], [14, 5], [10, 4]], spire: 30, stripes: 3 },
  { x: 190, w: 46, h: 104, steps: [[12, 6]], stripes: 3 },
];

/** A stepped (ziggurat) tower outline from its foot, mirrored about its axis. */
function towerPath(t: Tower) {
  let l = t.x;
  let r = t.x + t.w;
  let y = BASE - t.h;
  const left: Pt[] = [[l, BASE], [l, y]];
  for (const [rise, inset] of t.steps) {
    l += inset;
    r -= inset;
    left.push([l, y], [l, y - rise]);
    y -= rise;
  }
  const mid = (l + r) / 2;
  const top: Pt[] = t.spire ? [[mid - 2.2, y], [mid, y - t.spire], [mid + 2.2, y]] : [];
  const right: Pt[] = left.map(([px, py]): Pt => [2 * t.x + t.w - px, py]).reverse();
  return polyline([...left, ...top, ...right], true);
}

/** Deco pinstripes down the facade and a grid of windows (some lit). */
function facade(t: Tower, random: () => number) {
  let stripes = "";
  const gap = t.w / (t.stripes + 1);
  for (let k = 1; k <= t.stripes; k += 1) stripes += `M${(t.x + k * gap).toFixed(1)} ${BASE - t.h + 8}V${BASE - 4}`;
  const windows: Array<{ x: number; y: number; lit: number; blink: boolean; delay: number }> = [];
  for (let k = 0; k <= t.stripes; k += 1) {
    const cx = t.x + gap * (k + 0.5);
    for (let y = BASE - t.h + 10; y < BASE - 8; y += 6.5) {
      const r = random();
      if (r < 0.42) continue;
      windows.push({ x: cx - 1.2, y, lit: r > 0.86 ? 1 : 0.35 + random() * 0.3, blink: random() < 0.08, delay: random() * 9 });
    }
  }
  return { stripes, windows };
}

function Towers({ towers, foil, seed, fillColor, lineWidth }: { towers: Tower[]; foil: string; seed: number; fillColor: string; lineWidth: number }) {
  const shapes = useMemo(() => {
    const random = seeded(seed);
    return towers.map((t) => ({ outline: towerPath(t), ...facade(t, random) }));
  }, [towers, seed]);
  return (
    <>
      {shapes.map((shape, index) => (
        <g key={index}>
          <path d={shape.outline} fill={fillColor} stroke={foil} strokeWidth={lineWidth} strokeLinejoin="miter" />
          <path d={shape.stripes} stroke={foil} strokeWidth={0.3} opacity={0.55} />
          {shape.windows.map((w, k) => (
            <rect
              key={k}
              x={w.x}
              y={w.y}
              width={2.4}
              height={3.2}
              fill={w.lit === 1 ? "#ffdc8f" : "#c9a14e"}
              opacity={w.lit}
              className={w.blink ? "ce-blink" : undefined}
              style={w.blink ? { animationDelay: `${-w.delay}s` } : undefined}
            />
          ))}
        </g>
      ))}
    </>
  );
}

export const DecoCityArt = memo(function DecoCityArt({ foil, uid }: ArtProps) {
  const sun = useMemo(() => {
    let rays = "";
    for (let k = 0; k <= 36; k += 1) {
      const a = Math.PI + (k / 36) * Math.PI;
      rays += `M${(126 + Math.cos(a) * 58).toFixed(1)} ${(BASE - 70 + Math.sin(a) * 58).toFixed(1)}L${(126 + Math.cos(a) * (k % 2 ? 104 : 124)).toFixed(1)} ${(BASE - 70 + Math.sin(a) * (k % 2 ? 104 : 124)).toFixed(1)}`;
    }
    let arcs = "";
    for (let r = 26; r <= 56; r += 6) arcs += `M${126 - r} ${BASE - 70}A${r} ${r} 0 0 1 ${126 + r} ${BASE - 70}`;
    return { rays, arcs };
  }, []);
  const rain = useMemo(() => {
    const random = seeded(41);
    let d = "";
    for (let k = 0; k < 90; k += 1) {
      const x = random() * (AW + 60) - 30;
      const y = random() * AH;
      const length = 5 + random() * 9;
      d += `M${x.toFixed(1)} ${y.toFixed(1)}l${(-length * 0.22).toFixed(1)} ${length.toFixed(1)}`;
    }
    return d;
  }, []);
  return (
    <>
      <Layer depth={-1.6}>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#07060a" />
            <stop offset="0.65" stopColor="#15100b" />
            <stop offset="1" stopColor="#2a1d10" />
          </linearGradient>
          <linearGradient id={`${uid}-beam`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffd98a" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        <g className="ce-beam" style={{ transformOrigin: `70px ${BASE - 150}px` }}>
          <path d={`M68 ${BASE - 150}L40 0L82 0Z`} fill={`url(#${uid}-beam)`} />
        </g>
        <g className="ce-beam ce-beam-2" style={{ transformOrigin: `178px ${BASE - 160}px` }}>
          <path d={`M176 ${BASE - 160}L170 0L214 0Z`} fill={`url(#${uid}-beam)`} />
        </g>
        <path d={sun.rays} stroke={foil} strokeWidth={0.35} opacity={0.5} />
        <path d={sun.arcs} fill="none" stroke={foil} strokeWidth={0.4} opacity={0.75} />
        {/* A few stars, steady. */}
        {[
          [22, 30],
          [60, 18],
          [210, 26],
          [232, 58],
          [150, 12],
          [104, 40],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={0.6} fill="#e9d3a0" opacity={0.7} />
        ))}
      </Layer>
      <Layer depth={-0.7}>
        <Towers towers={BACK} foil={foil} seed={7} fillColor="#100c09" lineWidth={0.45} />
      </Layer>
      <Layer depth={1} cast>
        <Towers towers={FRONT} foil={foil} seed={19} fillColor="#0b0907" lineWidth={0.7} />
        <defs>
          <linearGradient id={`${uid}-mist`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1f14" stopOpacity="0" />
            <stop offset="0.6" stopColor="#3a2b1a" stopOpacity="0.75" />
            <stop offset="1" stopColor="#120d08" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x={0} y={BASE - 40} width={AW} height={AH - BASE + 40} fill={`url(#${uid}-mist)`} />
        <path d={`M0 ${BASE}H${AW}`} stroke={foil} strokeWidth={0.6} />
      </Layer>
      <Layer depth={-0.1} className="ce-rain-layer">
        <g className="ce-rain">
          <path d={rain} stroke="#e9d3a0" strokeWidth={0.3} opacity={0.35} />
          <path d={rain} stroke="#e9d3a0" strokeWidth={0.3} opacity={0.35} transform={`translate(61 ${-AH})`} />
        </g>
      </Layer>
    </>
  );
});
