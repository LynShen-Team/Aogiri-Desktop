/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Pack 3 「东方」 (owner 2026-11-24: redrawn to stand with pack 1): old things of the East drawn as finely as a
// patent plate, in bronze and silk; then a garden, a street, the sky. Ten pictures, each with its own motion.
import { ceJsx, CeFragment, memo, useMemo, type ReactNode } from "../jsx";
import { polyline, seeded, type Pt } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer, Spin } from "../layer";

const INK = "#2a2420";
const PAPER = "#efe7d6";
const SONG = "'Songti SC', 'STSong', 'Noto Serif SC', serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const VERMILION = "#b5402e";

const f1 = (value: number) => value.toFixed(1);
const circle = (cx: number, cy: number, r: number) => `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
const quad = (points: Pt[]) => polyline(points, true);

/** A closed curve through the midpoints of a polygon. */
function smoothClosed(points: Pt[]) {
  const n = points.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[n - 1], points[0]);
  let d = `M${f1(start[0])} ${f1(start[1])}`;
  for (let k = 0; k < n; k += 1) {
    const m = mid(points[k], points[(k + 1) % n]);
    d += `Q${f1(points[k][0])} ${f1(points[k][1])} ${f1(m[0])} ${f1(m[1])}`;
  }
  return `${d}Z`;
}

/** An open curve from the first point to the last, smoothed through the ones between. */
function smoothOpen(points: Pt[]) {
  let d = `M${f1(points[0][0])} ${f1(points[0][1])}`;
  for (let k = 1; k < points.length - 1; k += 1) {
    const m: Pt = [(points[k][0] + points[k + 1][0]) / 2, (points[k][1] + points[k + 1][1]) / 2];
    d += `Q${f1(points[k][0])} ${f1(points[k][1])} ${f1(m[0])} ${f1(m[1])}`;
  }
  const last = points[points.length - 1];
  return `${d}L${f1(last[0])} ${f1(last[1])}`;
}

/** Catmull–Rom: a smooth line through the points, `steps` samples per span. */
function catmull(points: Pt[], steps: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < points.length - 1; k += 1) {
    const p0 = points[Math.max(0, k - 1)];
    const p1 = points[k];
    const p2 = points[k + 1];
    const p3 = points[Math.min(points.length - 1, k + 2)];
    for (let j = 0; j < steps; j += 1) {
      const t = j / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (i: 0 | 1) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

interface Frame {
  p: Pt;
  /** Unit tangent, along the line. */
  t: Pt;
  /** Unit normal, to the left of the line. */
  n: Pt;
  w: number;
}

function frames(points: Pt[], width: (t: number) => number): Frame[] {
  return points.map((p, k) => {
    const a = points[Math.max(0, k - 1)];
    const b = points[Math.min(points.length - 1, k + 1)];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t: Pt = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
    return { p, t, n: [t[1], -t[0]], w: width(k / (points.length - 1)) };
  });
}

/** A tube round a line: the outline of a body, a branch or a limb whose width follows `width`. */
function tube(list: Frame[], scale = 1) {
  const left = list.map((f): Pt => [f.p[0] + f.n[0] * f.w * scale, f.p[1] + f.n[1] * f.w * scale]);
  const right = list.map((f): Pt => [f.p[0] - f.n[0] * f.w * scale, f.p[1] - f.n[1] * f.w * scale]);
  return polyline([...left, ...right.reverse()], true);
}

/** A spiral that winds in: the curl of a cloud, a wave, a scroll. */
function spiral(cx: number, cy: number, r: number, turns: number, dir = 1, a0 = 0) {
  const points: Pt[] = [];
  for (let k = 0; k <= 28; k += 1) {
    const t = k / 28;
    const a = a0 + dir * t * turns * Math.PI * 2;
    const rr = r * (1 - 0.82 * t);
    points.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return smoothOpen(points);
}

/** 祥云 (a ruyi cloud): lobes on a flat base, each lobe's edge curling inwards, and a tapered tail. */
function xiangyun(x: number, y: number, s: number, flip = 1, seed = 1) {
  const random = seeded(seed);
  const lobes: Array<[number, number, number]> = [
    [-1.1, -0.5, 0.6],
    [0, -0.92, 0.78],
    [1.15, -0.48, 0.58],
    [2.05, -0.3, 0.4],
  ].map(([lx, ly, lr]) => [x + flip * lx * s, y + ly * s, lr * s * (0.92 + random() * 0.16)]);
  const curls = lobes
    .map(([cx, cy, r], k) => {
      // Start on the lobe's lower edge and wind in, the way the outline of a ruyi cloud turns into its curl.
      const dir = (k % 2 ? 1 : -1) * flip;
      const a0 = Math.PI / 2 + dir * 0.5;
      const points: Pt[] = [];
      for (let j = 0; j <= 30; j += 1) {
        const t = j / 30;
        const a = a0 + dir * t * Math.PI * 2.1;
        const rr = r * (0.96 - 0.78 * t);
        points.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      return smoothOpen(points);
    })
    .join("");
  const x0 = x - flip * 1.7 * s;
  const x1 = x + flip * 2.45 * s;
  const body = lobes.map(([cx, cy, r]) => circle(cx, cy, r)).join("") + quad([[x0, y], [x0, y - 0.4 * s], [x1, y - 0.4 * s], [x1, y]]);
  const tailLine: Pt[] = [
    [x1 - flip * 0.2 * s, y - 0.16 * s],
    [x1 + flip * 1.2 * s, y + 0.2 * s],
    [x1 + flip * 2.2 * s, y - 0.4 * s],
    [x1 + flip * 3.2 * s, y - 0.2 * s],
  ];
  const tail = tube(frames(catmull(tailLine, 6), (t) => s * 0.2 * (1 - t * 0.92)));
  return { body: body + tail, curls };
}

function RuyiCloud({ cloud, foil, fill, line = 1.3 }: { cloud: ReturnType<typeof xiangyun>; foil: string; fill: string; line?: number }) {
  return (
    <>
      <path d={cloud.body} fill="none" stroke={foil} strokeWidth={line * 2} strokeLinejoin="round" />
      <path d={cloud.body} fill={fill} />
      <path d={cloud.curls} fill="none" stroke={foil} strokeWidth={line} strokeLinecap="round" />
      <path d={cloud.curls} fill="none" stroke={fill} strokeWidth={line * 0.35} strokeLinecap="round" opacity={0.8} />
    </>
  );
}

/** Rice paper: a warm ground, darker at the edges, with a few fibres. */
function RicePaper({ uid, tone = PAPER, edge = "#d8ccb2" }: { uid: string; tone?: string; edge?: string }) {
  const fibres = useMemo(() => {
    const random = seeded(11);
    let d = "";
    for (let k = 0; k < 46; k += 1) {
      const x = random() * AW;
      const y = random() * AH;
      const l = 4 + random() * 12;
      const a = random() * Math.PI;
      d += `M${f1(x)} ${f1(y)}q${f1(Math.cos(a) * l * 0.5 + 1.5)} ${f1(Math.sin(a) * l * 0.5 - 1.5)} ${f1(Math.cos(a) * l)} ${f1(Math.sin(a) * l)}`;
    }
    return d;
  }, []);
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-rp`} cx="0.5" cy="0.45" r="0.78">
          <stop offset="0" stopColor={tone} />
          <stop offset="0.8" stopColor={edge} />
          <stop offset="1" stopColor="#c8b994" />
        </radialGradient>
      </defs>
      <rect {...FULL} fill={`url(#${uid}-rp)`} />
      <path d={fibres} fill="none" stroke="#8a7450" strokeWidth={0.3} opacity={0.18} />
    </>
  );
}

function Hatch({ id, angle = 40, gap = 1.8, color = INK, width = 0.45 }: { id: string; angle?: number; gap?: number; color?: string; width?: number }) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
      <path d={`M0 0V${gap}`} stroke={color} strokeWidth={width} />
    </pattern>
  );
}

function Caption({ x, y, anchor = "start", color = INK, children }: { x: number; y: number; anchor?: "start" | "middle" | "end"; color?: string; children: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={SONG} fontSize={7.5} letterSpacing={0.6} fill={color} opacity={0.75}>
      {children}
    </text>
  );
}

function Numeral({ x, y, n, to }: { x: number; y: number; n: number; to: Pt }) {
  return (
    <g>
      <path d={`M${f1(x + 3)} ${f1(y - 2)}Q${f1((x + to[0]) / 2 + 6)} ${f1((y + to[1]) / 2 - 6)} ${f1(to[0])} ${f1(to[1])}`} fill="none" stroke={INK} strokeWidth={0.45} />
      <text x={x} y={y} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={8} fill={INK}>
        {n}
      </text>
    </g>
  );
}

// ——— N 算盘: an abacus as a patent plate, set to 14 830 000; beads slide as it counts ———
const AB_X0 = 30;
const AB_Y0 = 46;
const AB_X1 = 222;
const AB_Y1 = 186;
const AB_T = 9;
const AB_IN = { x0: AB_X0 + AB_T, y0: AB_Y0 + AB_T, x1: AB_X1 - AB_T, y1: AB_Y1 - AB_T };
const AB_BEAM0 = 84;
const AB_BEAM1 = 90;
const AB_D: Pt = [9, -6];
const AB_DIGITS = [0, 1, 4, 8, 3, 0, 0, 0, 0];
const AB_STEP = (AB_IN.x1 - AB_IN.x0) / 10;

const beadPath = (x: number, y: number) =>
  `M${f1(x - 7.4)} ${f1(y)}Q${f1(x - 5.8)} ${f1(y - 4.4)} ${f1(x - 2)} ${f1(y - 4.6)}H${f1(x + 2)}Q${f1(x + 5.8)} ${f1(y - 4.4)} ${f1(x + 7.4)} ${f1(y)}Q${f1(x + 5.8)} ${f1(y + 4.4)} ${f1(x + 2)} ${f1(y + 4.6)}H${f1(x - 2)}Q${f1(x - 5.8)} ${f1(y + 4.4)} ${f1(x - 7.4)} ${f1(y)}Z`;
const beadShade = (x: number, y: number) => `M${f1(x - 7.4)} ${f1(y)}Q${f1(x - 5.8)} ${f1(y + 4.4)} ${f1(x - 2)} ${f1(y + 4.6)}H${f1(x + 2)}Q${f1(x + 5.8)} ${f1(y + 4.4)} ${f1(x + 7.4)} ${f1(y)}Z`;

interface Bead {
  x: number;
  y: number;
  /** How far the bead slides when it counts (px), if it does. */
  move?: number;
  delay?: number;
}

function abacusBeads(): Bead[] {
  const beads: Bead[] = [];
  const hx = AB_D[0] / 2;
  const hy = AB_D[1] / 2;
  AB_DIGITS.forEach((digit, k) => {
    const x = AB_IN.x0 + AB_STEP * (k + 1) + hx;
    const upper = digit >= 5 ? [AB_BEAM0 - 5, AB_IN.y0 + 5] : [AB_IN.y0 + 5, AB_IN.y0 + 14.2];
    upper.forEach((y, j) => beads.push({ x, y: y + hy, move: k === 7 && j === 1 ? AB_BEAM0 - 5 - (AB_IN.y0 + 14.2) : undefined, delay: -1.5 }));
    const counted = digit % 5;
    for (let i = 0; i < counted; i += 1) beads.push({ x, y: AB_BEAM1 + 5 + i * 9.2 + hy });
    for (let j = 0; j < 5 - counted; j += 1) {
      const y = AB_IN.y1 - 5 - j * 9.2;
      beads.push({ x, y: y + hy, move: k === 8 && j === 4 - counted ? AB_BEAM1 + 5 - y : undefined });
    }
  });
  return beads;
}

function BeadShape({ bead, uid }: { bead: Bead; uid: string }) {
  return (
    <>
      <path d={beadPath(bead.x, bead.y)} fill="#f3ecdc" stroke={INK} strokeWidth={0.6} />
      <path d={beadShade(bead.x, bead.y)} fill={`url(#${uid}-h)`} opacity={0.7} />
      <path d={`M${f1(bead.x - 7.4)} ${f1(bead.y)}H${f1(bead.x + 7.4)}`} stroke={INK} strokeWidth={0.35} />
      <path d={`M${f1(bead.x - 4.5)} ${f1(bead.y - 2.6)}Q${f1(bead.x - 1)} ${f1(bead.y - 4)} ${f1(bead.x + 2)} ${f1(bead.y - 3.6)}`} fill="none" stroke="#fffaf0" strokeWidth={0.7} />
    </>
  );
}

export const AbacusArt = memo(function AbacusArt({ uid }: ArtProps) {
  const beads = useMemo(() => abacusBeads(), []);
  const [dx, dy] = AB_D;
  const rods = Array.from({ length: 9 }, (_, k) => AB_IN.x0 + AB_STEP * (k + 1) + dx / 2);
  const frameRing = `M${AB_X0} ${AB_Y0}H${AB_X1}V${AB_Y1}H${AB_X0}ZM${AB_IN.x0} ${AB_IN.y0}V${AB_IN.y1}H${AB_IN.x1}V${AB_IN.y0}Z`;
  return (
    <>
      <Layer depth={-1.2}>
        <RicePaper uid={uid} tone="#f0e9da" />
        <rect x={8} y={8} width={AW - 16} height={AH - 16} fill="none" stroke={INK} strokeWidth={0.7} opacity={0.55} />
        <rect x={11} y={11} width={AW - 22} height={AH - 22} fill="none" stroke={INK} strokeWidth={0.3} opacity={0.55} />
        <text x={20} y={26} fontFamily={SERIF} fontStyle="italic" fontSize={8} fill={INK} opacity={0.8}>
          Fig. 1
        </text>
        <text x={AW - 20} y={26} textAnchor="end" fontFamily={SERIF} fontSize={6} letterSpacing={0.6} fill={INK} opacity={0.6}>
          № 14,830,000
        </text>
        <Caption x={20} y={AH - 18}>
          算盘 · 珠算
        </Caption>
      </Layer>
      <Layer depth={0.2}>
        <defs>
          <Hatch id={`${uid}-h`} angle={-40} gap={1.5} />
          <Hatch id={`${uid}-h2`} angle={-40} gap={1} width={0.5} />
        </defs>
        {/* What shows through the opening: the inner faces of the left bar and of the bottom bar. */}
        <path d={quad([[AB_IN.x0, AB_IN.y0], [AB_IN.x0 + dx, AB_IN.y0 + dy], [AB_IN.x0 + dx, AB_IN.y1 + dy], [AB_IN.x0, AB_IN.y1]])} fill="#e4d9c2" stroke={INK} strokeWidth={0.5} />
        <path d={quad([[AB_IN.x0, AB_IN.y0], [AB_IN.x0 + dx, AB_IN.y0 + dy], [AB_IN.x0 + dx, AB_IN.y1 + dy], [AB_IN.x0, AB_IN.y1]])} fill={`url(#${uid}-h)`} opacity={0.6} />
        <path d={quad([[AB_IN.x0, AB_IN.y1], [AB_IN.x0 + dx, AB_IN.y1 + dy], [AB_IN.x1 + dx, AB_IN.y1 + dy], [AB_IN.x1, AB_IN.y1]])} fill="#e9dfca" stroke={INK} strokeWidth={0.5} />
        {/* The beam's top face, the rods. */}
        <path d={quad([[AB_IN.x0, AB_BEAM0], [AB_IN.x0 + dx, AB_BEAM0 + dy], [AB_IN.x1 + dx, AB_BEAM0 + dy], [AB_IN.x1, AB_BEAM0]])} fill="#e9dfca" stroke={INK} strokeWidth={0.5} />
        {rods.map((x) => (
          <path key={x} d={`M${f1(x)} ${AB_IN.y0 + dy / 2}V${AB_IN.y1 + dy / 2}`} stroke={INK} strokeWidth={1.1} />
        ))}
      </Layer>
      <Layer depth={0.7} cast>
        {beads.map((bead, index) =>
          bead.move ? (
            <g key={index} className="ce-anim ce-bead-move" style={{ ["--dy" as string]: `${bead.move.toFixed(1)}px`, animationDelay: `${bead.delay ?? 0}s` }}>
              <BeadShape bead={bead} uid={uid} />
            </g>
          ) : (
            <BeadShape key={index} bead={bead} uid={uid} />
          ),
        )}
        {/* The beam's front, the frame's top and right faces, the frame. */}
        <rect x={AB_IN.x0} y={AB_BEAM0} width={AB_IN.x1 - AB_IN.x0} height={AB_BEAM1 - AB_BEAM0} fill="#efe6d2" stroke={INK} strokeWidth={0.7} />
        {rods.map((x) => (
          <circle key={x} cx={x - dx / 2} cy={(AB_BEAM0 + AB_BEAM1) / 2} r={0.9} fill={INK} />
        ))}
        <path d={quad([[AB_X0, AB_Y0], [AB_X0 + dx, AB_Y0 + dy], [AB_X1 + dx, AB_Y0 + dy], [AB_X1, AB_Y0]])} fill="#e7dcc5" stroke={INK} strokeWidth={0.8} />
        <path d={quad([[AB_X0, AB_Y0], [AB_X0 + dx, AB_Y0 + dy], [AB_X1 + dx, AB_Y0 + dy], [AB_X1, AB_Y0]])} fill={`url(#${uid}-h)`} opacity={0.35} />
        <path d={quad([[AB_X1, AB_Y0], [AB_X1 + dx, AB_Y0 + dy], [AB_X1 + dx, AB_Y1 + dy], [AB_X1, AB_Y1]])} fill="#ddd0b5" stroke={INK} strokeWidth={0.8} />
        <path d={quad([[AB_X1, AB_Y0], [AB_X1 + dx, AB_Y0 + dy], [AB_X1 + dx, AB_Y1 + dy], [AB_X1, AB_Y1]])} fill={`url(#${uid}-h2)`} opacity={0.6} />
        <path d={frameRing} fill="#efe6d2" fillRule="evenodd" stroke={INK} strokeWidth={0.9} />
        <path d={frameRing} fill={`url(#${uid}-h)`} fillRule="evenodd" opacity={0.18} />
        <path d={`M${AB_X0} ${AB_Y0}L${AB_IN.x0} ${AB_IN.y0}M${AB_X1} ${AB_Y0}L${AB_IN.x1} ${AB_IN.y0}M${AB_X0} ${AB_Y1}L${AB_IN.x0} ${AB_IN.y1}M${AB_X1} ${AB_Y1}L${AB_IN.x1} ${AB_IN.y1}`} stroke={INK} strokeWidth={0.5} />
      </Layer>
      <Layer depth={1.4} cast>
        <Numeral x={20} y={40} n={1} to={[33, 52]} />
        <Numeral x={98} y={34} n={2} to={[113, 72]} />
        <Numeral x={66} y={204} n={3} to={[96, 96]} />
        <Numeral x={240} y={78} n={4} to={[214, 87]} />
        <Numeral x={240} y={150} n={5} to={[202, 150]} />
        {/* Fig. 2: one bead, larger, with its hole, lifted off the rod. */}
        <path d="M178 196V258" stroke={INK} strokeWidth={0.45} strokeDasharray="3 2" />
        <g className="ce-anim ce-bob">
          <g transform="translate(178 228) scale(2.6)">
            <path d={beadPath(0, 0)} fill="#f3ecdc" stroke={INK} strokeWidth={0.3} />
            <path d={beadShade(0, 0)} fill={`url(#${uid}-h)`} opacity={0.7} />
            <path d="M-7.4 0H7.4" stroke={INK} strokeWidth={0.2} />
            <ellipse cx={0} cy={-4.6} rx={1.4} ry={0.45} fill={INK} />
            <path d="M-4.5 -2.6Q-1 -4 2 -3.6" fill="none" stroke="#fffaf0" strokeWidth={0.4} />
          </g>
        </g>
        <text x={204} y={258} fontFamily={SERIF} fontStyle="italic" fontSize={7} fill={INK} opacity={0.8}>
          Fig. 2
        </text>
      </Layer>
    </>
  );
});

// ——— N 活字: a clay type tray and one sort lifted out, enlarged, its character cut in reverse ———
const TY_O: Pt = [126, 150];
const tyIso = (x: number, y: number, z = 0): Pt => [TY_O[0] + (x - y) * 0.866, TY_O[1] + (x + y) * 0.5 - z];
const SORT_O: Pt = [126, 20];
const sortIso = (x: number, y: number, z = 0): Pt => [SORT_O[0] + (x - y) * 0.866, SORT_O[1] + (x + y) * 0.5 - z];
const TY_GLYPHS = "赛博鸡蛋机器之心星海东方算力活字印书天下文章";
const TY_HOLE = { i: 2, j: 1 };

/** A glyph lying on the top face, cut in reverse (as type is). */
const mirroredOnTop = (x: number, y: number, s: number) => `matrix(${f1(-0.866 * s)} ${f1(-0.5 * s)} ${f1(-0.866 * s)} ${f1(0.5 * s)} ${f1(x)} ${f1(y)})`;

export const TypeArt = memo(function TypeArt({ uid }: ArtProps) {
  const cells = useMemo(() => {
    const list: Array<{ i: number; j: number; top: string; c: Pt; glyph: string }> = [];
    for (let j = 0; j < 4; j += 1) {
      for (let i = 0; i < 5; i += 1) {
        const x0 = i * 16 + 1;
        const y0 = j * 16 + 1;
        list.push({ i, j, top: quad([tyIso(x0, y0), tyIso(x0 + 14, y0), tyIso(x0 + 14, y0 + 14), tyIso(x0, y0 + 14)]), c: tyIso(x0 + 7, y0 + 7), glyph: TY_GLYPHS[(j * 5 + i) % TY_GLYPHS.length] });
      }
    }
    return list;
  }, []);
  const hx = TY_HOLE.i * 16 + 1;
  const hy = TY_HOLE.j * 16 + 1;
  return (
    <>
      <Layer depth={-1.2}>
        <RicePaper uid={uid} tone="#f0e9da" />
        <rect x={8} y={8} width={AW - 16} height={AH - 16} fill="none" stroke={INK} strokeWidth={0.7} opacity={0.55} />
        <rect x={11} y={11} width={AW - 22} height={AH - 22} fill="none" stroke={INK} strokeWidth={0.3} opacity={0.55} />
        <text x={20} y={26} fontFamily={SERIF} fontStyle="italic" fontSize={8} fill={INK} opacity={0.8}>
          Fig. 2
        </text>
        <Caption x={AW - 20} y={AH - 18} anchor="end">
          泥活字 · 毕昇 · 1041
        </Caption>
      </Layer>
      <Layer depth={0.3} cast>
        <defs>
          <Hatch id={`${uid}-h`} angle={-30} gap={1.6} />
          <Hatch id={`${uid}-h2`} angle={60} gap={1.1} width={0.5} />
        </defs>
        {/* The tray: its two outer faces, its rim, the floor between the sorts. */}
        <path d={quad([tyIso(-6, 70, 3), tyIso(86, 70, 3), tyIso(86, 70, -12), tyIso(-6, 70, -12)])} fill="#cdb084" stroke={INK} strokeWidth={0.8} />
        <path d={quad([tyIso(-6, 70, 3), tyIso(86, 70, 3), tyIso(86, 70, -12), tyIso(-6, 70, -12)])} fill={`url(#${uid}-h)`} opacity={0.45} />
        <path d={quad([tyIso(86, -6, 3), tyIso(86, 70, 3), tyIso(86, 70, -12), tyIso(86, -6, -12)])} fill="#b7976a" stroke={INK} strokeWidth={0.8} />
        <path d={quad([tyIso(86, -6, 3), tyIso(86, 70, 3), tyIso(86, 70, -12), tyIso(86, -6, -12)])} fill={`url(#${uid}-h2)`} opacity={0.55} />
        <path d={`${quad([tyIso(-6, -6, 3), tyIso(86, -6, 3), tyIso(86, 70, 3), tyIso(-6, 70, 3)])}${quad([tyIso(0, 0, 3), tyIso(0, 64, 3), tyIso(80, 64, 3), tyIso(80, 0, 3)])}`} fill="#d9bf92" fillRule="evenodd" stroke={INK} strokeWidth={0.8} />
        <path d={quad([tyIso(0, 0, 0), tyIso(80, 0, 0), tyIso(80, 64, 0), tyIso(0, 64, 0)])} fill="#3a2f25" />
        <path d={quad([tyIso(0, 0, 3), tyIso(80, 0, 3), tyIso(80, 0, 0), tyIso(0, 0, 0)]) + quad([tyIso(0, 0, 3), tyIso(0, 64, 3), tyIso(0, 64, 0), tyIso(0, 0, 0)])} fill="#8a6f4a" />
        {cells.map((cell) =>
          cell.i === TY_HOLE.i && cell.j === TY_HOLE.j ? (
            <g key={`${cell.i}-${cell.j}`}>
              <path d={cell.top} fill="#1c1611" />
              <path d={quad([tyIso(hx, hy), tyIso(hx + 14, hy), tyIso(hx + 14, hy, -9), tyIso(hx, hy, -9)])} fill="#6b5638" />
              <path d={quad([tyIso(hx, hy), tyIso(hx, hy + 14), tyIso(hx, hy + 14, -9), tyIso(hx, hy, -9)])} fill="#54432c" />
            </g>
          ) : (
            <g key={`${cell.i}-${cell.j}`}>
              <path d={cell.top} fill="#dcc49c" stroke={INK} strokeWidth={0.35} />
              <text transform={mirroredOnTop(cell.c[0], cell.c[1], 1)} textAnchor="middle" dominantBaseline="central" fontFamily={SONG} fontSize={10} fontWeight={700} fill="#3b2c1e">
                {cell.glyph}
              </text>
            </g>
          ),
        )}
        {/* An impression, the right way round, with a seal. */}
        <g transform="translate(18 196) rotate(-7)">
          <rect x={0} y={0} width={46} height={54} fill="#f7f1e3" stroke={INK} strokeWidth={0.4} />
          <text x={23} y={38} textAnchor="middle" fontFamily={SONG} fontSize={30} fontWeight={700} fill="#231b14" opacity={0.92}>
            活
          </text>
          <rect x={32} y={42} width={10} height={10} rx={1} fill={VERMILION} />
          <text x={37} y={49.6} textAnchor="middle" fontFamily={SONG} fontSize={6.5} fill="#f6e9d8">
            昇
          </text>
        </g>
      </Layer>
      <Layer depth={1.4} cast>
        {/* Dashed lines back to the empty place in the tray. */}
        <path d={`M${f1(sortIso(0, 44, -58)[0])} ${f1(sortIso(0, 44, -58)[1])}L${f1(tyIso(hx, hy + 14)[0])} ${f1(tyIso(hx, hy + 14)[1])}M${f1(sortIso(44, 44, -58)[0])} ${f1(sortIso(44, 44, -58)[1])}L${f1(tyIso(hx + 14, hy + 14)[0])} ${f1(tyIso(hx + 14, hy + 14)[1])}M${f1(sortIso(44, 0, -58)[0])} ${f1(sortIso(44, 0, -58)[1])}L${f1(tyIso(hx + 14, hy)[0])} ${f1(tyIso(hx + 14, hy)[1])}`} stroke={INK} strokeWidth={0.45} strokeDasharray="3 2" />
        <g className="ce-anim ce-bob">
          <path d={quad([sortIso(0, 44), sortIso(44, 44), sortIso(44, 44, -58), sortIso(0, 44, -58)])} fill="#d6bd92" stroke={INK} strokeWidth={0.9} />
          <path d={quad([sortIso(0, 44), sortIso(44, 44), sortIso(44, 44, -58), sortIso(0, 44, -58)])} fill={`url(#${uid}-h)`} opacity={0.4} />
          <path d={quad([sortIso(44, 0), sortIso(44, 44), sortIso(44, 44, -58), sortIso(44, 0, -58)])} fill="#b89a6e" stroke={INK} strokeWidth={0.9} />
          <path d={quad([sortIso(44, 0), sortIso(44, 44), sortIso(44, 44, -58), sortIso(44, 0, -58)])} fill={`url(#${uid}-h2)`} opacity={0.55} />
          {/* The nick on the side. */}
          <path d={`M${f1(sortIso(0, 44, -45)[0])} ${f1(sortIso(0, 44, -45)[1])}L${f1(sortIso(44, 44, -45)[0])} ${f1(sortIso(44, 44, -45)[1])}M${f1(sortIso(0, 44, -49)[0])} ${f1(sortIso(0, 44, -49)[1])}L${f1(sortIso(44, 44, -49)[0])} ${f1(sortIso(44, 44, -49)[1])}`} stroke={INK} strokeWidth={0.6} />
          <path d={quad([sortIso(0, 0), sortIso(44, 0), sortIso(44, 44), sortIso(0, 44)])} fill="#e3cda7" stroke={INK} strokeWidth={0.9} />
          {/* The character stands up from the face: its side first, then its inked top. */}
          <text transform={mirroredOnTop(SORT_O[0], SORT_O[1] + 22 + 1.6, 1)} textAnchor="middle" dominantBaseline="central" fontFamily={SONG} fontSize={31} fontWeight={700} fill="#6e5636">
            活
          </text>
          <text transform={mirroredOnTop(SORT_O[0], SORT_O[1] + 22, 1)} textAnchor="middle" dominantBaseline="central" fontFamily={SONG} fontSize={31} fontWeight={700} fill="#2b2016">
            活
          </text>
        </g>
        <Numeral x={40} y={30} n={1} to={[104, 40]} />
        <Numeral x={214} y={64} n={2} to={[156, 80]} />
        <Numeral x={56} y={112} n={3} to={[96, 104]} />
        <Numeral x={232} y={196} n={4} to={[198, 178]} />
      </Layer>
    </>
  );
});

// ——— R 灯笼: one silk lantern, close, lit from inside, a plum branch painted on it; the street behind melts ———
export const LanternArt = memo(function LanternArt({ foil, uid }: ArtProps) {
  const cx = AW / 2;
  const bokeh = useMemo(() => {
    const random = seeded(52);
    return Array.from({ length: 30 }, () => ({ x: random() * AW, y: random() * AH, r: 5 + random() * 18, o: 0.18 + random() * 0.45, g: Math.floor(random() * 3) }));
  }, []);
  const fringe = useMemo(() => {
    const random = seeded(19);
    let d = "";
    for (let k = 0; k < 26; k += 1) {
      const x = -9 + (k / 25) * 18;
      const l = 30 + random() * 8;
      d += `M${f1(x)} 0q${f1((random() - 0.5) * 3)} ${f1(l / 2)} ${f1(x * 0.15)} ${f1(l)}`;
    }
    return d;
  }, []);
  const body = `M${cx - 40} 64C${cx - 100} 82 ${cx - 100} 204 ${cx - 40} 222H${cx + 40}C${cx + 100} 204 ${cx + 100} 82 ${cx + 40} 64Z`;
  const ribs = Array.from({ length: 11 }, (_, k) => {
    const i = k - 5;
    return `M${cx + i * 8} 64C${cx + i * 20} 82 ${cx + i * 20} 204 ${cx + i * 8} 222`;
  }).join("");
  const blossom = (x: number, y: number, r: number) =>
    Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      return circle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.78);
    }).join("");
  const flowers: Array<[number, number, number]> = [
    [96, 112, 4.2],
    [118, 98, 3.4],
    [152, 120, 4.6],
    [168, 104, 3.2],
    [138, 150, 3.8],
    [84, 160, 3],
  ];
  return (
    <>
      <Layer depth={-1.8}>
        <defs>
          <linearGradient id={`${uid}-night`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d0d0a" />
            <stop offset="1" stopColor="#0c0605" />
          </linearGradient>
          {["#ffb65c", "#e0482f", "#ffd98a"].map((color, index) => (
            <radialGradient key={color} id={`${uid}-bk${index}`}>
              <stop offset="0" stopColor={color} stopOpacity="0.5" />
              <stop offset="0.86" stopColor={color} stopOpacity="0.7" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        <rect {...FULL} fill={`url(#${uid}-night)`} />
        <g className="ce-anim ce-float-x">
          {bokeh.map((dot, index) => (
            <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill={`url(#${uid}-bk${dot.g})`} opacity={dot.o} />
          ))}
        </g>
      </Layer>
      <Layer depth={-0.8}>
        <defs>
          <radialGradient id={`${uid}-soft`}>
            <stop offset="0" stopColor="#ffb36a" stopOpacity="0.9" />
            <stop offset="0.6" stopColor="#d2402a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#d2402a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={30} cy={44} rx={22} ry={24} fill={`url(#${uid}-soft)`} />
        <ellipse cx={226} cy={30} rx={18} ry={20} fill={`url(#${uid}-soft)`} />
        <ellipse cx={238} cy={232} rx={14} ry={16} fill={`url(#${uid}-soft)`} opacity={0.7} />
      </Layer>
      <Layer depth={0.9} cast>
        <defs>
          <radialGradient id={`${uid}-silk`} cx="0.46" cy="0.5" r="0.62">
            <stop offset="0" stopColor="#ffd27a" />
            <stop offset="0.2" stopColor="#f5793a" />
            <stop offset="0.52" stopColor="#d23a22" />
            <stop offset="0.85" stopColor="#8e1c10" />
            <stop offset="1" stopColor="#5a0f08" />
          </radialGradient>
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0" stopColor="#ff9a4a" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ff9a4a" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-body`}>
            <path d={body} />
          </clipPath>
        </defs>
        <g transform={`translate(${cx} -16)`}>
          <g className="ce-anim ce-lantern">
            <g transform={`translate(${-cx} 16)`}>
              <circle cx={cx} cy={142} r={130} fill={`url(#${uid}-halo)`} />
              <path d={`M${cx} -10V46`} stroke="#2a1a10" strokeWidth={1.4} />
              <path d={`M${cx - 3} 40q3 -6 6 0`} fill="none" stroke={foil} strokeWidth={1.2} />
              <rect x={cx - 15} y={44} width={30} height={10} rx={2} fill={foil} stroke="#4a1e0e" strokeWidth={0.6} />
              <rect x={cx - 44} y={53} width={88} height={12} rx={3} fill={foil} stroke="#4a1e0e" strokeWidth={0.7} />
              <path d={`M${cx - 40} 59H${cx + 40}`} stroke="#4a1e0e" strokeWidth={0.5} />
              <path d={body} fill={`url(#${uid}-silk)`} />
              <g clipPath={`url(#${uid}-body)`}>
                <path d={ribs} fill="none" stroke="#6a140c" strokeWidth={1.3} opacity={0.85} />
                <path d={ribs} fill="none" stroke="#ffb27a" strokeWidth={0.4} opacity={0.35} transform="translate(1.4 0)" />
                {/* The painted plum: a dark branch, gilt flowers. */}
                <path d="M60 196C80 172 92 150 104 128C112 114 128 104 150 100C162 98 172 92 180 82M104 128C118 130 132 140 140 152M150 100C152 112 156 118 160 124" fill="none" stroke="#3a120c" strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
                {flowers.map(([x, y, r]) => (
                  <g key={`${x}-${y}`}>
                    <path d={blossom(x, y, r)} fill="#ffe7c2" opacity={0.9} />
                    <path d={blossom(x, y, r)} fill="none" stroke={foil} strokeWidth={0.5} />
                    <circle cx={x} cy={y} r={r * 0.4} fill={foil} />
                  </g>
                ))}
                <ellipse cx={cx} cy={146} rx={44} ry={52} fill="#ffe7a8" opacity={0.22} className="ce-anim ce-flicker" />
              </g>
              <path d={body} fill="none" stroke="#5a140c" strokeWidth={0.8} />
              <rect x={cx - 44} y={220} width={88} height={11} rx={3} fill={foil} stroke="#4a1e0e" strokeWidth={0.7} />
              <rect x={cx - 14} y={230} width={28} height={7} rx={2} fill={foil} stroke="#4a1e0e" strokeWidth={0.6} />
              <g transform={`translate(${cx} 238)`}>
                <g className="ce-anim ce-sway">
                  <path d="M-4 0h8l-1 6h-6Z" fill={foil} />
                  <path d={fringe} fill="none" stroke="#c8321f" strokeWidth={1.1} transform="translate(0 6)" />
                  <path d={fringe} fill="none" stroke="#ff7a52" strokeWidth={0.35} opacity={0.6} transform="translate(0.6 6)" />
                </g>
              </g>
            </g>
          </g>
        </g>
        <Caption x={20} y={AH - 18} color="#f0c98a">
          上元灯会
        </Caption>
      </Layer>
    </>
  );
});

// ——— R 铜镜: the back of a Han bronze mirror (TLV pattern, the 尚方 inscription), with patina; light moves on it ———
const MR_CX = AW / 2;
const MR_CY = 134;
const MR_R = 104;
const MIRROR_TEXT = "尚方作竟真大巧上有仙人不知老渴饮玉泉饥食枣浮游天下敖四海";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

export const MirrorArt = memo(function MirrorArt({ foil, uid }: ArtProps) {
  const cx = MR_CX;
  const cy = MR_CY;
  const parts = useMemo(() => {
    let teeth = "";
    for (let k = 0; k < 64; k += 1) {
      const a0 = (k / 64) * Math.PI * 2;
      const a1 = ((k + 0.5) / 64) * Math.PI * 2;
      const a2 = ((k + 1) / 64) * Math.PI * 2;
      teeth += quad([
        [MR_CX + Math.cos(a0) * 84, MR_CY + Math.sin(a0) * 84],
        [MR_CX + Math.cos(a1) * 91, MR_CY + Math.sin(a1) * 91],
        [MR_CX + Math.cos(a2) * 84, MR_CY + Math.sin(a2) * 84],
      ]);
    }
    let comb = "";
    for (let k = 0; k < 140; k += 1) {
      const a = (k / 140) * Math.PI * 2;
      comb += `M${f1(MR_CX + Math.cos(a) * 78)} ${f1(MR_CY + Math.sin(a) * 78)}L${f1(MR_CX + Math.cos(a) * 82)} ${f1(MR_CY + Math.sin(a) * 82)}`;
    }
    const wave: Pt[] = [];
    for (let k = 0; k <= 240; k += 1) {
      const a = (k / 240) * Math.PI * 2;
      const r = 97.5 + Math.sin(a * 24) * 2.6;
      wave.push([MR_CX + Math.cos(a) * r, MR_CY + Math.sin(a) * r]);
    }
    // T, L, V and the eight bosses, a quarter at a time.
    let tlv = "";
    let bosses = "";
    let curls = "";
    for (let q = 0; q < 4; q += 1) {
      const rot = (p: Pt): Pt => {
        const a = (q * Math.PI) / 2;
        return [MR_CX + p[0] * Math.cos(a) - p[1] * Math.sin(a), MR_CY + p[0] * Math.sin(a) + p[1] * Math.cos(a)];
      };
      const line = (points: Pt[]) => polyline(points.map(rot));
      tlv += line([
        [0, -23],
        [0, -31],
      ]);
      tlv += line([
        [-7, -31],
        [7, -31],
      ]);
      tlv += line([
        [-7, -60],
        [-7, -52],
        [3, -52],
      ]);
      tlv += line([
        [-44, -36],
        [-36, -36],
        [-36, -44],
      ]);
      for (const side of [-1, 1]) {
        const [bx, by] = rot([side * 22, -42]);
        bosses += circle(bx, by, 3.4);
        curls += polyline(spiralPoints(rot([side * 34, -24]), 5, side)) + polyline(spiralPoints(rot([side * 16, -50]), 4, -side));
      }
    }
    const patina = (() => {
      const random = seeded(23);
      return Array.from({ length: 16 }, (_, k) => {
        const a = random() * Math.PI * 2;
        const rr = k < 11 ? 86 + random() * 16 : 30 + random() * 40;
        const x = MR_CX + Math.cos(a) * rr;
        const y = MR_CY + Math.sin(a) * rr;
        const size = 4 + random() * 11;
        const points: Pt[] = Array.from({ length: 9 }, (_, j) => {
          const b = (j / 9) * Math.PI * 2;
          const s = size * (0.6 + random() * 0.6);
          return [x + Math.cos(b) * s, y + Math.sin(b) * s * 0.8];
        });
        return { d: smoothClosed(points), light: random() < 0.35 };
      });
    })();
    return { teeth, comb, wave: polyline(wave), tlv, bosses, curls, patina };
  }, []);
  const ring = `M${cx} ${cy - 67}A67 67 0 1 1 ${cx - 0.01} ${cy - 67}`;
  return (
    <>
      <Layer depth={-1.4}>
        <defs>
          <radialGradient id={`${uid}-silk`} cx="0.5" cy="0.45" r="0.8">
            <stop offset="0" stopColor="#24304a" />
            <stop offset="1" stopColor="#0d121c" />
          </radialGradient>
          <pattern id={`${uid}-weave`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 3H6M3 0V6" stroke="#3a4866" strokeWidth={0.35} />
          </pattern>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-silk)`} />
        <rect {...FULL} fill={`url(#${uid}-weave)`} opacity={0.5} />
        <path d="M-20 60Q100 30 280 80M-20 220Q120 250 280 210" fill="none" stroke="#5a6a8c" strokeWidth={14} opacity={0.08} />
      </Layer>
      <Layer depth={0.7} cast>
        <defs>
          <radialGradient id={`${uid}-bronze`} cx="0.4" cy="0.38" r="0.75">
            <stop offset="0" stopColor="#7a5634" />
            <stop offset="0.7" stopColor="#4a321c" />
            <stop offset="1" stopColor="#2a1b0e" />
          </radialGradient>
          <radialGradient id={`${uid}-knob`} cx="0.35" cy="0.32" r="0.7">
            <stop offset="0" stopColor="#ffe0b8" />
            <stop offset="0.35" stopColor="#b8794a" />
            <stop offset="1" stopColor="#3a2412" />
          </radialGradient>
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff2dc" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}-disc`}>
            <circle cx={cx} cy={cy} r={MR_R} />
          </clipPath>
          <path id={`${uid}-ring`} d={ring} />
        </defs>
        <circle cx={cx} cy={cy} r={MR_R} fill={`url(#${uid}-bronze)`} />
        <circle cx={cx} cy={cy} r={MR_R} fill={foil} opacity={0.32} />
        {/* Relief: each raised line casts a dark edge, then catches the light. */}
        <g transform="translate(0.7 0.7)" opacity={0.7}>
          <path d={parts.wave} fill="none" stroke="#1a0f06" strokeWidth={1.4} />
          <path d={parts.teeth} fill="#1a0f06" />
          <path d={parts.tlv} fill="none" stroke="#1a0f06" strokeWidth={2.4} strokeLinecap="square" />
          <path d={`M${cx - 23} ${cy - 23}h46v46h-46Z`} fill="none" stroke="#1a0f06" strokeWidth={2.4} />
        </g>
        <path d={circle(cx, cy, MR_R - 1) + circle(cx, cy, 92) + circle(cx, cy, 84) + circle(cx, cy, 78) + circle(cx, cy, 63) + circle(cx, cy, 60)} fill="none" stroke={foil} strokeWidth={0.7} />
        <path d={parts.wave} fill="none" stroke={foil} strokeWidth={1.1} />
        <path d={parts.teeth} fill={foil} opacity={0.85} />
        <path d={parts.comb} stroke={foil} strokeWidth={0.5} />
        <text fontFamily={SONG} fontSize={9.2} fontWeight={700} letterSpacing={5.1} fill="#1a0f06" opacity={0.7} transform="translate(0.6 0.6)">
          <textPath href={`#${uid}-ring`}>{MIRROR_TEXT}</textPath>
        </text>
        <text fontFamily={SONG} fontSize={9.2} fontWeight={700} letterSpacing={5.1} fill={foil}>
          <textPath href={`#${uid}-ring`}>{MIRROR_TEXT}</textPath>
        </text>
        <path d={parts.tlv} fill="none" stroke={foil} strokeWidth={2.2} strokeLinecap="square" />
        <path d={`M${cx - 23} ${cy - 23}h46v46h-46ZM${cx - 20} ${cy - 20}h40v40h-40Z`} fill="none" stroke={foil} strokeWidth={1.2} />
        <path d={parts.curls} fill="none" stroke={foil} strokeWidth={0.7} />
        <path d={parts.bosses} fill={`url(#${uid}-knob)`} stroke={foil} strokeWidth={0.6} />
        {BRANCHES.split("").map((ch, k) => {
          const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
          return (
            <text key={ch} x={cx + Math.cos(a) * 16.5} y={cy + Math.sin(a) * 16.5 + 1.6} textAnchor="middle" fontFamily={SONG} fontSize={4.4} fill={foil}>
              {ch}
            </text>
          );
        })}
        {/* The knob on its four-leaf base, the hole for the cord. */}
        {[45, 135, 225, 315].map((deg) => (
          <path key={deg} d="M0 0C4 -4 10 -5 14 0C10 5 4 4 0 0Z" fill={foil} opacity={0.85} transform={`translate(${cx} ${cy}) rotate(${deg})`} />
        ))}
        <circle cx={cx} cy={cy} r={10} fill={`url(#${uid}-knob)`} stroke="#2a180a" strokeWidth={0.6} />
        <ellipse cx={cx} cy={cy + 1} rx={4.5} ry={1.6} fill="#140a04" />
        {/* Patina: verdigris where the bronze has turned, a little cuprite red. */}
        {parts.patina.map((spot, index) => (
          <path key={index} d={spot.d} fill={spot.light ? "#9fd1bd" : "#4f9484"} opacity={spot.light ? 0.55 : 0.75} clipPath={`url(#${uid}-disc)`} />
        ))}
        <circle cx={cx + 60} cy={cy + 54} r={2.2} fill="#8f3a2a" opacity={0.7} />
        <circle cx={cx - 70} cy={cy - 40} r={1.6} fill="#8f3a2a" opacity={0.7} />
        <g clipPath={`url(#${uid}-disc)`}>
          <g className="ce-anim ce-sheen">
            <rect x={cx - 30} y={cy - 140} width={60} height={280} fill={`url(#${uid}-sheen)`} transform={`rotate(24 ${cx} ${cy})`} />
          </g>
        </g>
        <circle cx={cx} cy={cy} r={MR_R} fill="none" stroke="#1d1209" strokeWidth={1} />
      </Layer>
      <Layer depth={1.5} cast>
        {/* The red cord through the knob, hanging out of the frame. */}
        <path d={`M${cx - 4} ${cy + 1}C${cx - 18} ${cy + 4} ${cx - 16} ${cy + 16} ${cx - 2} ${cy + 14}C${cx + 26} ${cy + 10} ${cx + 52} ${cy + 40} ${cx + 66} ${cy + 86}C${cx + 70} ${cy + 100} ${cx + 74} ${cy + 116} ${cx + 78} ${cy + 140}`} fill="none" stroke="#9e2a20" strokeWidth={2.6} strokeLinecap="round" />
        <path d={`M${cx - 4} ${cy + 1}C${cx - 18} ${cy + 4} ${cx - 16} ${cy + 16} ${cx - 2} ${cy + 14}C${cx + 26} ${cy + 10} ${cx + 52} ${cy + 40} ${cx + 66} ${cy + 86}C${cx + 70} ${cy + 100} ${cx + 74} ${cy + 116} ${cx + 78} ${cy + 140}`} fill="none" stroke="#e0644e" strokeWidth={0.7} opacity={0.7} />
        <g transform={`translate(${cx + 68} ${cy + 96})`}>
          <path d="M0 -7L7 0L0 7L-7 0Z" fill="#b8322a" stroke="#6e1810" strokeWidth={0.6} />
          <path d="M-3.5 -3.5L3.5 3.5M3.5 -3.5L-3.5 3.5" stroke="#6e1810" strokeWidth={0.5} />
        </g>
      </Layer>
    </>
  );
});

function spiralPoints(at: Pt, r: number, dir: number): Pt[] {
  return Array.from({ length: 16 }, (_, k) => {
    const t = k / 15;
    const a = dir * t * Math.PI * 2.2;
    const rr = r * (1 - 0.8 * t);
    return [at[0] + Math.cos(a) * rr, at[1] + Math.sin(a) * rr];
  });
}

// ——— SR 锦鲤: two koi circle the pond over their own shadows; light nets ripple on the bottom; a lotus opens ———
const KOI_BODY = "M36 0C35 -6 27 -10 16 -10C2 -10 -14 -7 -26 -3C-29 -2 -31 -1 -32 0C-31 1 -29 2 -26 3C-14 7 2 10 16 10C27 10 35 6 36 0Z";
const KOI_TAIL = "M0 0C-10 -8 -20 -15 -25 -12C-21 -6 -17 -2 -13 0C-17 2 -21 6 -25 12C-20 15 -10 8 0 0Z";
const KOI_FIN = "M16 -8C12 -17 4 -21 1 -18C6 -15 10 -11 13 -8Z";

function koiScales() {
  let d = "";
  for (let x = -24; x <= 28; x += 4) {
    for (let row = -3; row <= 3; row += 1) {
      const y = row * 2.6 + (x % 8 === 0 ? 1.3 : 0);
      d += `M${x} ${f1(y - 1.5)}a1.7 1.7 0 0 0 0 3`;
    }
  }
  return d;
}

function Koi({ id, kind, foil }: { id: string; kind: "kohaku" | "platinum"; foil: string }) {
  const scales = useMemo(() => koiScales(), []);
  const skin = kind === "platinum" ? foil : "#f4efe6";
  return (
    <>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={KOI_BODY} />
        </clipPath>
        <linearGradient id={`${id}-round`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="0.65" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <g transform="translate(-30 0)">
        <g className="ce-anim ce-tail">
          <path d={KOI_TAIL} fill="#f8f4ec" opacity={0.6} />
          <path d="M0 0L-23 -10M0 0L-20 -5M0 0L-20 5M0 0L-23 10" stroke="#ffffff" strokeWidth={0.35} opacity={0.7} />
        </g>
      </g>
      <path d={KOI_FIN} fill="#fbf8f2" opacity={0.6} />
      <path d={KOI_FIN} fill="#fbf8f2" opacity={0.6} transform="scale(1 -1)" />
      <path d="M-6 -6C-9 -11 -13 -12 -14 -10C-12 -8 -10 -7 -8 -6Z" fill="#fbf8f2" opacity={0.5} />
      <path d="M-6 6C-9 11 -13 12 -14 10C-12 8 -10 7 -8 6Z" fill="#fbf8f2" opacity={0.5} />
      <path d={KOI_BODY} fill={skin} />
      <g clipPath={`url(#${id}-clip)`}>
        {kind === "kohaku" ? (
          <path d={`${circle(25, -1, 7)}${circle(6, 3, 8.5)}${circle(-6, -5, 6)}${circle(-16, 2, 5)}`} fill="#d6402a" />
        ) : (
          <>
            <path d={KOI_BODY} fill="#ffffff" opacity={0.45} />
            <path d={circle(24, 0, 9)} fill="#f3d88c" opacity={0.6} />
          </>
        )}
        <path d={scales} fill="none" stroke="#000" strokeWidth={0.35} opacity={0.12} />
        <path d={KOI_BODY} fill={`url(#${id}-round)`} />
        <path d="M26 0H-24" stroke="#000" strokeWidth={1.6} opacity={0.12} />
      </g>
      <circle cx={30} cy={-4.6} r={1.1} fill="#1a1a1a" />
      <circle cx={30} cy={4.6} r={1.1} fill="#1a1a1a" />
      <path d="M36 -1.5q3 -1 4 -4M36 1.5q3 1 4 4" fill="none" stroke="#f4efe6" strokeWidth={0.4} />
    </>
  );
}

export const KoiArt = memo(function KoiArt({ foil, uid }: ArtProps) {
  const cx = AW / 2;
  const cy = 140;
  const nets = useMemo(() => {
    const net = (seed: number) => {
      let d = "";
      for (let k = -2; k < 24; k += 1) {
        const points: Pt[] = [];
        const points2: Pt[] = [];
        for (let j = 0; j <= 20; j += 1) {
          const s = -20 + (j / 20) * (AW + 40);
          points.push([s, k * 13 + Math.sin(s * 0.07 + k * 1.7 + seed) * 6 + Math.sin(s * 0.23 + k * 0.6) * 3 + Math.sin(k * 3.1) * 3]);
          points2.push([k * 13 + Math.sin(s * 0.06 + k * 2.1 + seed) * 6 + Math.sin(s * 0.21 + k * 0.8) * 3 + Math.cos(k * 2.3) * 3, s * 1.1]);
        }
        d += smoothOpen(points) + smoothOpen(points2);
      }
      return d;
    };
    const random = seeded(5);
    const pebbles = Array.from({ length: 46 }, () => ({ x: random() * AW, y: random() * AH, rx: 2 + random() * 5, ry: 1.5 + random() * 3, a: random() * 180 }));
    return { a: net(0), b: net(2.4), pebbles };
  }, []);
  const pads: Array<[number, number, number, number]> = [
    [40, 50, 25, 20],
    [216, 70, 18, 160],
    [196, 228, 30, 300],
    [52, 232, 16, 60],
    [232, 150, 12, 220],
  ];
  const pad = (x: number, y: number, r: number, notch: number) => {
    const a0 = (notch * Math.PI) / 180;
    const a1 = a0 + Math.PI * 2 - 0.42;
    return `M${x} ${y}L${f1(x + Math.cos(a0) * r)} ${f1(y + Math.sin(a0) * r)}A${r} ${r} 0 1 1 ${f1(x + Math.cos(a1) * r)} ${f1(y + Math.sin(a1) * r)}Z`;
  };
  const veins = (x: number, y: number, r: number) => Array.from({ length: 14 }, (_, k) => `M${x} ${y}L${f1(x + Math.cos((k / 14) * Math.PI * 2) * r * 0.92)} ${f1(y + Math.sin((k / 14) * Math.PI * 2) * r * 0.92)}`).join("");
  const petal = "M0 0C-6 -8 -6 -18 0 -25C6 -18 6 -8 0 0Z";
  return (
    <>
      <Layer depth={-1.8}>
        <defs>
          <radialGradient id={`${uid}-pond`} cx="0.5" cy="0.5" r="0.75">
            <stop offset="0" stopColor="#2a6463" />
            <stop offset="0.6" stopColor="#14393a" />
            <stop offset="1" stopColor="#061616" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-pond)`} />
        {nets.pebbles.map((pebble, index) => (
          <ellipse key={index} cx={pebble.x} cy={pebble.y} rx={pebble.rx} ry={pebble.ry} transform={`rotate(${f1(pebble.a)} ${f1(pebble.x)} ${f1(pebble.y)})`} fill="#3c6d68" opacity={0.35} />
        ))}
        <g className="ce-anim ce-caustic">
          <path d={nets.a} fill="none" stroke="#c9f4ea" strokeWidth={0.8} opacity={0.13} />
        </g>
        <g className="ce-anim ce-caustic-2">
          <path d={nets.b} fill="none" stroke="#c9f4ea" strokeWidth={0.6} opacity={0.1} />
        </g>
      </Layer>
      <Layer depth={-0.9}>
        {/* The koi's shadows on the bottom, offset by the depth of the water. */}
        <g transform="translate(6 9)" opacity={0.28}>
          <Spin x={cx} y={cy} seconds={46}>
            <path d={KOI_BODY} fill="#000" transform="translate(66 0) rotate(90)" />
          </Spin>
          <Spin x={cx} y={cy} seconds={34} reverse phase={150}>
            <path d={KOI_BODY} fill="#000" transform="translate(42 0) rotate(-90)" />
          </Spin>
        </g>
      </Layer>
      <Layer depth={0.2}>
        <Spin x={cx} y={cy} seconds={46}>
          <g transform="translate(66 0) rotate(90)">
            <Koi id={`${uid}-a`} kind="kohaku" foil={foil} />
          </g>
        </Spin>
        <Spin x={cx} y={cy} seconds={34} reverse phase={150}>
          <g transform="translate(42 0) rotate(-90)">
            <Koi id={`${uid}-b`} kind="platinum" foil={foil} />
          </g>
        </Spin>
        <circle cx={150} cy={104} r={8} fill="none" stroke="#e8fbf6" strokeWidth={0.6} className="ce-anim ce-ripple" />
        <circle cx={92} cy={190} r={8} fill="none" stroke="#e8fbf6" strokeWidth={0.5} className="ce-anim ce-ripple ce-ripple-slow" />
      </Layer>
      <Layer depth={0.9} cast>
        <defs>
          <radialGradient id={`${uid}-leaf`} cx="0.45" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#7aa766" />
            <stop offset="1" stopColor="#355f3c" />
          </radialGradient>
        </defs>
        {pads.map(([x, y, r, notch]) => (
          <g key={`${x}-${y}`}>
            <path d={pad(x, y, r, notch)} fill={`url(#${uid}-leaf)`} />
            <path d={veins(x, y, r)} stroke="#2c5233" strokeWidth={0.45} opacity={0.7} />
            <path d={pad(x, y, r, notch)} fill="none" stroke="#b8d99a" strokeWidth={0.5} opacity={0.7} />
            <circle cx={x + r * 0.35} cy={y - r * 0.2} r={1.1} fill="#e8fbf6" opacity={0.85} />
          </g>
        ))}
        <path d="M60 120q4 -3 8 0q-4 3 -8 0ZM180 186q4 -3 8 0q-4 3 -8 0Z" fill="#f3c2cf" opacity={0.85} />
        <Caption x={20} y={AH - 18} color="#dff3ee">
          锦鲤 · 池上
        </Caption>
      </Layer>
      <Layer depth={1.6} cast>
        <defs>
          <linearGradient id={`${uid}-petal`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fff4f6" />
            <stop offset="0.7" stopColor="#f2aabd" />
            <stop offset="1" stopColor="#d8607e" />
          </linearGradient>
        </defs>
        <g transform="translate(196 222)">
          {[-70, -35, 0, 35, 70, -110, 110].map((deg) => (
            <path key={deg} d={petal} fill={`url(#${uid}-petal)`} stroke="#c45a76" strokeWidth={0.4} transform={`rotate(${deg}) scale(${Math.abs(deg) > 90 ? 0.85 : 1})`} />
          ))}
          {[-22, 22, 0].map((deg) => (
            <path key={`in${deg}`} d={petal} fill={`url(#${uid}-petal)`} stroke="#c45a76" strokeWidth={0.4} transform={`rotate(${deg}) scale(0.7)`} />
          ))}
          <ellipse cx={0} cy={-6} rx={5} ry={3} fill="#e9c95a" stroke="#a7862a" strokeWidth={0.4} />
        </g>
      </Layer>
    </>
  );
});

// ——— SR 月门: a moon gate in a white wall under tiled eaves; through it the moon and the garden; plum blossom falls ———
const MG_CX = AW / 2;
const MG_CY = 150;
const MG_R = 70;
const PLUM_BRANCH: Pt[] = [
  [-6, 10],
  [20, 30],
  [62, 46],
  [104, 52],
  [146, 46],
  [188, 64],
  [214, 92],
];
const PLUM_TWIGS: Pt[][] = [
  [
    [62, 46],
    [70, 70],
    [86, 86],
  ],
  [
    [104, 52],
    [118, 30],
    [134, 22],
  ],
  [
    [146, 46],
    [160, 76],
    [154, 98],
  ],
  [
    [20, 30],
    [30, 58],
  ],
];

export const MoonGateArt = memo(function MoonGateArt({ foil, uid }: ArtProps) {
  const cx = MG_CX;
  const cy = MG_CY;
  const parts = useMemo(() => {
    const random = seeded(61);
    const branch = tube(frames(catmull(PLUM_BRANCH, 6), (t) => 4.2 - t * 3.2));
    const twigs = PLUM_TWIGS.map((points) => tube(frames(catmull(points, 5), (t) => 1.8 - t * 1.4))).join("");
    const blossoms: Array<[number, number, number]> = [];
    for (const [x, y] of [...catmull(PLUM_BRANCH, 3), ...PLUM_TWIGS.flatMap((points) => catmull(points, 2))]) {
      if (random() < 0.55) blossoms.push([x + (random() - 0.5) * 10, y + (random() - 0.5) * 10, 2.2 + random() * 1.6]);
    }
    let joints = "";
    for (let k = 0; k < 28; k += 1) {
      const a = (k / 28) * Math.PI * 2;
      joints += `M${f1(MG_CX + Math.cos(a) * MG_R)} ${f1(MG_CY + Math.sin(a) * MG_R)}L${f1(MG_CX + Math.cos(a) * (MG_R + 8))} ${f1(MG_CY + Math.sin(a) * (MG_R + 8))}`;
    }
    let tiles = "";
    let ends = "";
    for (let x = -10; x < AW + 10; x += 7) {
      tiles += `M${x} -14L${x + 1.5} 28`;
      ends += circle(x + 3.5, 30, 3.1);
    }
    const ridge = (seed: number, y0: number, amp: number) => {
      const r2 = seeded(seed);
      const points: Pt[] = [[-30, 260]];
      for (let x = -30; x <= AW + 30; x += 12) points.push([x, y0 - Math.abs(Math.sin(x * 0.03 + seed)) * amp - r2() * 8]);
      points.push([AW + 30, 260]);
      return smoothClosed(points);
    };
    // Pine needles in fans, the way they are painted: short strokes spreading up from each twig.
    let needles = "";
    for (const [px, py, w] of [
      [134, 134, 16],
      [158, 148, 18],
      [176, 170, 14],
      [146, 124, 12],
    ]) {
      for (let k = 0; k < 22; k += 1) {
        const t = k / 21;
        const bx = px - w + t * w * 2;
        const lift = 4 + Math.sin(t * Math.PI) * 5 + random() * 2;
        needles += `M${f1(px + (bx - px) * 0.3)} ${f1(py + 2)}L${f1(bx)} ${f1(py - lift)}`;
      }
    }
    return { branch, twigs, blossoms, joints, tiles, ends, needles, far: ridge(2, 196, 26), near: ridge(5, 214, 18) };
  }, []);
  const blossom = (x: number, y: number, r: number) =>
    Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      return circle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.82);
    }).join("");
  const wall = `M-20 -20H${AW + 20}V${AH + 20}H-20Z${circle(cx, cy, MG_R)}`;
  return (
    <>
      <Layer depth={-1.8}>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#141836" />
            <stop offset="0.6" stopColor="#2b2e5a" />
            <stop offset="1" stopColor="#57507e" />
          </linearGradient>
          <radialGradient id={`${uid}-moon`}>
            <stop offset="0" stopColor="#fffdf2" />
            <stop offset="0.75" stopColor="#f4e8c8" />
            <stop offset="1" stopColor="#e6d3a6" />
          </radialGradient>
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0" stopColor="#ece4ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ece4ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        <circle cx={152} cy={118} r={74} fill={`url(#${uid}-halo)`} />
        <circle cx={152} cy={118} r={26} fill={`url(#${uid}-moon)`} />
        <path d={parts.far} fill="#3a3b68" opacity={0.85} />
        <path d={parts.near} fill="#25264a" />
      </Layer>
      <Layer depth={-1}>
        {/* The garden through the gate: a pierced rock, a leaning pine. */}
        <path d="M70 222C64 200 70 182 80 172C78 160 90 150 100 156C112 150 120 162 116 176C124 190 120 210 114 222Z" fill="#1d1f3c" />
        <path d={circle(92, 172, 4) + circle(104, 194, 5.5) + circle(88, 204, 3)} fill="#4a4b7a" opacity={0.8} />
        <path d="M80 172C84 166 92 162 100 156" fill="none" stroke="#9a98c8" strokeWidth={0.6} opacity={0.6} />
        <path d="M186 224C184 196 178 170 160 150C152 140 144 136 132 134" fill="none" stroke="#14152c" strokeWidth={4} strokeLinecap="round" />
        <path d={parts.needles} stroke="#14152c" strokeWidth={0.9} strokeLinecap="round" />
        <rect x={-20} y={220} width={AW + 40} height={60} fill="#17182e" />
      </Layer>
      <Layer depth={0.3} cast clip>
        <defs>
          <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9cfdb" />
            <stop offset="1" stopColor="#a9b0c2" />
          </linearGradient>
          <linearGradient id={`${uid}-eave`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.35" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={wall} fill={`url(#${uid}-wall)`} fillRule="evenodd" />
        {/* The branch's shadow in the moonlight. */}
        <g transform="translate(16 26)" opacity={0.14}>
          <path d={parts.branch + parts.twigs} fill="#20243c" />
        </g>
        <path d={`${circle(cx, cy, MG_R + 8)}${circle(cx, cy, MG_R)}`} fill="#8c92a6" fillRule="evenodd" stroke="#5b6075" strokeWidth={0.6} />
        <path d={parts.joints} stroke="#5b6075" strokeWidth={0.5} />
        <path d={circle(cx, cy, MG_R + 1.5)} fill="none" stroke="#3e4255" strokeWidth={2.4} opacity={0.5} />
        <rect x={-20} y={244} width={AW + 40} height={40} fill="#8e95a6" />
        <path d={`M-20 244H${AW + 20}M30 244V280M90 244V280M150 244V280M210 244V280M-20 262H${AW + 20}M60 262V280M120 262V280M180 262V280`} stroke="#5f6577" strokeWidth={0.6} />
        {/* The eaves: grey tiles, a row of round tile ends, the shadow they cast on the wall. */}
        <rect x={-20} y={30} width={AW + 40} height={26} fill={`url(#${uid}-eave)`} />
        <path d={`M-20 -20H${AW + 20}V28H-20Z`} fill="#3a3e4e" />
        <path d={parts.tiles} stroke="#2a2d3a" strokeWidth={1.4} />
        <path d={parts.tiles} stroke="#6a7084" strokeWidth={0.4} transform="translate(1.6 0)" />
        <path d={`M-20 27H${AW + 20}`} stroke="#23252f" strokeWidth={2} />
        <path d={parts.ends} fill="#4a4f62" stroke="#23252f" strokeWidth={0.6} />
        <path d={`M-20 34H${AW + 20}`} stroke={foil} strokeWidth={0.5} opacity={0.6} />
      </Layer>
      <Layer depth={1.4} cast>
        <path d={parts.branch + parts.twigs} fill="#2b201b" />
        {parts.blossoms.map(([x, y, r], index) => (
          <g key={index}>
            <path d={blossom(x, y, r)} fill="#f8e4ea" stroke="#d99aab" strokeWidth={0.3} />
            <circle cx={x} cy={y} r={r * 0.4} fill="#c0475f" />
          </g>
        ))}
        {[
          [70, 60, 0],
          [130, 40, -3.4],
          [180, 90, -6.2],
          [40, 30, -8.1],
        ].map(([x, y, delay]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <g className="ce-anim ce-petal" style={{ animationDelay: `${delay}s`, animationDuration: "12s" }}>
              <path d={circle(0, 0, 1.8)} fill="#f8e4ea" />
            </g>
          </g>
        ))}
        <Caption x={20} y={AH - 18} color="#2b2d3a">
          苏州 · 月洞门
        </Caption>
      </Layer>
    </>
  );
});

// ——— SSR 夜市: an old street in the rain at night, upturned eaves to the far gate; the signs reach out of the frame ———
const NM_VP: Pt = [126, 118];
const nm = (X: number, Y: number, Z: number): Pt => [NM_VP[0] + (X * 3) / Z, NM_VP[1] - (Y * 3) / Z];
const NM_LEFT: Array<[number, number, number]> = [
  [1, 1.9, 26],
  [1.9, 2.9, 34],
  [2.9, 4.2, 24],
  [4.2, 6, 30],
  [6, 9, 22],
];
const NM_RIGHT: Array<[number, number, number]> = [
  [1, 1.6, 30],
  [1.6, 2.6, 24],
  [2.6, 3.8, 32],
  [3.8, 5.6, 26],
  [5.6, 9, 28],
];

interface Facade {
  wall: string;
  roof: string;
  eave: string;
  windows: string;
  shop: string;
  sign: string;
  /** Lit windows: where, and how far (for their reflections in the wet street). */
  lights: Array<{ p: Pt; z: number }>;
}

function facades(side: -1 | 1, list: Array<[number, number, number]>): Facade[] {
  const X = side * 40;
  return list.map(([z0, z1, H], index) => {
    const at = (x: number, y: number, z: number) => nm(x, y, z);
    const wall = quad([at(X, -18, z0), at(X, H, z0), at(X, H, z1), at(X, -18, z1)]);
    const e0 = at(X - side * 6, H + 2, z0);
    const k = 3 / z0;
    const tip: Pt = [e0[0] - side * 2.6 * k, e0[1] - 4.6 * k];
    const ridgeNear = at(X, H + 8, z0);
    const ridgeFar = at(X, H + 8, z1);
    const eaveFar = at(X - side * 6, H + 2, z1);
    const roof = `M${f1(ridgeNear[0])} ${f1(ridgeNear[1])}L${f1(ridgeFar[0])} ${f1(ridgeFar[1])}L${f1(eaveFar[0])} ${f1(eaveFar[1])}L${f1(e0[0])} ${f1(e0[1])}Q${f1(e0[0] - side * 0.6 * k)} ${f1(e0[1] - 1 * k)} ${f1(tip[0])} ${f1(tip[1])}Z`;
    const eave = `M${f1(eaveFar[0])} ${f1(eaveFar[1])}L${f1(e0[0])} ${f1(e0[1])}Q${f1(e0[0] - side * 0.6 * k)} ${f1(e0[1] - 1 * k)} ${f1(tip[0])} ${f1(tip[1])}`;
    let windows = "";
    const lights: Facade["lights"] = [];
    const n = 2;
    for (let w = 0; w < n; w += 1) {
      const za = z0 + ((z1 - z0) * (w * 2 + 0.5)) / (n * 2);
      const zb = z0 + ((z1 - z0) * (w * 2 + 1.5)) / (n * 2);
      windows += quad([at(X, 4, za), at(X, 15, za), at(X, 15, zb), at(X, 4, zb)]);
      lights.push({ p: at(X, 9, (za + zb) / 2), z: (za + zb) / 2 });
    }
    const shop = quad([at(X, -18, z0 + (z1 - z0) * 0.15), at(X, -5, z0 + (z1 - z0) * 0.15), at(X, -5, z1 - (z1 - z0) * 0.15), at(X, -18, z1 - (z1 - z0) * 0.15)]);
    const zm = z0 + (z1 - z0) * 0.5;
    const sign = index % 2 === 0 ? quad([at(X - side * 1, H - 3, zm), at(X - side * 8, H - 3, zm), at(X - side * 8, H - 16, zm), at(X - side * 1, H - 16, zm)]) : "";
    return { wall, roof, eave, windows, shop, sign, lights };
  });
}

export const NightMarketArt = memo(function NightMarketArt({ foil, uid }: ArtProps) {
  const scene = useMemo(() => {
    const left = facades(-1, NM_LEFT);
    const right = facades(1, NM_RIGHT);
    const strings = [2.2, 3.4, 5.2].map((z) => {
      const a = nm(-40, 22, z);
      const b = nm(40, 22, z);
      const sag = 18 / z;
      const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag * 2];
      const lamps: Array<[number, number, number]> = [];
      for (let k = 1; k < 7; k += 1) {
        const t = k / 7;
        const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mid[0] + t * t * b[0];
        const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * mid[1] + t * t * b[1];
        lamps.push([x, y + 2.4 / z, 3.4 / z]);
      }
      return { d: `M${f1(a[0])} ${f1(a[1])}Q${f1(mid[0])} ${f1(mid[1])} ${f1(b[0])} ${f1(b[1])}`, lamps, z };
    });
    const random = seeded(77);
    let rain = "";
    for (let k = 0; k < 110; k += 1) {
      const x = random() * (AW + 80);
      const y = random() * AH;
      const l = 8 + random() * 14;
      const seg = (dx: number, dy: number) => `M${f1(x + dx)} ${f1(y + dy)}l${f1(-l * 0.219)} ${f1(l)}`;
      rain += seg(0, 0) + seg(61, -278);
    }
    const reflections = [...left, ...right]
      .flatMap((facade) => facade.lights)
      .map(({ p, z }) => {
        const x = nm(p[0] < NM_VP[0] ? -30 : 30, -18, z)[0];
        return { x, y: 2 * nm(0, -18, z)[1] - p[1] };
      });
    return { left, right, strings, rain, reflections };
  }, []);
  const gate = [nm(-16, -18, 9.5), nm(-16, 14, 9.5), nm(16, 14, 9.5), nm(16, -18, 9.5)];
  const people: Array<[number, number, string]> = [
    [-12, 2.6, "#7a2a22"],
    [14, 3.6, "#1d2a3a"],
    [-4, 5.4, "#5a3a1a"],
  ];
  const street = `M${f1(nm(-40, -18, 1)[0])} ${f1(nm(-40, -18, 1)[1])}L${f1(nm(-40, -18, 9)[0])} ${f1(nm(-40, -18, 9)[1])}L${f1(nm(40, -18, 9)[0])} ${f1(nm(40, -18, 9)[1])}L${f1(nm(40, -18, 1)[0])} ${f1(nm(40, -18, 1)[1])}L${AW + 30} ${AH + 20}H-30Z`;
  return (
    <>
      <Layer depth={-1.6}>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#070504" />
            <stop offset="1" stopColor="#1e140b" />
          </linearGradient>
          <radialGradient id={`${uid}-far`}>
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        <circle cx={NM_VP[0]} cy={NM_VP[1] - 4} r={60} fill={`url(#${uid}-far)`} />
        {/* The far gate (牌楼). */}
        <path d={quad(gate)} fill="#1a120a" stroke={foil} strokeWidth={0.5} />
        <path d={`M${f1(gate[1][0] - 3)} ${f1(gate[1][1])}Q${NM_VP[0]} ${f1(gate[1][1] - 6)} ${f1(gate[2][0] + 3)} ${f1(gate[2][1])}`} fill="none" stroke={foil} strokeWidth={0.8} />
        <rect x={NM_VP[0] - 3} y={gate[1][1] + 2} width={6} height={4} fill="#ffcf7a" opacity={0.8} />
      </Layer>
      <Layer depth={-0.8}>
        <defs>
          <linearGradient id={`${uid}-street`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a120a" />
            <stop offset="1" stopColor="#2c2016" />
          </linearGradient>
        </defs>
        <path d={street} fill={`url(#${uid}-street)`} />
        {scene.reflections.map((spot, index) => (
          <path key={index} d={`M${f1(spot.x)} ${f1(spot.y - 4)}V${f1(spot.y + 14)}`} stroke="#f2b766" strokeWidth={1.8} opacity={0.22} strokeLinecap="round" />
        ))}
        {[...scene.left, ...scene.right]
          .slice()
          .reverse()
          .map((facade, index) => (
            <g key={index}>
              <path d={facade.wall} fill={index % 2 ? "#17100a" : "#1d140c"} stroke="#3a2a18" strokeWidth={0.4} />
              <path d={facade.shop} fill="#f6c77a" opacity={0.55} />
              <path d={facade.windows} fill="#f0b25e" opacity={0.8} />
              <path d={facade.roof} fill="#0b0805" />
              <path d={facade.eave} fill="none" stroke={foil} strokeWidth={0.7} />
              {facade.sign ? <path d={facade.sign} fill="#2a1a0c" stroke={foil} strokeWidth={0.5} /> : null}
            </g>
          ))}
        {scene.strings.map((string) => (
          <g key={string.z}>
            <path d={string.d} fill="none" stroke="#3a2a18" strokeWidth={0.5} />
            {string.lamps.map(([x, y, r], index) => (
              <g key={index}>
                <circle cx={x} cy={y} r={r * 2.6} fill="#ff8a4a" opacity={0.15} />
                <ellipse cx={x} cy={y} rx={r} ry={r * 1.2} fill="#e0482f" className={index % 3 === 0 ? "ce-blink" : undefined} style={index % 3 === 0 ? { animationDelay: `${-index * 1.3}s` } : undefined} />
              </g>
            ))}
          </g>
        ))}
        {people.map(([X, Z, color]) => {
          const [x, y] = nm(X, -18, Z);
          const s = 3 / Z;
          return (
            <g key={X} transform={`translate(${f1(x)} ${f1(y)}) scale(${f1(s)})`}>
              <path d="M-2.4 0V-11Q0 -13 2.4 -11V0Z" fill="#0d0907" />
              <path d="M-7 -14Q0 -22 7 -14Z" fill={color} stroke={foil} strokeWidth={0.3} />
              <path d="M0 -14V-10" stroke="#0d0907" strokeWidth={0.5} />
            </g>
          );
        })}
      </Layer>
      <Layer depth={0.4}>
        <g className="ce-rain">
          <path d={scene.rain} stroke="#d8c7a4" strokeWidth={0.4} opacity={0.32} />
        </g>
      </Layer>
      <Layer depth={1.4} cast>
        <defs>
          <radialGradient id={`${uid}-glow`}>
            <stop offset="0" stopColor="#ffbf66" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffbf66" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* The near eave, upturned, reaching out of the frame; the signs hang from it. */}
        <path d="M-12 -8H84Q92 2 100 -4L96 10Q88 13 80 11H-12Z" fill="#0b0805" />
        <path d="M-12 11H80Q88 13 96 10L100 -4" fill="none" stroke={foil} strokeWidth={1} />
        <path d="M-12 0H82M-12 5H86" stroke="#2a1f14" strokeWidth={0.8} />
        <path d="M18 11V18M38 11V18" stroke={foil} strokeWidth={0.6} />
        <circle cx={28} cy={74} r={44} fill={`url(#${uid}-glow)`} className="ce-anim ce-flicker" />
        <rect x={14} y={18} width={28} height={110} rx={1.5} fill="#1d120a" stroke={foil} strokeWidth={1.2} />
        <rect x={17.5} y={21.5} width={21} height={103} fill="none" stroke={foil} strokeWidth={0.4} />
        <text x={28} y={58} textAnchor="middle" fontFamily={SONG} fontSize={19} fontWeight={700} fill={foil}>
          茶
        </text>
        <text x={28} y={92} textAnchor="middle" fontFamily={SONG} fontSize={19} fontWeight={700} fill={foil}>
          馆
        </text>
        <text x={28} y={118} textAnchor="middle" fontFamily={SONG} fontSize={6} fill={foil} opacity={0.8}>
          通宵
        </text>
        <path d="M220 -6V24M234 -6V24" stroke={foil} strokeWidth={0.6} />
        <circle cx={228} cy={86} r={48} fill={`url(#${uid}-glow)`} />
        <rect x={212} y={24} width={30} height={124} rx={1.5} fill="#1d120a" stroke={foil} strokeWidth={1.2} />
        <rect x={215.5} y={27.5} width={23} height={117} fill="none" stroke={foil} strokeWidth={0.4} />
        <text x={227} y={66} textAnchor="middle" fontFamily={SONG} fontSize={20} fontWeight={700} fill={foil}>
          夜
        </text>
        <text x={227} y={102} textAnchor="middle" fontFamily={SONG} fontSize={20} fontWeight={700} fill={foil}>
          市
        </text>
        <circle cx={227} cy={130} r={5} fill={VERMILION} />
        {/* A round wine lantern at the near corner. */}
        <g transform="translate(224 190)">
          <path d="M0 -30V-18" stroke="#3a2a18" strokeWidth={0.8} />
          <circle r={26} fill={`url(#${uid}-glow)`} />
          <rect x={-8} y={-19} width={16} height={4} rx={1} fill={foil} />
          <ellipse rx={14} ry={15} fill="#c8321f" stroke="#6e1810" strokeWidth={0.6} />
          <path d="M-6 -14Q-10 0 -6 14M6 -14Q10 0 6 14M0 -15V15" fill="none" stroke="#7a1d12" strokeWidth={0.6} />
          <text y={5} textAnchor="middle" fontFamily={SONG} fontSize={13} fontWeight={700} fill="#ffe7b0">
            酒
          </text>
          <rect x={-8} y={14} width={16} height={4} rx={1} fill={foil} />
          <path d="M-2 18V30M0 18V32M2 18V30" stroke="#c8321f" strokeWidth={0.7} />
        </g>
      </Layer>
    </>
  );
});

// ——— SSR 编钟: one great bronze bell, close, struck by its mallet; the rack of smaller bells behind; sound rings out ———
const BELL_BODY = "M-35 34Q0 28 35 34C42 90 48 140 54 184Q30 172 0 168Q-30 172 -54 184C-48 140 -42 90 -35 34Z";
const BELL_STUDS: Pt[] = [];
for (const y of [60, 84, 108]) for (const x of [16, 25, 33]) BELL_STUDS.push([x + (y - 60) * 0.05, y]);

function smallBell(s: number) {
  return `M${f1(-0.23 * s)} 0Q0 ${f1(-0.04 * s)} ${f1(0.23 * s)} 0C${f1(0.28 * s)} ${f1(0.37 * s)} ${f1(0.32 * s)} ${f1(0.7 * s)} ${f1(0.36 * s)} ${f1(s)}Q${f1(0.2 * s)} ${f1(0.92 * s)} 0 ${f1(0.89 * s)}Q${f1(-0.2 * s)} ${f1(0.92 * s)} ${f1(-0.36 * s)} ${f1(s)}C${f1(-0.32 * s)} ${f1(0.7 * s)} ${f1(-0.28 * s)} ${f1(0.37 * s)} ${f1(-0.23 * s)} 0Z`;
}

export const BellsArt = memo(function BellsArt({ foil, uid }: ArtProps) {
  const ornament = useMemo(() => {
    let bands = "";
    for (const y of [46, 70, 94, 118]) {
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k += 1) {
          const x = side * (14 + k * 8);
          bands += `M${x} ${y + 3}q${side * 2} -4 ${side * 4} 0t${side * 4} 0`;
        }
      }
    }
    const taotie = [-1, 1].map((side) => spiral(side * 20, 146, 9, 1.4, side, Math.PI) + spiral(side * 36, 156, 6, 1.2, -side, 0) + spiral(side * 8, 158, 5, 1.1, side, -Math.PI / 2)).join("");
    return { bands, taotie };
  }, []);
  const rackTop = [30, 58, 86, 114, 142, 170, 198, 224];
  const rackLow = [22, 62, 190, 232];
  return (
    <>
      <Layer depth={-1.6}>
        <defs>
          <radialGradient id={`${uid}-bg`} cx="0.5" cy="0.4" r="0.8">
            <stop offset="0" stopColor="#2a1c0d" />
            <stop offset="1" stopColor="#060403" />
          </radialGradient>
          <pattern id={`${uid}-lw`} width={16} height={16} patternUnits="userSpaceOnUse">
            <path d="M2 2H14V14H5V5H11V11H8" fill="none" stroke={foil} strokeWidth={0.5} />
          </pattern>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-bg)`} />
        <rect {...FULL} fill={`url(#${uid}-lw)`} opacity={0.08} />
      </Layer>
      <Layer depth={-0.8}>
        {/* The rack: two beams, the posts, two rows of smaller bells. */}
        <g opacity={0.6}>
          <rect x={-20} y={30} width={AW + 40} height={8} fill="#2a1a0c" stroke={foil} strokeWidth={0.6} />
          <rect x={-20} y={112} width={AW + 40} height={8} fill="#2a1a0c" stroke={foil} strokeWidth={0.6} />
          <path d={`M4 30V${AH + 20}M248 30V${AH + 20}`} stroke="#2a1a0c" strokeWidth={8} />
          <path d={`M4 30V${AH + 20}M248 30V${AH + 20}`} stroke={foil} strokeWidth={0.5} opacity={0.6} />
          {rackTop.map((x, index) => {
            const s = 34 - index * 2.2;
            return (
              <g key={x} transform={`translate(${x} 40)`}>
                <g className="ce-anim ce-struck" style={{ animationDelay: `${-index * 0.6}s`, animationDuration: "6.4s" }}>
                  <path d={`M0 -2V2`} stroke={foil} strokeWidth={0.8} />
                  <path d={smallBell(s)} transform="translate(0 2)" fill="#3a2812" stroke={foil} strokeWidth={0.6} />
                </g>
              </g>
            );
          })}
          {rackLow.map((x, index) => (
            <g key={x} transform={`translate(${x} 122)`}>
              <path d={smallBell(54 - index * 3)} fill="#3a2812" stroke={foil} strokeWidth={0.7} />
            </g>
          ))}
        </g>
      </Layer>
      <Layer depth={0.4}>
        {[0, -1.6, -3.2].map((delay) => (
          <circle key={delay} cx={126} cy={150} r={34} fill="none" stroke={foil} strokeWidth={0.6} className="ce-anim ce-ripple" style={{ animationDelay: `${delay}s`, animationDuration: "4.8s" }} />
        ))}
      </Layer>
      <Layer depth={1.2} cast>
        <defs>
          <linearGradient id={`${uid}-bronze`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#140d06" />
            <stop offset="0.25" stopColor="#4a3418" />
            <stop offset="0.42" stopColor="#7a5a2a" />
            <stop offset="0.7" stopColor="#3a2812" />
            <stop offset="1" stopColor="#0f0904" />
          </linearGradient>
          <radialGradient id={`${uid}-stud`} cx="0.35" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#fff1c4" />
            <stop offset="0.5" stopColor="#c9a14d" />
            <stop offset="1" stopColor="#4a3418" />
          </radialGradient>
        </defs>
        <g transform="translate(126 18)">
          <g className="ce-anim ce-struck">
            {/* The shank (甬) with its ring and loop. */}
            <path d="M-5 0H5L7 34H-7Z" fill={`url(#${uid}-bronze)`} stroke={foil} strokeWidth={0.8} />
            <rect x={-8} y={14} width={16} height={5} rx={1} fill="#4a3418" stroke={foil} strokeWidth={0.6} />
            <path d={circle(10, 17, 3.4)} fill="none" stroke={foil} strokeWidth={1.2} />
            <path d={BELL_BODY} fill={`url(#${uid}-bronze)`} />
            <path d={BELL_BODY} fill={foil} opacity={0.16} />
            {/* The inscription panel (钲). */}
            <path d="M-10 42H10V122H-10Z" fill="none" stroke={foil} strokeWidth={0.8} />
            <path d="M-12.5 40H12.5V124H-12.5Z" fill="none" stroke={foil} strokeWidth={0.4} />
            {"曾侯乙乍時用終".split("").map((ch, k) => (
              <text key={k} x={0} y={54 + k * 10.6} textAnchor="middle" fontFamily={SONG} fontSize={8.6} fontWeight={700} fill={foil}>
                {ch}
              </text>
            ))}
            <path d={ornament.bands} fill="none" stroke={foil} strokeWidth={0.55} />
            {[-1, 1].map((side) =>
              BELL_STUDS.map(([x, y]) => (
                <g key={`${side}-${x}-${y}`}>
                  <circle cx={side * x} cy={y} r={3.6} fill={`url(#${uid}-stud)`} stroke="#2a1a0c" strokeWidth={0.4} />
                  <path d={spiral(side * x, y, 2.6, 1.2, side)} fill="none" stroke="#4a3418" strokeWidth={0.35} />
                </g>
              )),
            )}
            <path d="M-46 126Q0 120 46 126" fill="none" stroke={foil} strokeWidth={0.8} />
            <path d={ornament.taotie} fill="none" stroke={foil} strokeWidth={0.9} />
            <path d={BELL_BODY} fill="none" stroke={foil} strokeWidth={1.2} />
            <path d="M-54 184Q-30 172 0 168Q30 172 54 184" fill="none" stroke="#ffe3a0" strokeWidth={0.6} opacity={0.7} />
          </g>
        </g>
        <Caption x={20} y={AH - 18} color="#e9d3a0">
          曾侯乙编钟 · 战国
        </Caption>
      </Layer>
      <Layer depth={1.7} cast clip>
        {/* The mallet swings in from the corner and strikes the bell's lower face. */}
        <g transform="translate(252 282)">
          <g className="ce-anim ce-mallet">
            <path d="M0 0L-70 -62" stroke="#4a2e16" strokeWidth={4} strokeLinecap="round" />
            <path d="M0 0L-70 -62" stroke={foil} strokeWidth={0.6} opacity={0.6} />
            <g transform="translate(-74 -65) rotate(-48)">
              <rect x={-12} y={-6} width={24} height={12} rx={5} fill="#6a4426" stroke={foil} strokeWidth={0.8} />
              <path d="M-6 -6V6M6 -6V6" stroke={foil} strokeWidth={0.8} />
            </g>
          </g>
        </g>
      </Layer>
    </>
  );
});

// ——— UR 浮岛: islands afloat over a sea of cloud at dawn; waterfalls pour off the edge; cranes cross ———
function cloudRow(seed: number, y: number, size: number) {
  const random = seeded(seed);
  const bumps: Array<[number, number]> = [];
  for (let x = -40; x < 292 + 40; x += size * (0.7 + random() * 0.5)) bumps.push([x, size * (0.6 + random() * 0.6)]);
  let d = "";
  for (const shift of [0, 292]) for (const [x, r] of bumps) d += circle(x + shift, y - r * 0.4, r);
  return `${d}M-40 ${y}H${292 * 2 + 40}V${AH + 30}H-40Z`;
}

const ISLAND_LEFT: Pt[] = [
  [58, 112],
  [64, 130],
  [72, 146],
  [80, 160],
  [92, 178],
  [104, 196],
  [114, 210],
  [122, 222],
];
const ISLAND_RIGHT: Pt[] = [
  [198, 112],
  [192, 128],
  [182, 146],
  [170, 164],
  [158, 182],
  [144, 200],
  [132, 214],
];

export const IslandArt = memo(function IslandArt({ foil, uid }: ArtProps) {
  const parts = useMemo(() => {
    const random = seeded(31);
    const jag = (points: Pt[]) => points.flatMap(([x, y], k): Pt[] => (k === 0 ? [[x, y]] : [[x + (random() - 0.5) * 10, y - 6 + (random() - 0.5) * 4], [x + (random() - 0.5) * 6, y + (random() - 0.5) * 3]]));
    const rock = polyline([...jag(ISLAND_LEFT), ...jag(ISLAND_RIGHT).reverse()], true);
    // Strata bow down with the cone; crevices run down it.
    let strata = "";
    for (let k = 0; k < 8; k += 1) {
      const y = 124 + k * 12;
      strata += `M40 ${f1(y - 10)}Q128 ${f1(y + 10 + random() * 6)} 220 ${f1(y - 12 + random() * 4)}`;
    }
    for (let k = 0; k < 4; k += 1) {
      const x = 84 + k * 26 + random() * 8;
      strata += `M${f1(x)} 120q${f1((128 - x) * 0.2)} ${f1(30 + random() * 20)} ${f1((128 - x) * 0.45)} ${f1(60 + random() * 30)}`;
    }
    let roots = "";
    for (let k = 0; k < 10; k += 1) {
      const t = random();
      const [x, y] = random() < 0.5 ? ISLAND_LEFT[Math.floor(t * 6)] : ISLAND_RIGHT[Math.floor(t * 6)];
      roots += `M${x} ${y}q${f1((random() - 0.5) * 8)} ${f1(8 + random() * 8)} ${f1((random() - 0.5) * 6)} ${f1(16 + random() * 14)}`;
    }
    return { rock, strata, roots, rows: [cloudRow(3, 196, 22), cloudRow(7, 214, 26), cloudRow(11, 236, 30), cloudRow(17, 260, 34)] };
  }, []);
  const left = xiangyun(30, 266, 16, 1, 4);
  const right = xiangyun(236, 252, 13, -1, 9);
  const fall = (d: string) => (
    <>
      <path d={d} fill="none" stroke="#e8f4ff" strokeWidth={8} opacity={0.18} strokeLinecap="round" />
      <path d={d} fill="none" stroke="#f4fbff" strokeWidth={3.4} opacity={0.85} />
      <path d={d} fill="none" stroke="#a9cfe8" strokeWidth={0.8} strokeDasharray="3 9" className="ce-anim ce-fall" opacity={0.9} transform="translate(-0.8 0)" />
      <path d={d} fill="none" stroke="#a9cfe8" strokeWidth={0.6} strokeDasharray="2 10" className="ce-anim ce-fall" style={{ animationDuration: "0.7s" }} opacity={0.8} transform="translate(1 0)" />
    </>
  );
  return (
    <>
      <Layer depth={-1.8}>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1e1a3f" />
            <stop offset="0.45" stopColor="#5b4a86" />
            <stop offset="0.75" stopColor="#c98aa0" />
            <stop offset="1" stopColor="#f2c59a" />
          </linearGradient>
          <radialGradient id={`${uid}-sun`}>
            <stop offset="0" stopColor="#fff4d8" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#ffd8a8" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffd8a8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        <circle cx={196} cy={188} r={70} fill={`url(#${uid}-sun)`} />
        <path d="M30 20h0M80 34h0M150 16h0M212 40h0M236 18h0M110 50h0" stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" opacity={0.6} />
      </Layer>
      <Layer depth={-1.2}>
        {/* Two far islands, small and pale. */}
        {[
          [40, 58, 0.3],
          [214, 92, 0.24],
        ].map(([x, y, s]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${s}) translate(-128 -112)`} opacity={0.55}>
            <path d={parts.rock} fill="#7d6aa6" />
            <path d="M58 112Q128 98 198 112Q128 124 58 112Z" fill="#9a8cc0" />
            <path d="M190 116V230" stroke="#f4eeff" strokeWidth={3} opacity={0.7} />
          </g>
        ))}
      </Layer>
      <Layer depth={-0.5} clip>
        <defs>
          <linearGradient id={`${uid}-cloud`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff6f4" />
            <stop offset="1" stopColor="#c7b4dc" />
          </linearGradient>
        </defs>
        {parts.rows.map((d, index) => (
          <g key={index} className="ce-anim ce-drift-far" style={{ animationDuration: `${140 - index * 25}s` }}>
            <path d={d} fill="#8f7cb4" opacity={0.5} transform="translate(0 4)" />
            <path d={d} fill={`url(#${uid}-cloud)`} opacity={0.72 + index * 0.08} />
          </g>
        ))}
      </Layer>
      <Layer depth={0.7} cast>
        <defs>
          <linearGradient id={`${uid}-rock`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f8a86" />
            <stop offset="0.45" stopColor="#2c5a86" />
            <stop offset="1" stopColor="#1b2b55" />
          </linearGradient>
          <linearGradient id={`${uid}-grass`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fbf86" />
            <stop offset="1" stopColor="#3e7a5c" />
          </linearGradient>
          <linearGradient id={`${uid}-lit`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0b1430" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#0b1430" stopOpacity="0" />
            <stop offset="1" stopColor="#ffd8a8" stopOpacity="0.35" />
          </linearGradient>
          <clipPath id={`${uid}-rockclip`}>
            <path d={parts.rock} />
          </clipPath>
        </defs>
        <path d={parts.roots} fill="none" stroke="#24344f" strokeWidth={0.8} />
        <path d={parts.rock} fill={`url(#${uid}-rock)`} />
        <g clipPath={`url(#${uid}-rockclip)`}>
          <path d={parts.strata} fill="none" stroke="#9fd0c8" strokeWidth={0.6} opacity={0.28} />
          <path d={parts.strata} fill="none" stroke={foil} strokeWidth={0.45} opacity={0.45} transform="translate(0 3)" />
        </g>
        <path d={parts.rock} fill={`url(#${uid}-lit)`} />
        <path d={parts.rock} fill="none" stroke={foil} strokeWidth={0.8} />
        <path d="M58 112Q80 98 128 100Q176 98 198 112Q170 122 128 122Q86 122 58 112Z" fill={`url(#${uid}-grass)`} stroke={foil} strokeWidth={0.7} />
        {/* A pine and a pavilion with upturned eaves. */}
        <path d="M160 108C158 96 162 86 172 78" fill="none" stroke="#3a2a1c" strokeWidth={2.2} />
        {[
          [172, 76, 14, 4],
          [162, 86, 12, 3.4],
          [178, 88, 10, 3],
        ].map(([x, y, rx, ry]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={rx} ry={ry} fill="#2f5d48" stroke={foil} strokeWidth={0.4} />
        ))}
        <g transform="translate(108 106)">
          <rect x={-14} y={-2} width={28} height={4} fill="#d9cfc0" />
          <path d="M-10 -2V-16M10 -2V-16M-3 -2V-16M3 -2V-16" stroke="#a83a2c" strokeWidth={1.6} />
          <path d="M-20 -16Q-12 -18 0 -28Q12 -18 20 -16Q22 -19 24 -20Q18 -14 0 -15Q-18 -14 -24 -20Q-22 -19 -20 -16Z" fill="#24403f" stroke={foil} strokeWidth={0.6} />
          <path d="M0 -28V-33" stroke={foil} strokeWidth={1} />
        </g>
        {fall("M64 114C58 118 54 128 54 150L55 232")}
        {fall("M190 116C197 120 201 132 201 156L200 240")}
      </Layer>
      <Layer depth={1.1}>
        {[
          [0, 0.6],
          [-9, 0.45],
        ].map(([delay, s]) => (
          <g key={delay} className="ce-anim ce-crane" style={{ animationDelay: `${delay}s` }}>
            <g transform={`translate(0 ${delay ? 30 : 0}) scale(${s})`}>
              <path d="M-14 0Q0 -3 14 0Q0 3 -14 0Z" fill="#fbf7f2" />
              <path d="M-14 0Q-22 -2 -26 -6" fill="none" stroke="#fbf7f2" strokeWidth={1.4} />
              <circle cx={-26} cy={-6} r={1.4} fill={VERMILION} />
              <path d="M14 0L24 2" stroke="#2a2a2a" strokeWidth={0.8} />
              <g className="ce-anim ce-flap">
                <path d="M-4 0Q2 -16 12 -22Q8 -10 6 0Z" fill="#fbf7f2" />
                <path d="M8 -16Q11 -20 12 -22Q10 -14 9 -12Z" fill="#1a1a1a" />
              </g>
            </g>
          </g>
        ))}
      </Layer>
      <Layer depth={1.6} cast>
        {[left, right].map((cloud, index) => (
          <g key={index} className="ce-anim ce-float-x" style={{ animationDelay: `${-index * 3}s` }}>
            <RuyiCloud cloud={cloud} foil={foil} fill="#fbf4f8" />
          </g>
        ))}
      </Layer>
    </>
  );
});

// ——— UR 云龙: a dragon swims through cloud after the flaming pearl; scales, spines, claws, mane, whiskers ———
const DRAGON_SPINE: Pt[] = [
  [98, 106],
  [132, 120],
  [172, 98],
  [208, 66],
  [232, 108],
  [196, 148],
  [140, 150],
  [94, 170],
  [74, 210],
  [114, 240],
  [180, 234],
  [230, 252],
  [266, 266],
];
const dragonWidth = (t: number) => (t < 0.06 ? 7 + (t / 0.06) * 3.5 : 10.5 * (1 - 0.8 * Math.pow((t - 0.06) / 0.94, 1.25)));

interface DragonParts {
  body: string;
  shade: string;
  belly: string;
  bellyLines: string;
  scales: string;
  spikes: string;
  legs: Array<{ limb: string; claws: string; tuft: string }>;
  head: { x: number; y: number; deg: number; flip: boolean };
}

function dragonParts(): DragonParts {
  const spine = catmull(DRAGON_SPINE, 12);
  const list = frames(spine, dragonWidth);
  const band = (from: number, to: number) => {
    const a = list.map((f): Pt => [f.p[0] + f.n[0] * f.w * from, f.p[1] + f.n[1] * f.w * from]);
    const b = list.map((f): Pt => [f.p[0] + f.n[0] * f.w * to, f.p[1] + f.n[1] * f.w * to]);
    return polyline([...a, ...b.reverse()], true);
  };
  let bellyLines = "";
  let scales = "";
  let spikes = "";
  list.forEach((f, k) => {
    if (k < 2 || k > list.length - 3) return;
    const [px, py] = f.p;
    const [tx, ty] = f.t;
    const [nx, ny] = f.n;
    const b0: Pt = [px - nx * f.w * 0.95, py - ny * f.w * 0.95];
    const b1: Pt = [px - nx * f.w * 0.62, py - ny * f.w * 0.62];
    bellyLines += `M${f1(b0[0])} ${f1(b0[1])}L${f1(b1[0])} ${f1(b1[1])}`;
    const r = Math.max(0.9, f.w * 0.19);
    const shift = k % 2 ? r : 0;
    for (const u of [-0.42, -0.08, 0.26, 0.6]) {
      const cx = px + nx * f.w * u + tx * shift;
      const cy = py + ny * f.w * u + ty * shift;
      scales += `M${f1(cx + nx * r)} ${f1(cy + ny * r)}Q${f1(cx + tx * r * 1.5)} ${f1(cy + ty * r * 1.5)} ${f1(cx - nx * r)} ${f1(cy - ny * r)}`;
    }
    if (k % 2 === 0 && k / list.length > 0.06 && k / list.length < 0.93) {
      const h = f.w * 0.75 + 1.5;
      const base: Pt = [px + nx * f.w * 0.92, py + ny * f.w * 0.92];
      spikes += quad([
        [base[0] - tx * 2.4, base[1] - ty * 2.4],
        [base[0] + nx * h + tx * h * 0.6, base[1] + ny * h + ty * h * 0.6],
        [base[0] + tx * 2.4, base[1] + ty * 2.4],
      ]);
    }
  });
  const legs = [0.17, 0.25, 0.58].map((at) => {
    const f = list[Math.round(at * (list.length - 1))];
    const [px, py] = f.p;
    const [tx, ty] = f.t;
    const [nx, ny] = f.n;
    const hip: Pt = [px - nx * f.w * 0.6, py - ny * f.w * 0.6];
    const knee: Pt = [hip[0] - nx * 14 - tx * 6, hip[1] - ny * 14 - ty * 6];
    const paw: Pt = [knee[0] - tx * 12 - nx * 5, knee[1] - ty * 12 - ny * 5];
    const limb = tube(frames(catmull([hip, knee, paw], 6), (t) => 5.4 - t * 2.4));
    let claws = "";
    for (const deg of [-55, -18, 18, 55]) {
      const a = Math.atan2(-ty, -tx) + (deg * Math.PI) / 180;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      claws += `M${f1(paw[0])} ${f1(paw[1])}Q${f1(paw[0] + dx * 6.5 - dy * 2.4)} ${f1(paw[1] + dy * 6.5 + dx * 2.4)} ${f1(paw[0] + dx * 9.5 + dy * 2)} ${f1(paw[1] + dy * 9.5 - dx * 2)}`;
    }
    const tuft = [0, 1, 2].map((j) => `M${f1(knee[0])} ${f1(knee[1])}q${f1(tx * 6 - nx * (2 + j * 2))} ${f1(ty * 6 - ny * (2 + j * 2))} ${f1(tx * (10 + j * 2) + nx * 2)} ${f1(ty * (10 + j * 2) + ny * 2)}`).join("");
    return { limb, claws, tuft };
  });
  const head = list[0];
  const hx = -head.t[0];
  const hy = -head.t[1];
  return {
    body: tube(list),
    shade: band(-0.15, 0.6),
    belly: band(-0.95, -0.62),
    bellyLines,
    scales,
    spikes,
    legs,
    head: { x: head.p[0], y: head.p[1], deg: (Math.atan2(hy, hx) * 180) / Math.PI, flip: hx < 0 },
  };
}

const DRAGON_SKULL = "M0 -9C6 -14 14 -15 20 -13C24 -16 30 -15 33 -11C38 -11 43 -9 45 -5C46 -2 43 0 40 -1L22 1C14 3 6 4 0 7Z";
const DRAGON_JAW = "M8 4C16 6 28 8 38 12C40 14 37 16 33 15C24 14 14 12 4 9Z";

export const DragonArt = memo(function DragonArt({ foil, uid }: ArtProps) {
  const dragon = useMemo(() => dragonParts(), []);
  const clouds = useMemo(
    () => ({
      back: [xiangyun(140, 40, 13, 1, 2), xiangyun(22, 150, 11, 1, 6), xiangyun(236, 196, 12, -1, 8)],
      front: [xiangyun(178, 150, 14, 1, 12), xiangyun(36, 232, 13, 1, 14)],
    }),
    [],
  );
  const mane = useMemo(() => {
    const random = seeded(9);
    return Array.from({ length: 9 }, (_, k) => {
      const x0 = 4 - k * 1.2;
      const y0 = -8 + k * 1.8;
      return `M${f1(x0)} ${f1(y0)}C${f1(x0 - 10)} ${f1(y0 - 6 - random() * 6)} ${f1(x0 - 20)} ${f1(y0 + 4)} ${f1(x0 - 30 - random() * 8)} ${f1(y0 - 4 + random() * 6)}`;
    }).join("");
  }, []);
  const { head } = dragon;
  const headTransform = `translate(${f1(head.x)} ${f1(head.y)}) rotate(${f1(head.deg)})${head.flip ? " scale(1.35 -1.35)" : " scale(1.35)"}`;
  return (
    <>
      <Layer depth={-1.8}>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b0a18" />
            <stop offset="1" stopColor="#231c40" />
          </linearGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        <path d="M24 30h0M70 16h0M120 26h0M200 20h0M236 44h0M180 200h0M30 260h0M220 250h0" stroke="#ffffff" strokeWidth={1.1} strokeLinecap="round" opacity={0.55} />
      </Layer>
      <Layer depth={-0.9}>
        {clouds.back.map((cloud, index) => (
          <g key={index} opacity={0.5}>
            <RuyiCloud cloud={cloud} foil={foil} fill="#2e2756" line={1} />
          </g>
        ))}
      </Layer>
      <Layer depth={0.8} cast>
        <defs>
          <radialGradient id={`${uid}-aura`}>
            <stop offset="0" stopColor="#bfa8ff" stopOpacity="0.25" />
            <stop offset="1" stopColor="#bfa8ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={150} cy={150} r={130} fill={`url(#${uid}-aura)`} />
        {dragon.legs.map((leg, index) => (
          <g key={index} opacity={index === 1 ? 0.75 : 1}>
            <path d={leg.tuft} fill="none" stroke={VERMILION} strokeWidth={1.1} strokeLinecap="round" />
            <path d={leg.limb} fill={foil} stroke="#140f24" strokeWidth={0.7} />
            <path d={leg.claws} fill="none" stroke="#140f24" strokeWidth={2.2} strokeLinecap="round" />
            <path d={leg.claws} fill="none" stroke="#f6eedd" strokeWidth={1.1} strokeLinecap="round" />
          </g>
        ))}
        <path d={dragon.spikes} fill={VERMILION} stroke="#140f24" strokeWidth={0.4} />
        <path d={dragon.body} fill={foil} />
        <path d={dragon.body} fill="#1a1030" opacity={0.42} />
        <path d={dragon.shade} fill={foil} opacity={0.55} />
        <path d={dragon.belly} fill="#d8bf86" />
        <path d={dragon.bellyLines} stroke="#7a5a2a" strokeWidth={0.45} opacity={0.7} />
        <path d={dragon.scales} fill="none" stroke="#f6f0ff" strokeWidth={0.45} opacity={0.35} transform="translate(0.5 0.5)" />
        <path d={dragon.scales} fill="none" stroke="#120d22" strokeWidth={0.6} opacity={0.8} />
        <path d={dragon.body} fill="none" stroke="#140f24" strokeWidth={0.8} />
        <g transform={headTransform}>
          <path d={mane} fill="none" stroke={VERMILION} strokeWidth={2.2} strokeLinecap="round" />
          <path d={mane} fill="none" stroke="#ffb26a" strokeWidth={0.8} strokeLinecap="round" />
          <path d="M12 -13C6 -24 -6 -32 -20 -34M2 -26C0 -32 4 -36 8 -38M8 -12C2 -20 -8 -26 -18 -26" fill="none" stroke="#140f24" strokeWidth={3} strokeLinecap="round" />
          <path d="M12 -13C6 -24 -6 -32 -20 -34M2 -26C0 -32 4 -36 8 -38M8 -12C2 -20 -8 -26 -18 -26" fill="none" stroke="#f3e6c6" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M22 1L40 -1C39 6 38 10 38 12C28 8 16 6 8 4Z" fill="#5a1414" />
          <path d={DRAGON_JAW} fill={foil} stroke="#140f24" strokeWidth={0.7} />
          <path d={DRAGON_SKULL} fill={foil} stroke="#140f24" strokeWidth={0.8} />
          <path d={DRAGON_SKULL} fill="#1a1030" opacity={0.25} />
          <path d="M35 0L36.5 5L38 0ZM27 1L28.4 4.6L29.8 1.4ZM33 12.5L34 8.5L35.6 12Z" fill="#fbf6ea" />
          <path d="M30 8C38 8 46 10 51 5" fill="none" stroke="#c8321f" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M17 -9Q22 -13 27 -9Q22 -6 17 -9Z" fill="#fff3c4" stroke="#140f24" strokeWidth={0.5} />
          <circle cx={23} cy={-9.2} r={1.6} fill="#140f24" />
          <path d="M15 -12Q22 -17 29 -12" fill="none" stroke="#140f24" strokeWidth={1.4} />
          <path d={spiral(41.5, -7, 2.4, 1.1, 1)} fill="none" stroke="#140f24" strokeWidth={0.6} />
          <path d="M12 12q-4 6 -10 7M18 13q-2 6 -8 9M24 14q0 6 -5 9" fill="none" stroke="#f3e6c6" strokeWidth={0.9} strokeLinecap="round" />
          <g transform="translate(40 -3)">
            <path d="M0 0C10 -6 16 7 26 1C32 -3 38 2 42 -1" fill="none" stroke={foil} strokeWidth={0.9} className="ce-anim ce-whisker" />
          </g>
          <g transform="translate(39 1)">
            <path d="M0 0C8 5 14 -3 24 3C30 7 34 4 38 7" fill="none" stroke={foil} strokeWidth={0.8} className="ce-anim ce-whisker" style={{ animationDelay: "-1.6s" }} />
          </g>
        </g>
      </Layer>
      <Layer depth={1.5} cast>
        <defs>
          <radialGradient id={`${uid}-pearl-glow`}>
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="0.3" stopColor="#ffd2e8" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffd2e8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-pearl`} cx="0.35" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c9d8ff" />
          </radialGradient>
        </defs>
        <g transform="translate(46 52)">
          <circle r={28} fill={`url(#${uid}-pearl-glow)`} className="ce-anim ce-glint" />
          <Spin x={0} y={0} seconds={9}>
            {[0, 72, 144, 216, 288].map((deg) => (
              <path key={deg} d="M9 0C14 -4 18 -2 20 -8C16 -6 13 -9 9 -5Z" fill="#ff7a3c" opacity={0.85} transform={`rotate(${deg})`} />
            ))}
          </Spin>
          <circle r={7} fill={`url(#${uid}-pearl)`} stroke={foil} strokeWidth={0.6} />
        </g>
        {clouds.front.map((cloud, index) => (
          <g key={index} className="ce-anim ce-float-x" style={{ animationDelay: `${-index * 2.5}s` }}>
            <RuyiCloud cloud={cloud} foil={foil} fill="#f4efff" />
          </g>
        ))}
      </Layer>
    </>
  );
});
