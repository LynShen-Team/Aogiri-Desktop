/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Pack 2 「星海」 (owner 2026-11-24: as striking as pack 1): antique instruments of the sky and the sea in
// engraving, then the deep sky. Ten pictures, each with its own motion.
import { ceJsx, CeFragment, memo, useMemo, type ReactNode } from "../jsx";
import { polyline, seeded, sunburst, type Pt } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer, Spin } from "../layer";

const INK = "#2b251f";
const PAPER = "#ede3cd";
const SERIF = "Georgia, 'Times New Roman', serif";

const f1 = (value: number) => value.toFixed(1);
const circle = (cx: number, cy: number, r: number) => `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;

/** Graduation of a circle inwards from radius r, with long marks every `every` and middle marks every `half`. */
function graduation(cx: number, cy: number, r: number, count: number, len: number, every: number, half = 0) {
  let d = "";
  for (let k = 0; k < count; k += 1) {
    const a = (k / count) * Math.PI * 2;
    const l = k % every === 0 ? len : half && k % half === 0 ? len * 0.65 : len * 0.38;
    d += `M${f1(cx + Math.cos(a) * r)} ${f1(cy + Math.sin(a) * r)}L${f1(cx + Math.cos(a) * (r - l))} ${f1(cy + Math.sin(a) * (r - l))}`;
  }
  return d;
}

/** A closed curve through the midpoints of a polygon (soft coasts and continents). */
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

/** Aged paper: a warm ground, darker edges, a few stains and two fold creases. */
function AgedPaper({ uid, tone = PAPER, folds = true, stains = 3 }: { uid: string; tone?: string; folds?: boolean; stains?: number }) {
  const spots = useMemo(() => {
    const random = seeded(stains * 17 + 3);
    return Array.from({ length: stains }, () => ({ x: random() * AW, y: random() * AH, r: 20 + random() * 50 }));
  }, [stains]);
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-ap`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor={tone} />
          <stop offset="0.75" stopColor="#ddcfb2" />
          <stop offset="1" stopColor="#c9b791" />
        </radialGradient>
        <radialGradient id={`${uid}-stain`}>
          <stop offset="0" stopColor="#9c7d4f" stopOpacity="0" />
          <stop offset="0.8" stopColor="#9c7d4f" stopOpacity="0.12" />
          <stop offset="1" stopColor="#9c7d4f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect {...FULL} fill={`url(#${uid}-ap)`} />
      {spots.map((spot, index) => (
        <circle key={index} cx={spot.x} cy={spot.y} r={spot.r} fill={`url(#${uid}-stain)`} />
      ))}
      {folds ? (
        <g opacity={0.5}>
          <path d={`M${AW / 2} -20V${AH + 20}`} stroke="#fff8e8" strokeWidth={1.2} />
          <path d={`M${AW / 2 + 1} -20V${AH + 20}`} stroke="#8c7550" strokeWidth={0.4} />
          <path d={`M-20 ${AH / 2}H${AW + 20}`} stroke="#fff8e8" strokeWidth={1.2} />
          <path d={`M-20 ${AH / 2 + 1}H${AW + 20}`} stroke="#8c7550" strokeWidth={0.4} />
        </g>
      ) : null}
    </>
  );
}

function Stars({ count, seed, color = "#fff", twinkle = 0.06, big = 0.6 }: { count: number; seed: number; color?: string; twinkle?: number; big?: number }) {
  const stars = useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: count }, () => [random() * (AW + 30) - 15, random() * (AH + 30) - 15, random()] as const);
  }, [count, seed]);
  return (
    <>
      {stars.map(([x, y, b], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={0.25 + b * big}
          fill={color}
          opacity={0.15 + b * 0.7}
          className={b < twinkle ? "ce-blink" : undefined}
          style={b < twinkle ? { animationDelay: `${-index * 0.43}s` } : undefined}
        />
      ))}
    </>
  );
}

/** Parallel hatching as a pattern, for engraved shade. */
function Hatch({ id, angle = 40, gap = 1.8, color = INK, width = 0.45 }: { id: string; angle?: number; gap?: number; color?: string; width?: number }) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
      <path d={`M0 0V${gap}`} stroke={color} strokeWidth={width} />
    </pattern>
  );
}

function Caption({ x, y, anchor = "start", color = INK, children }: { x: number; y: number; anchor?: "start" | "middle" | "end"; color?: string; children: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={SERIF} fontStyle="italic" fontSize={7} fill={color} opacity={0.75}>
      {children}
    </text>
  );
}

// ——— A moon in stipple (月相, 望远镜): dots where the light falls, fewer in the seas, craters, Tycho's rays ———
const MARIA: Array<[number, number, number]> = [
  [-0.25, -0.38, 0.26],
  [0.16, -0.3, 0.16],
  [0.3, -0.06, 0.18],
  [-0.58, 0.02, 0.3],
  [-0.18, 0.34, 0.17],
  [0.62, -0.26, 0.1],
  [0.46, 0.14, 0.12],
  [-0.42, 0.42, 0.12],
];

interface Moon {
  fine: string;
  bold: string;
  /** The dark seas, as soft shapes. */
  maria: string;
  craters: Array<{ x: number; y: number; r: number }>;
  rays: string;
  /** Where the rim of a crater catches the light (radians): the side away from the sun. */
  rimAngle: number;
}

function stippleMoon(cx: number, cy: number, r: number, light: [number, number, number], seed: number, density: number): Moon {
  const length = Math.hypot(light[0], light[1], light[2]) || 1;
  const lx = light[0] / length;
  const ly = light[1] / length;
  const lz = light[2] / length;
  const random = seeded(seed);
  let fine = "";
  let bold = "";
  const count = Math.round(r * r * density);
  for (let k = 0; k < count; k += 1) {
    const u = random() * 2 - 1;
    const v = random() * 2 - 1;
    const d2 = u * u + v * v;
    if (d2 > 0.985) continue;
    const z = Math.sqrt(1 - d2);
    let b = Math.max(0, u * lx + v * ly + z * lz);
    let sea = 0;
    for (const [mx, my, mr] of MARIA) sea += Math.exp(-((u - mx) ** 2 + (v - my) ** 2) / (mr * mr));
    b *= 1 - Math.min(0.75, sea * 0.7);
    b *= 0.7 + 0.3 * z;
    if (random() > b * b) continue;
    const seg = `M${f1(cx + u * r)} ${f1(cy + v * r)}h0`;
    if (random() < 0.16) bold += seg;
    else fine += seg;
  }
  let maria = "";
  for (const [mx, my, mr] of MARIA) {
    const points: Pt[] = [];
    for (let j = 0; j < 11; j += 1) {
      const a = (j / 11) * Math.PI * 2;
      const rr = mr * r * (0.72 + random() * 0.38);
      points.push([cx + mx * r + Math.cos(a) * rr, cy + my * r + Math.sin(a) * rr]);
    }
    maria += smoothClosed(points);
  }
  const craters: Moon["craters"] = [];
  for (let k = 0; k < 9; k += 1) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * 0.8;
    craters.push({ x: cx + Math.cos(a) * d * r, y: cy + Math.sin(a) * d * r, r: (0.025 + random() * 0.05) * r });
  }
  const tx = cx - 0.12 * r;
  const ty = cy + 0.66 * r;
  let rays = "";
  for (let k = 0; k < 26; k += 1) {
    const a = random() * Math.PI * 2;
    let len = (0.2 + random() * 0.75) * r;
    // Keep the rays on the disc.
    for (let step = 0; step < 6 && Math.hypot(tx + Math.cos(a) * len - cx, ty + Math.sin(a) * len - cy) > r * 0.97; step += 1) len *= 0.7;
    rays += `M${f1(tx)} ${f1(ty)}L${f1(tx + Math.cos(a) * len)} ${f1(ty + Math.sin(a) * len)}`;
  }
  craters.push({ x: tx, y: ty, r: r * 0.045 });
  return { fine, bold, maria, craters, rays, rimAngle: Math.atan2(-ly, -lx) };
}

/** The moon: a lit disc, its dark seas, stipple for the grain, shade towards the night side, a few craters. */
function MoonDisc({ id, moon, cx, cy, r, color, ground, dot = 0.85 }: { id: string; moon: Moon; cx: number; cy: number; r: number; color: string; ground: string; dot?: number }) {
  const rim = (x: number, y: number, rr: number) => {
    const a0 = moon.rimAngle - 1.2;
    const a1 = moon.rimAngle + 1.2;
    return `M${f1(x + Math.cos(a0) * rr)} ${f1(y + Math.sin(a0) * rr)}A${f1(rr)} ${f1(rr)} 0 0 1 ${f1(x + Math.cos(a1) * rr)} ${f1(y + Math.sin(a1) * rr)}`;
  };
  const fx = cx - Math.cos(moon.rimAngle) * r * 0.4;
  const fy = cy - Math.sin(moon.rimAngle) * r * 0.4;
  return (
    <>
      <defs>
        <radialGradient id={`${id}-shade`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r * 1.02} fx={fx} fy={fy}>
          <stop offset="0" stopColor={ground} stopOpacity="0" />
          <stop offset="0.6" stopColor={ground} stopOpacity="0.12" />
          <stop offset="1" stopColor={ground} stopOpacity="0.88" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={ground} />
      <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.5} />
      <path d={moon.maria} fill={ground} opacity={0.42} />
      <path d={moon.rays} stroke={color} strokeWidth={0.5} opacity={0.45} />
      <path d={moon.fine} stroke={color} strokeWidth={dot} strokeLinecap="round" />
      <path d={moon.bold} stroke={color} strokeWidth={dot * 1.6} strokeLinecap="round" />
      {moon.craters.map((crater, index) => (
        <g key={index}>
          <circle cx={crater.x - Math.cos(moon.rimAngle) * crater.r * 0.2} cy={crater.y - Math.sin(moon.rimAngle) * crater.r * 0.2} r={crater.r * 0.85} fill={ground} opacity={0.45} />
          <path d={rim(crater.x, crater.y, crater.r)} fill="none" stroke={color} strokeWidth={Math.max(0.35, crater.r * 0.16)} strokeLinecap="round" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-shade)`} />
    </>
  );
}

// ——— N 星盘: an engraved astrolabe; the rete turns over the plate, the rule turns the other way ———
const AS_CX = AW / 2;
const AS_CY = 150;
const AS_R = 96;
// The rete's scrolls, drawn once for the right half and mirrored for the left.
const RETE_SCROLLS = ["M3 -24C10 -54 44 -68 62 -52C74 -40 66 -24 54 -27C46 -29 47 -38 54 -38", "M24 2C42 -4 64 4 71 18C76 30 66 40 58 34C52 29 56 22 62 25", "M6 30C10 50 26 62 40 66"];
// Star pointers on the right half: x, y, direction (degrees), length. Mirrored too.
const RETE_STARS: Array<[number, number, number, number]> = [
  [61, -50, -38, 11],
  [26, -46, -78, 12],
  [70, 17, 12, 10],
  [58, 34, 62, 9],
  [38, 64, 80, 10],
  [50, -16, -10, 9],
];

function dagger(x: number, y: number, deg: number, len: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const nx = -s;
  const ny = c;
  const w = len * 0.26;
  return `M${f1(x + nx * w)} ${f1(y + ny * w)}Q${f1(x + c * len * 0.55 + nx * w * 1.3)} ${f1(y + s * len * 0.55 + ny * w * 1.3)} ${f1(x + c * len)} ${f1(y + s * len)}Q${f1(x + c * len * 0.4 - nx * w * 0.1)} ${f1(y + s * len * 0.4 - ny * w * 0.1)} ${f1(x - nx * w)} ${f1(y - ny * w)}Z`;
}

export const AstrolabeArt = memo(function AstrolabeArt({ uid }: ArtProps) {
  const cx = AS_CX;
  const cy = AS_CY;
  const R = AS_R;
  const plate = useMemo(() => {
    let alm = "";
    for (let k = 0; k < 9; k += 1) alm += circle(AS_CX, AS_CY - 22 + k * 3.6, 14 + k * 8.5);
    let hours = "";
    for (let k = 1; k < 12; k += 1) {
      const a = Math.PI * 0.1 + (k / 12) * Math.PI * 0.8;
      hours += `M${AS_CX} ${AS_CY + 10}Q${f1(AS_CX + Math.cos(a) * 60)} ${f1(AS_CY + 30 + Math.sin(a) * 20)} ${f1(AS_CX + Math.cos(a) * 84)} ${f1(AS_CY + Math.sin(a) * 84)}`;
    }
    const numbers: Array<[number, number, string]> = Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
      return [AS_CX + Math.cos(a) * (AS_R - 15), AS_CY + Math.sin(a) * (AS_R - 15) + 2.5, String(k * 30)];
    });
    return { alm, hours, numbers, tropics: circle(AS_CX, AS_CY, 40) + circle(AS_CX, AS_CY, 62) + circle(AS_CX, AS_CY, 84) };
  }, []);
  const rete = useMemo(() => {
    let pointers = "";
    let tips = "";
    for (const side of [1, -1]) {
      for (const [x, y, deg, len] of RETE_STARS) {
        const sx = x * side;
        const sdeg = side > 0 ? deg : 180 - deg;
        pointers += dagger(sx, y, sdeg, len);
        const a = (sdeg * Math.PI) / 180;
        tips += circle(sx + Math.cos(a) * len, y + Math.sin(a) * len, 1.2);
      }
    }
    return {
      pointers,
      tips,
      ecliptic: circle(0, -14, 56) + circle(0, -14, 49),
      zodiac: graduation(0, -14, 56, 72, 7, 6),
      outer: circle(0, 0, 84),
      hub: circle(0, 0, 9),
    };
  }, []);
  const stars = useMemo(() => {
    const random = seeded(4);
    const points: Pt[] = Array.from({ length: 18 }, () => [random() * AW, random() * AH]);
    return { points, lines: polyline(points.slice(0, 6)) + polyline(points.slice(8, 13)) };
  }, []);
  return (
    <>
      <Layer depth={-1.2}>
        <AgedPaper uid={uid} folds={false} />
        <g opacity={0.35}>
          <path d={circle(cx, cy, 150) + circle(cx, cy, 210)} fill="none" stroke={INK} strokeWidth={0.3} strokeDasharray="2 3" />
          <path d={stars.lines} fill="none" stroke={INK} strokeWidth={0.4} strokeDasharray="1.5 2" />
          {stars.points.map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r={1.1} fill={INK} />
          ))}
        </g>
        <Caption x={20} y={AH - 20}>
          Astrolabium planisphaericum, c. 1550
        </Caption>
      </Layer>
      <Layer depth={0.5} cast>
        <defs>
          <Hatch id={`${uid}-h`} />
          <mask id={`${uid}-crescent`}>
            <path d={circle(cx, cy, R)} fill="#fff" />
            <path d={circle(cx - 9, cy - 9, R)} fill="#000" />
          </mask>
        </defs>
        {/* Throne with its ring and curls. */}
        <path d={`M${cx - 18} ${cy - R + 4}C${cx - 18} ${cy - R - 16} ${cx - 6} ${cy - R - 20} ${cx} ${cy - R - 24}C${cx + 6} ${cy - R - 20} ${cx + 18} ${cy - R - 16} ${cx + 18} ${cy - R + 4}Z`} fill="#efe5cf" stroke={INK} strokeWidth={0.9} />
        <path d={`M${cx - 12} ${cy - R - 6}q6 -8 12 -2q6 -6 12 2`} fill="none" stroke={INK} strokeWidth={0.6} />
        <path d={circle(cx, cy - R - 31, 6.5) + circle(cx, cy - R - 31, 4)} fill="none" stroke={INK} strokeWidth={0.9} />
        <path d={circle(cx, cy, R)} fill="#efe5cf" stroke={INK} strokeWidth={1.2} />
        <path d={circle(cx, cy, R - 8) + circle(cx, cy, R - 20)} fill="none" stroke={INK} strokeWidth={0.6} />
        <path d={graduation(cx, cy, R, 180, 8, 15, 5)} stroke={INK} strokeWidth={0.4} />
        {plate.numbers.map(([x, y, label]) => (
          <text key={label} x={x} y={y} textAnchor="middle" fontFamily={SERIF} fontSize={6.2} fill={INK}>
            {label}
          </text>
        ))}
        <path d={plate.alm} fill="none" stroke={INK} strokeWidth={0.32} opacity={0.85} />
        <path d={plate.tropics} fill="none" stroke={INK} strokeWidth={0.45} />
        <path d={plate.hours} fill="none" stroke={INK} strokeWidth={0.3} opacity={0.7} />
        <path d={`M${cx - R + 20} ${cy}H${cx + R - 20}M${cx} ${cy - R + 20}V${cy + R - 20}`} stroke={INK} strokeWidth={0.4} />
        <path d={circle(cx, cy, R)} fill={`url(#${uid}-h)`} mask={`url(#${uid}-crescent)`} opacity={0.8} />
      </Layer>
      <Layer depth={1.1}>
        <Spin x={cx} y={cy} seconds={140}>
          {/* Cross bars, then the rim and the ecliptic ring: each an ink line with a paper line inside, like cut brass. */}
          <path d="M-84 -1.8H84V1.8H-84ZM-1.8 -84H1.8V84H-1.8Z" fill="#efe5cf" stroke={INK} strokeWidth={0.6} />
          {RETE_SCROLLS.map((d) => (
            <g key={d}>
              {[1, -1].map((side) => (
                <g key={side} transform={`scale(${side} 1)`}>
                  <path d={d} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
                  <path d={d} fill="none" stroke="#efe5cf" strokeWidth={0.9} strokeLinecap="round" />
                </g>
              ))}
            </g>
          ))}
          <path d={rete.outer} fill="none" stroke={INK} strokeWidth={3.2} />
          <path d={rete.outer} fill="none" stroke="#efe5cf" strokeWidth={1.6} />
          <path d={rete.ecliptic} fill="none" stroke={INK} strokeWidth={4.2} />
          <path d={rete.ecliptic} fill="none" stroke="#efe5cf" strokeWidth={2.6} />
          <path d={circle(0, -14, 52.5)} fill="none" stroke="#efe5cf" strokeWidth={7} />
          <path d={rete.zodiac} stroke={INK} strokeWidth={0.4} />
          <path d={rete.ecliptic} fill="none" stroke={INK} strokeWidth={0.6} />
          <path d={rete.pointers} fill={INK} />
          <path d={rete.tips} fill="#efe5cf" stroke={INK} strokeWidth={0.5} />
          <path d={rete.hub} fill="#efe5cf" stroke={INK} strokeWidth={0.9} />
        </Spin>
      </Layer>
      <Layer depth={1.6} cast>
        <Spin x={cx} y={cy} seconds={80} reverse phase={28}>
          <path d="M-94 -3.2L-6 -3.2L0 -6L6 -3.2L94 -3.2V3.2H6L0 6L-6 3.2H-94Z" fill="#f3ead6" stroke={INK} strokeWidth={0.8} />
          <path d="M-70 -3.2V-12H-64V-3.2M64 -3.2V-12H70V-3.2" fill="#f3ead6" stroke={INK} strokeWidth={0.7} />
          <path d="M-60 0H60" stroke={INK} strokeWidth={0.3} />
          <path d={circle(0, 0, 4.5)} fill="#f3ead6" stroke={INK} strokeWidth={0.9} />
          <path d="M-2 0H2" stroke={INK} strokeWidth={0.9} />
        </Spin>
      </Layer>
    </>
  );
});

// ——— N 六分仪: a brass sextant over an engraved sea; the index arm swings, the mirrors glint ———
const SX_A0 = Math.PI / 2 + 0.55;
const SX_A1 = Math.PI / 2 - 0.55;
const sxAt = (radius: number, a: number): Pt => [Math.cos(a) * radius, Math.sin(a) * radius];
const sxArc = (radius: number) => {
  const p0 = sxAt(radius, SX_A0);
  const p1 = sxAt(radius, SX_A1);
  return `M${f1(p0[0])} ${f1(p0[1])}A${radius} ${radius} 0 0 0 ${f1(p1[0])} ${f1(p1[1])}`;
};
const sxLine = (r0: number, r1: number, a: number) => {
  const p = sxAt(r0, a);
  const q = sxAt(r1, a);
  return `M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`;
};

export const SextantArt = memo(function SextantArt({ uid }: ArtProps) {
  const parts = useMemo(() => {
    // The frame, as strokes: the limb, two side bars, a brace, three rings between brace and limb, one near the apex.
    const rings: Array<[number, number]> = [
      [114, Math.PI / 2 - 0.3],
      [114, Math.PI / 2],
      [114, Math.PI / 2 + 0.3],
    ];
    const frame: Array<{ d: string; w: number }> = [
      { d: sxArc(150), w: 18 },
      { d: sxLine(0, 148, SX_A0), w: 8 },
      { d: sxLine(0, 148, SX_A1), w: 8 },
      { d: sxArc(88), w: 5 },
      ...rings.map(([r, a]) => ({ d: circle(...sxAt(r, a), 12), w: 4.5 })),
      ...rings.map(([, a]) => ({ d: sxLine(86, 103, a) + sxLine(125, 145, a), w: 4 })),
      { d: circle(...sxAt(56, Math.PI / 2), 10), w: 4.5 },
      { d: sxLine(0, 47.5, Math.PI / 2) + sxLine(64.5, 89, Math.PI / 2), w: 5 },
    ];
    let ticks = "";
    const labels: Array<[number, number, string]> = [];
    const span = SX_A0 - SX_A1;
    for (let k = 0; k <= 120; k += 1) {
      const a = SX_A0 - (span * k) / 120;
      const l = k % 20 === 0 ? 7 : k % 10 === 0 ? 5 : 2.6;
      ticks += sxLine(158 - l, 158, a);
      if (k % 20 === 0) {
        const t = sxAt(146, a);
        labels.push([t[0], t[1] + 2, String(120 - k)]);
      }
    }
    return { frame, ticks, labels };
  }, []);
  const sea = useMemo(() => {
    const random = seeded(9);
    let d = "";
    for (let row = 0; row < 14; row += 1) {
      const y = 199 + row * 6;
      for (let k = 0; k < 8 + row; k += 1) {
        const x = random() * AW;
        const w = 6 + random() * 14 * (0.5 + row / 14);
        d += `M${f1(x)} ${f1(y)}q${f1(w / 2)} ${f1(-1.2 - row * 0.08)} ${f1(w)} 0`;
      }
    }
    return d;
  }, []);
  const frameLayer = (stroke: string, extra: number, opacity = 1) => (
    <g opacity={opacity}>
      {parts.frame.map((part, index) => (
        <path key={index} d={part.d} fill="none" stroke={stroke} strokeWidth={part.w + extra} />
      ))}
    </g>
  );
  return (
    <>
      <Layer depth={-1.2}>
        <AgedPaper uid={uid} folds={false} />
        <path d={`M-20 196H${AW + 20}`} stroke={INK} strokeWidth={0.6} />
        <path d={sea} fill="none" stroke={INK} strokeWidth={0.4} opacity={0.6} />
        <path d={sunburst({ cx: 208, cy: 196, r0: 11, r1: 42, rays: 40, squash: 1 })} stroke={INK} strokeWidth={0.35} opacity={0.5} />
        <path d="M197 196a11 11 0 0 1 22 0" fill={PAPER} stroke={INK} strokeWidth={0.6} />
        {/* A ship hull-down on the horizon, two gulls. */}
        <path d="M30 196h14l-2 -2h-10ZM35 194v-9M39 194v-7M35 186q3 2 0 5M39 188q3 2 0 4" fill={INK} stroke={INK} strokeWidth={0.5} />
        <path d="M206 96q4 -4 8 0q4 -4 8 0M222 112q3 -3 6 0q3 -3 6 0" fill="none" stroke={INK} strokeWidth={0.7} />
        <Caption x={20} y={AH - 18}>
          Fig. 3 · Sextans, J. Hadley
        </Caption>
      </Layer>
      <Layer depth={0.9} cast>
        <defs>
          <Hatch id={`${uid}-h`} angle={-35} gap={1.5} />
          <linearGradient id={`${uid}-mirror`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8d9aa2" />
            <stop offset="0.5" stopColor="#f6fbfd" />
            <stop offset="1" stopColor="#6f7b82" />
          </linearGradient>
        </defs>
        <g transform="translate(126 40) rotate(-8)">
          {/* The wooden handle, behind the frame. */}
          <path d="M38 66C72 56 88 92 62 116" fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
          <path d="M38 66C72 56 88 92 62 116" fill="none" stroke="#8a5d37" strokeWidth={10} strokeLinecap="round" />
          <path d="M44 64C70 58 82 86 64 108M48 68C68 64 76 86 62 104" fill="none" stroke="#5c3a20" strokeWidth={0.5} />
          {frameLayer(INK, 1.8)}
          {frameLayer("#ebe1c8", 0)}
          {parts.frame.map((part, index) => (
            <path key={index} d={part.d} fill="none" stroke={`url(#${uid}-h)`} strokeWidth={part.w} opacity={0.42} />
          ))}
          <path d={sxArc(158) + sxArc(150.5)} fill="none" stroke={INK} strokeWidth={0.5} />
          <path d={parts.ticks} stroke={INK} strokeWidth={0.4} />
          {parts.labels.map(([x, y, label]) => (
            <text key={label} x={x} y={y} textAnchor="middle" fontFamily={SERIF} fontSize={5} fill={INK}>
              {label}
            </text>
          ))}
          {/* Coloured shades on their hinge, between the two mirrors. */}
          {[
            ["#b8903e", 0],
            ["#6d8a5c", 9],
            ["#a2504a", 18],
          ].map(([color, dy]) => (
            <rect key={color} x={-31} y={18 + Number(dy)} width={12} height={8} rx={1} fill={String(color)} opacity={0.75} stroke={INK} strokeWidth={0.6} transform={`rotate(-18 -18 ${22 + Number(dy)})`} />
          ))}
          <path d="M-17 18V46" stroke={INK} strokeWidth={1.2} />
          {/* Telescope across the frame, and the horizon glass: half silvered, half clear. */}
          <rect x={-14} y={53} width={86} height={11} rx={2} fill="#efe6d0" stroke={INK} strokeWidth={0.8} />
          <rect x={-14} y={53} width={86} height={11} rx={2} fill={`url(#${uid}-h)`} opacity={0.3} />
          <path d="M0 53V64M12 53V64M58 53V64" stroke={INK} strokeWidth={0.5} />
          <rect x={72} y={55} width={14} height={7} rx={1.5} fill="#efe6d0" stroke={INK} strokeWidth={0.7} />
          <rect x={-32} y={44} width={7} height={26} fill={`url(#${uid}-mirror)`} stroke={INK} strokeWidth={0.7} className="ce-anim ce-glint-soft" />
          <rect x={-25} y={44} width={7} height={26} fill="#f5eedd" fillOpacity={0.4} stroke={INK} strokeWidth={0.7} />
          <path d={circle(0, 0, 7)} fill="#ebe1c8" stroke={INK} strokeWidth={1} />
        </g>
      </Layer>
      <Layer depth={1.5} cast>
        <g transform="translate(126 40) rotate(-8)">
          <g className="ce-anim ce-index-arm">
            <path d="M-3.5 0L3.5 0L5 150H-5Z" fill="#f2e9d5" stroke={INK} strokeWidth={0.8} />
            <path d="M-3.5 0L3.5 0L5 150H-5Z" fill={`url(#${uid}-h)`} opacity={0.3} />
            <rect x={-12} y={140} width={24} height={18} rx={2} fill="#f2e9d5" stroke={INK} strokeWidth={0.8} />
            <path d="M-9 152H9M-9 146h2M-5 146h2M-1 146h2M3 146h2M7 146h2" stroke={INK} strokeWidth={0.4} />
            <path d={circle(17, 151, 3.6)} fill="#f2e9d5" stroke={INK} strokeWidth={0.8} />
            <path d="M12 151H14" stroke={INK} strokeWidth={0.8} />
            <rect x={-13} y={-19} width={26} height={13} fill={`url(#${uid}-mirror)`} stroke={INK} strokeWidth={0.9} className="ce-anim ce-glint-soft" />
            <path d="M-13 -6V2M13 -6V2" stroke={INK} strokeWidth={1.2} />
            <path d={circle(0, 0, 4.5)} fill="#f2e9d5" stroke={INK} strokeWidth={0.9} />
            <path d="M-2 0H2" stroke={INK} strokeWidth={0.8} />
          </g>
        </g>
      </Layer>
    </>
  );
});

// ——— R 航海图: a portolan chart with water-lined coasts, rhumbs, a cartouche, a sea serpent; a galleon sails ———
function compassRose(x: number, y: number, s: number) {
  let d = "";
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const long = k % 2 === 0 ? s * 1.6 : s;
    const l = a - 0.32;
    const rr = a + 0.32;
    d += polyline(
      [
        [x, y],
        [x + Math.cos(l) * s * 0.3, y + Math.sin(l) * s * 0.3],
        [x + Math.cos(a) * long, y + Math.sin(a) * long],
        [x + Math.cos(rr) * s * 0.3, y + Math.sin(rr) * s * 0.3],
      ],
      true,
    );
  }
  return d;
}

function WaterLines({ d }: { d: string }) {
  return (
    <>
      {[20, 15, 10, 5].map((w) => (
        <g key={w}>
          <path d={d} fill="none" stroke={INK} strokeWidth={w + 0.5} opacity={0.28} strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#ece1c8" strokeWidth={w} strokeLinejoin="round" />
        </g>
      ))}
    </>
  );
}

export const SeaChartArt = memo(function SeaChartArt({ foil, uid }: ArtProps) {
  const chart = useMemo(() => {
    const random = seeded(33);
    const coast = (points: Pt[], jitter: number) => {
      const list: Pt[] = [];
      for (let k = 0; k < points.length - 1; k += 1) {
        const [x0, y0] = points[k];
        const [x1, y1] = points[k + 1];
        for (let j = 0; j < 6; j += 1) {
          const t = j / 6;
          list.push([x0 + (x1 - x0) * t + (random() - 0.5) * jitter, y0 + (y1 - y0) * t + (random() - 0.5) * jitter]);
        }
      }
      return polyline(list, true);
    };
    const landA = coast(
      [
        [-30, -30],
        [150, -30],
        [140, 10],
        [118, 30],
        [96, 70],
        [60, 92],
        [40, 130],
        [12, 150],
        [-30, 160],
        [-30, -30],
      ],
      7,
    );
    const landB = coast(
      [
        [300, 150],
        [240, 170],
        [214, 196],
        [222, 230],
        [196, 262],
        [210, 300],
        [300, 300],
        [300, 150],
      ],
      7,
    );
    const roses: Array<[number, number, number]> = [
      [150, 128, 16],
      [72, 222, 10],
      [228, 66, 9],
    ];
    let rhumbs = "";
    let rhumbsSoft = "";
    for (const [x, y] of roses) {
      for (let k = 0; k < 32; k += 1) {
        const a = (k / 32) * Math.PI * 2;
        const seg = `M${x} ${y}L${f1(x + Math.cos(a) * 320)} ${f1(y + Math.sin(a) * 320)}`;
        if (k % 4 === 0) rhumbs += seg;
        else rhumbsSoft += seg;
      }
    }
    return { landA, landB, rhumbs, rhumbsSoft, roseMarks: roses.map(([x, y, s]) => ({ x, y, s, d: compassRose(x, y, s) })) };
  }, []);
  return (
    <>
      <Layer depth={-1}>
        <AgedPaper uid={uid} tone="#efe4cc" stains={4} />
        <path d={chart.rhumbsSoft} stroke={INK} strokeWidth={0.25} opacity={0.35} />
        <path d={chart.rhumbs} stroke={foil} strokeWidth={0.55} opacity={0.9} />
      </Layer>
      <Layer depth={0.3} clip>
        <defs>
          <Hatch id={`${uid}-land`} angle={30} gap={2.2} width={0.35} />
          <clipPath id={`${uid}-a`}>
            <path d={chart.landA} />
          </clipPath>
          <clipPath id={`${uid}-b`}>
            <path d={chart.landB} />
          </clipPath>
        </defs>
        <WaterLines d={chart.landA} />
        <WaterLines d={chart.landB} />
        <path d={chart.landA + chart.landB} fill="#e8dbbd" />
        {/* Hand tint along the coasts, as old charts were coloured: green on one land, rose on the other. */}
        <path d={chart.landA} fill="none" stroke="#8fa36a" strokeWidth={12} opacity={0.4} clipPath={`url(#${uid}-a)`} />
        <path d={chart.landB} fill="none" stroke="#c98a62" strokeWidth={12} opacity={0.4} clipPath={`url(#${uid}-b)`} />
        <path d={chart.landA + chart.landB} fill={`url(#${uid}-land)`} opacity={0.45} />
        <path d={chart.landA + chart.landB} fill="none" stroke={foil} strokeWidth={1.1} strokeLinejoin="round" />
        {/* Mountains and a town on the land. */}
        <path d="M20 40l6 -10 6 10M32 40l7 -12 7 12M50 30l5 -8 5 8M236 250l5 -9 5 9M250 246l6 -10 6 10" fill="#efe4cc" stroke={INK} strokeWidth={0.6} />
        <path d="M70 52h8v-6l4 -4 4 4v6h6M74 46v-6l2 -3 2 3v6" fill="none" stroke={INK} strokeWidth={0.6} />
        {chart.roseMarks.map((mark) => (
          <g key={mark.x}>
            <path d={circle(mark.x, mark.y, mark.s * 0.9)} fill="#efe4cc" stroke={foil} strokeWidth={0.7} />
            <path d={mark.d} fill={foil} stroke={INK} strokeWidth={0.3} />
          </g>
        ))}
        {/* The sea serpent: humps engraved as a tube, a horned head, a curled tail. */}
        <g fill="none" strokeLinecap="round">
          <path d="M150 214q8 -14 16 0M170 214q8 -16 16 0M190 214q6 -10 12 0" stroke={INK} strokeWidth={2.6} />
          <path d="M150 214q8 -14 16 0M170 214q8 -16 16 0M190 214q6 -10 12 0" stroke="#efe4cc" strokeWidth={1} />
          <path d="M202 214q8 4 10 -4q1 -5 -4 -5" stroke={INK} strokeWidth={1.2} />
        </g>
        <path d="M150 215C148 205 140 200 131 202C125 203 122 207 126 210L134 209C138 210 142 212 144 216Z" fill="#efe4cc" stroke={INK} strokeWidth={0.8} />
        <path d="M137 202l2 -6M141 203l3 -5M126 210l-3 3" fill="none" stroke={INK} strokeWidth={0.7} />
        <circle cx={133} cy={205} r={0.9} fill={INK} />
        <path d="M140 216q10 2 20 0t20 0t20 0t12 0" fill="none" stroke={INK} strokeWidth={0.4} opacity={0.6} />
        {/* The route the galleon keeps (ce-voyage follows it). */}
        <path d="M214 70 C 190 120, 130 160, 100 248" fill="none" stroke={INK} strokeWidth={0.7} strokeDasharray="2 3" opacity={0.75} />
      </Layer>
      <Layer depth={1} cast>
        {/* Cartouche with the title. */}
        <g transform="translate(138 16)">
          <path d="M0 6q-8 0 -8 8t8 8h96q8 0 8 -8t-8 -8Z" fill="#f2e8d2" stroke={foil} strokeWidth={1} />
          <path d="M-8 14q-6 -10 -12 -2q4 6 8 2M104 14q6 -10 12 -2q-4 6 -8 2" fill="none" stroke={foil} strokeWidth={0.8} />
          <text x={48} y={17.5} textAnchor="middle" fontFamily={SERIF} fontSize={7} letterSpacing={1} fill={INK}>
            MARE INCOGNITVM
          </text>
        </g>
        <g transform="translate(18 254)">
          <path d="M0 0H60M0 -3V3M15 -2V2M30 -3V3M45 -2V2M60 -3V3" stroke={INK} strokeWidth={0.6} />
          <rect x={0} y={-1.5} width={15} height={3} fill={INK} />
          <rect x={30} y={-1.5} width={15} height={3} fill={INK} />
          <text x={30} y={-6} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={5.5} fill={INK}>
            Leucae
          </text>
        </g>
      </Layer>
      <Layer depth={1.4} cast>
        <g className="ce-anim ce-voyage">
          <g transform="translate(-13 -22)">
            <path d="M0 20Q13 27 26 20L23 26H3Z" fill={INK} />
            <path d="M3 20H23" stroke="#f6eedc" strokeWidth={0.5} />
            <path d="M8 4V20M16 1V20" stroke={INK} strokeWidth={0.8} />
            <path d="M8 5Q13 9 8 13M8 13Q14 16 8 19M16 2Q23 7 16 11M16 11Q24 15 16 19" fill="#f6eedc" stroke={INK} strokeWidth={0.6} />
            <path d="M16 1L21 2.5L16 4" fill="#8f3b2a" />
            <path d="M3 20L-3 16" stroke={INK} strokeWidth={0.6} />
          </g>
        </g>
      </Layer>
    </>
  );
});

// ——— R 望远镜: a brass refractor on its tripod, turned to the moon over a sleeping town ———
export const TelescopeArt = memo(function TelescopeArt({ foil, uid }: ArtProps) {
  const moon = useMemo(() => stippleMoon(196, 66, 30, [-0.85, -0.25, 0.5], 6, 3.2), []);
  return (
    <>
      <Layer depth={-1.6}>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1016" />
            <stop offset="1" stopColor="#1f2a33" />
          </linearGradient>
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0" stopColor="#f3e3c8" stopOpacity="0.3" />
            <stop offset="1" stopColor="#f3e3c8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        <Stars count={110} seed={14} color="#efe6d6" twinkle={0.08} />
        <circle cx={196} cy={66} r={74} fill={`url(#${uid}-halo)`} />
        <MoonDisc id={uid} moon={moon} cx={196} cy={66} r={30} color="#efe4cf" ground="#141a20" dot={0.7} />
      </Layer>
      <Layer depth={-0.2} clip>
        <path d={`M-20 ${AH + 10}V214Q60 200 130 210T280 206V${AH + 10}Z`} fill="#141a1f" />
        <path d="M-20 214Q60 200 130 210T280 206" fill="none" stroke={foil} strokeWidth={0.6} opacity={0.6} />
        {/* An observatory dome and a few roofs with lit windows, far off. */}
        <g fill="#10151a" stroke={foil} strokeWidth={0.4}>
          <path d="M200 207v-9h22v9ZM200 198a11 11 0 0 1 22 0Z" />
          <path d="M150 210v-8l6 -6 6 6v8ZM164 209v-6h10v6ZM236 206v-10l5 -5 5 5v10Z" />
        </g>
        <path d="M211 187v11" stroke={foil} strokeWidth={1.4} />
        <path d="M154 205h2v2h-2ZM167 205h2v2h-2ZM240 200h2v2h-2Z" fill="#f2c27a" />
      </Layer>
      <Layer depth={1.1} cast>
        <defs>
          <linearGradient id={`${uid}-tube`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd9bc" stopOpacity="0.9" />
            <stop offset="0.35" stopColor="#c47a4d" stopOpacity="0" />
            <stop offset="1" stopColor="#2a140a" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* Tripod. */}
        <g stroke="#3b2618" strokeWidth={4} strokeLinecap="round">
          <path d="M100 168L56 262" />
          <path d="M100 168L148 262" />
          <path d="M100 168L104 270" stroke="#2b1b10" />
        </g>
        <path d="M78 216L122 216" stroke={foil} strokeWidth={1.4} />
        <g transform="translate(100 160) rotate(-32)">
          <g className="ce-anim ce-telescope">
            <rect x={-70} y={-9} width={150} height={18} rx={3} fill={foil} />
            <rect x={-70} y={-9} width={150} height={18} rx={3} fill={`url(#${uid}-tube)`} />
            {[-52, -10, 34, 64].map((x) => (
              <rect key={x} x={x} y={-10.5} width={5} height={21} rx={1} fill={foil} stroke="#4f2410" strokeWidth={0.5} />
            ))}
            <rect x={80} y={-12} width={14} height={24} rx={2} fill={foil} stroke="#4f2410" strokeWidth={0.6} />
            <ellipse cx={94} cy={0} rx={3} ry={11} fill="#cfe7f2" />
            <ellipse cx={94} cy={-4} rx={1.2} ry={4} fill="#ffffff" className="ce-anim ce-glint-soft" />
            <rect x={-92} y={-5} width={22} height={10} rx={2} fill={foil} stroke="#4f2410" strokeWidth={0.5} />
            <rect x={-100} y={-3.5} width={8} height={7} rx={1} fill="#3b2618" />
            <path d={circle(0, 0, 6)} fill="#3b2618" stroke={foil} strokeWidth={1} />
          </g>
        </g>
        <Caption x={AW - 20} y={AH - 20} anchor="end" color="#e9dcc6">
          Sidereus Nuncius, 1610
        </Caption>
      </Layer>
    </>
  );
});

// ——— SR 土星: Saturn, banded and shaded; its near ring reaches past the frame; two moons go round ———
const SATURN_BANDS: Array<[number, number, string]> = [
  [-40, 8, "#b3a993"],
  [-26, 6, "#d8d1c1"],
  [-14, 9, "#a39882"],
  [0, 5, "#e2dccd"],
  [10, 8, "#b8ad97"],
  [22, 7, "#cbc3b1"],
  [34, 10, "#9f947f"],
];

export const SaturnArt = memo(function SaturnArt({ foil, uid }: ArtProps) {
  const cx = AW / 2;
  const cy = 136;
  const pr = 52;
  const tilt = 0.3;
  const rings = useMemo(() => {
    const random = seeded(3);
    const list: Array<{ rx: number; o: number; w: number }> = [];
    for (let k = 0; k < 46; k += 1) {
      const rx = 74 + k * 1.75;
      if (rx > 120 && rx < 126) continue; // the Cassini division
      list.push({ rx, o: 0.25 + random() * 0.6, w: 0.3 + random() * 0.8 });
    }
    return list;
  }, []);
  return (
    <>
      <Layer depth={-1.6}>
        <defs>
          <radialGradient id={`${uid}-sp`} cx="0.5" cy="0.5" r="0.75">
            <stop offset="0" stopColor="#18202a" />
            <stop offset="1" stopColor="#070a0e" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sp)`} />
        <Stars count={140} seed={8} color="#e6eef4" twinkle={0.05} />
      </Layer>
      <Layer depth={-0.4} clip>
        <g transform={`translate(${cx} ${cy}) rotate(-16)`}>
          {rings.map((ring) => (
            <path key={ring.rx} d={`M${-ring.rx} 0A${ring.rx} ${ring.rx * tilt} 0 0 1 ${ring.rx} 0`} fill="none" stroke={foil} strokeWidth={ring.w} opacity={ring.o * 0.8} />
          ))}
        </g>
      </Layer>
      <Layer depth={0.4}>
        <defs>
          <clipPath id={`${uid}-planet`}>
            <circle cx={cx} cy={cy} r={pr} />
          </clipPath>
          <radialGradient id={`${uid}-shade`} cx="0.32" cy="0.28" r="0.85">
            <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.75" />
          </radialGradient>
        </defs>
        <g clipPath={`url(#${uid}-planet)`}>
          <g transform={`rotate(-16 ${cx} ${cy})`}>
            <rect x={cx - pr * 1.4} y={cy - pr * 1.4} width={pr * 2.8} height={pr * 2.8} fill="#c9c2b2" />
            {SATURN_BANDS.map(([y, h, color]) => (
              <ellipse key={y} cx={cx} cy={cy + y} rx={pr * 1.3} ry={h} fill={color} />
            ))}
            <path d={`M${cx - pr * 1.5} ${cy + 6}A${pr * 1.5} ${pr * 1.5 * tilt} 0 0 0 ${cx + pr * 1.5} ${cy + 6}`} fill="none" stroke="#000" strokeWidth={6} opacity={0.35} />
          </g>
          <circle cx={cx} cy={cy} r={pr} fill={`url(#${uid}-shade)`} />
        </g>
        <circle cx={cx} cy={cy} r={pr} fill="none" stroke={foil} strokeWidth={0.6} opacity={0.7} />
      </Layer>
      <Layer depth={1.4} cast>
        <g transform={`translate(${cx} ${cy}) rotate(-16)`}>
          {rings.map((ring) => (
            <path key={ring.rx} d={`M${ring.rx} 0A${ring.rx} ${ring.rx * tilt} 0 0 1 ${-ring.rx} 0`} fill="none" stroke={foil} strokeWidth={ring.w} opacity={ring.o} />
          ))}
          {/* Two moons on orbits a little more open than the rings, so they never cross the planet. */}
          <g transform="scale(1 0.44)">
            <g className="ce-spin" style={{ animationDuration: "26s" }}>
              <circle cx={132} cy={0} r={4.4} fill="#dfe6ec" />
            </g>
          </g>
          <g transform="scale(1 0.4)">
            <g className="ce-spin" style={{ animationDuration: "41s", animationDirection: "reverse" }}>
              <circle cx={-146} cy={0} r={2.8} fill="#c9d2da" />
            </g>
          </g>
        </g>
        <Caption x={AW - 20} y={AH - 20} anchor="end" color="#cfd9e0">
          Cassini, 2004
        </Caption>
      </Layer>
    </>
  );
});

// ——— SR 极光: aurora rays over snow peaks and a frozen lake; a tent glows on the shore, someone looks up ———
const LAKE = 172;

interface Ribbon {
  y0: number;
  amp: number;
  phase: number;
  seed: number;
  count: number;
  hMin: number;
  hMax: number;
}

const RIBBONS: Ribbon[] = [
  { y0: 118, amp: 16, phase: 0.3, seed: 3, count: 190, hMin: 36, hMax: 104 },
  { y0: 92, amp: 12, phase: 2.1, seed: 8, count: 130, hMin: 26, hMax: 70 },
  { y0: 136, amp: 7, phase: 4, seed: 13, count: 90, hMin: 14, hMax: 40 },
];

const ribbonBase = (ribbon: Ribbon, x: number) => ribbon.y0 + Math.sin(x * 0.024 + ribbon.phase) * ribbon.amp + Math.sin(x * 0.057 + ribbon.phase * 1.7) * ribbon.amp * 0.35;

function auroraRays(ribbon: Ribbon) {
  const random = seeded(ribbon.seed);
  const buckets = ["", "", ""];
  for (let k = 0; k < ribbon.count; k += 1) {
    const x = -30 + random() * (AW + 60);
    const y = ribbonBase(ribbon, x);
    const h = ribbon.hMin + random() * (ribbon.hMax - ribbon.hMin) * (0.55 + 0.45 * Math.sin(x * 0.05 + ribbon.seed));
    buckets[Math.floor(random() * 3)] += `M${f1(x)} ${f1(y)}V${f1(y - h)}`;
  }
  const base = polyline(Array.from({ length: 41 }, (_, k): Pt => [-30 + (k / 40) * (AW + 60), ribbonBase(ribbon, -30 + (k / 40) * (AW + 60))]));
  return { buckets, base };
}

function AuroraRays({ uid, rays, opacity = 1 }: { uid: string; rays: Array<{ buckets: string[]; base: string }>; opacity?: number }) {
  return (
    <>
      {rays.map((ribbon, index) => (
        <g key={index} className={index ? `ce-anim ce-aurora ce-aurora-${index + 1}` : "ce-anim ce-aurora"} opacity={opacity}>
          <path d={ribbon.base} fill="none" stroke="#9cf5c8" strokeWidth={18} opacity={0.07} strokeLinecap="round" />
          <path d={ribbon.base} fill="none" stroke="#c9ffe0" strokeWidth={5} opacity={0.2} />
          {ribbon.buckets.map((d, bucket) => (
            <path key={bucket} d={d} stroke={`url(#${uid}-ray${index})`} strokeWidth={1 + bucket * 0.8} opacity={0.24 + bucket * 0.12} />
          ))}
          <path d={ribbon.base} fill="none" stroke="#eafff2" strokeWidth={0.9} opacity={0.75} />
        </g>
      ))}
    </>
  );
}

function pine(x: number, base: number, h: number) {
  let d = `M${f1(x - 0.8)} ${f1(base)}h1.6v${f1(-h * 0.14)}h-1.6Z`;
  for (let tier = 0; tier < 5; tier += 1) {
    const top = base - h + tier * h * 0.17;
    const bottom = top + h * 0.3;
    const w = h * (0.1 + tier * 0.055);
    d += `M${f1(x)} ${f1(top)}L${f1(x + w)} ${f1(bottom)}L${f1(x + w * 0.35)} ${f1(bottom - 1.2)}L${f1(x)} ${f1(bottom)}L${f1(x - w * 0.35)} ${f1(bottom - 1.2)}L${f1(x - w)} ${f1(bottom)}Z`;
  }
  return d;
}

export const AuroraArt = memo(function AuroraArt({ uid }: ArtProps) {
  const rays = useMemo(() => RIBBONS.map(auroraRays), []);
  const land = useMemo(() => {
    const random = seeded(27);
    const ridge = (points: Pt[], jitter: number) => {
      const list: Pt[] = [];
      for (let k = 0; k < points.length - 1; k += 1) {
        const [x0, y0] = points[k];
        const [x1, y1] = points[k + 1];
        for (let j = 0; j < 4; j += 1) {
          const t = j / 4;
          list.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + (j ? (random() - 0.5) * jitter : 0)]);
        }
      }
      list.push(points[points.length - 1]);
      return list;
    };
    const near = ridge(
      [
        [-30, 168],
        [-6, 150],
        [14, 158],
        [40, 124],
        [58, 140],
        [78, 130],
        [98, 156],
        [122, 142],
        [150, 108],
        [168, 128],
        [186, 122],
        [210, 150],
        [232, 134],
        [256, 150],
        [290, 140],
      ],
      5,
    );
    const far = ridge(
      [
        [-30, 150],
        [20, 138],
        [60, 150],
        [100, 128],
        [130, 146],
        [200, 132],
        [240, 144],
        [290, 130],
      ],
      4,
    );
    let snow = "M-30 -10H290";
    for (let x = 290; x >= -30; x -= 6) snow += `L${x} ${f1(140 + Math.sin(x * 0.4) * 3 + (random() - 0.5) * 7)}`;
    const shape = (points: Pt[]) => polyline([...points, [290, LAKE + 2], [-30, LAKE + 2]], true);
    return { near: shape(near), nearRidge: polyline(near), far: shape(far), snow: `${snow}Z` };
  }, []);
  const shore = `M-30 ${AH + 20}V214C40 206 90 214 140 224S240 234 290 230V${AH + 20}Z`;
  return (
    <>
      <Layer depth={-1.8}>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#03070c" />
            <stop offset="0.6" stopColor="#0a1a20" />
            <stop offset="1" stopColor="#14313a" />
          </linearGradient>
          {RIBBONS.map((ribbon, index) => (
            <linearGradient key={index} id={`${uid}-ray${index}`} gradientUnits="userSpaceOnUse" x1="0" y1={ribbon.y0 + ribbon.amp} x2="0" y2={ribbon.y0 - ribbon.amp - ribbon.hMax}>
              <stop offset="0" stopColor="#d4ffe6" stopOpacity="0.95" />
              <stop offset="0.3" stopColor="#5fe0ae" stopOpacity="0.6" />
              <stop offset="0.72" stopColor="#8a7ae0" stopOpacity="0.22" />
              <stop offset="1" stopColor="#b48cf0" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        <Stars count={170} seed={21} color="#f2f7ff" twinkle={0.08} />
        <path d="M30 30l60 22" stroke="#ffffff" strokeWidth={0.9} strokeLinecap="round" className="ce-anim ce-shooting" />
      </Layer>
      <Layer depth={-1.2}>
        <AuroraRays uid={uid} rays={rays} />
      </Layer>
      <Layer depth={-0.6} clip>
        <defs>
          <clipPath id={`${uid}-peaks`}>
            <path d={land.near} />
          </clipPath>
          <linearGradient id={`${uid}-lake`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#123038" />
            <stop offset="1" stopColor="#07141a" />
          </linearGradient>
        </defs>
        <path d={land.far} fill="#1c3540" opacity={0.85} />
        <path d={land.near} fill="#0d1b21" />
        <g clipPath={`url(#${uid}-peaks)`}>
          <path d={land.snow} fill="#cfe0e4" opacity={0.85} />
          <path d={land.snow} fill="#0d1b21" opacity={0.35} transform="translate(5 3)" />
        </g>
        <path d={land.nearRidge} fill="none" stroke="#d9edf0" strokeWidth={0.6} opacity={0.7} />
        {/* The frozen lake: the sky and the peaks again, upside down and dimmer, with cracks in the ice. */}
        <rect x={-30} y={LAKE} width={AW + 60} height={AH - LAKE + 30} fill={`url(#${uid}-lake)`} />
        <g transform={`translate(0 ${2 * LAKE}) scale(1 -1)`}>
          <AuroraRays uid={uid} rays={rays} opacity={0.32} />
          <path d={land.near} fill="#081216" opacity={0.7} />
        </g>
        <path d={`M-30 ${LAKE}H${AW + 30}`} stroke="#dff1f4" strokeWidth={0.6} opacity={0.6} />
        <path d={`M20 ${LAKE + 14}l30 5l18 -3l26 8M150 ${LAKE + 30}l24 -5l30 7l16 -3M30 ${LAKE + 44}l20 8l34 -2`} fill="none" stroke="#e7f4f7" strokeWidth={0.5} opacity={0.45} />
      </Layer>
      <Layer depth={1.2} clip cast>
        <defs>
          <radialGradient id={`${uid}-warm`}>
            <stop offset="0" stopColor="#ffb867" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffb867" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={shore} fill="#0a1317" />
        <path d="M-30 214C40 206 90 214 140 224S240 234 290 230" fill="none" stroke="#d7e7ea" strokeWidth={1} opacity={0.55} />
        <path d={pine(10, 212, 54) + pine(28, 210, 40) + pine(-6, 214, 34)} fill="#071014" />
        {/* The tent, lit from inside. */}
        <circle cx={188} cy={228} r={30} fill={`url(#${uid}-warm)`} />
        <path d="M170 230L188 204L206 230Z" fill="#17232a" stroke="#d7e7ea" strokeWidth={0.4} />
        <path d="M184 230L188 214L192 230Z" fill="#f5ae5c" />
        <path d="M188 204L188 200M170 230l-6 2M206 230l6 2" stroke="#d7e7ea" strokeWidth={0.4} />
        {/* Someone sitting in the snow, looking up; the scarf moves in the wind. */}
        <g transform="translate(132 222) scale(1.35)">
          <path d="M-6 0C-7 -6 -5 -12 -1 -15C2 -17 5 -16 6 -13C7 -9 6 -5 8 -3L14 -7C16 -8 18 -6 17 -4L12 0Z" fill="#050b0e" />
          <circle cx={1.6} cy={-19.4} r={3.6} fill="#050b0e" />
          <path d="M0 -15q-7 1 -13 -3" fill="none" stroke="#c9566b" strokeWidth={2} strokeLinecap="round" className="ce-anim ce-scarf" />
        </g>
      </Layer>
    </>
  );
});

// ——— SSR 月相: a great gilt moon in stipple; its phases and the zodiac turn round it ———
const MP_CX = AW / 2;
const MP_CY = 128;
const ZODIAC = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export const MoonPhasesArt = memo(function MoonPhasesArt({ foil, uid }: ArtProps) {
  const cx = MP_CX;
  const cy = MP_CY;
  const moon = useMemo(() => stippleMoon(MP_CX, MP_CY, 64, [-0.45, -0.35, 0.82], 3, 3), []);
  const phases = useMemo(
    () =>
      Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * 104;
        const y = Math.sin(a) * 104;
        const r = 11;
        const f = Math.cos((k / 8) * Math.PI * 2);
        const sweep = k < 4 ? 1 : 0;
        const rx = Math.abs(f) * r;
        return { x, y, d: `M${x.toFixed(2)} ${(y - r).toFixed(2)}A${r} ${r} 0 0 ${sweep} ${x.toFixed(2)} ${(y + r).toFixed(2)}A${rx.toFixed(2)} ${r} 0 0 ${f > 0 ? 1 - sweep : sweep} ${x.toFixed(2)} ${(y - r).toFixed(2)}Z` };
      }),
    [],
  );
  return (
    <>
      <Layer depth={-1.4}>
        <defs>
          <radialGradient id={`${uid}-bg`} cx="0.5" cy="0.45" r="0.75">
            <stop offset="0" stopColor="#2a2014" />
            <stop offset="1" stopColor="#070504" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-bg)`} />
        <Stars count={80} seed={31} color="#e9d3a0" />
        <path d={sunburst({ cx, cy, r0: 72, r1: 132, rays: 180, short: 0.7 })} stroke={foil} strokeWidth={0.3} opacity={0.45} />
      </Layer>
      <Layer depth={0.3}>
        <g transform={`translate(${cx} ${cy})`}>
          <path d={circle(0, 0, 122) + circle(0, 0, 88)} fill="none" stroke={foil} strokeWidth={0.5} opacity={0.75} />
          <g className="ce-spin" style={{ animationDuration: "200s" }}>
            <path d={graduation(0, 0, 122, 180, 5, 15)} stroke={foil} strokeWidth={0.35} opacity={0.8} />
            {ZODIAC.map((label, k) => {
              const a = (k / 12) * Math.PI * 2 - Math.PI / 2 + Math.PI / 12;
              return (
                <text key={label} x={Math.cos(a) * 128} y={Math.sin(a) * 128 + 2} textAnchor="middle" fontFamily={SERIF} fontSize={5.5} fill={foil}>
                  {label}
                </text>
              );
            })}
            {phases.map((phase, index) => (
              <g key={index}>
                <circle cx={phase.x} cy={phase.y} r={11} fill="#0f0b07" stroke={foil} strokeWidth={0.7} />
                <path d={phase.d} fill={foil} />
              </g>
            ))}
          </g>
        </g>
      </Layer>
      <Layer depth={1.4} cast>
        <MoonDisc id={uid} moon={moon} cx={cx} cy={cy} r={64} color={foil} ground="#120d08" dot={0.8} />
        <circle cx={cx} cy={cy} r={64} fill="none" stroke={foil} strokeWidth={1} />
        <Caption x={cx} y={AH - 20} anchor="middle" color="#e9d3a0">
          Selenographia, 1647
        </Caption>
      </Layer>
    </>
  );
});

// ——— SSR 日食: a total eclipse: the gilt corona streams round the black moon; the diamond ring flashes ———
const EC_CX = AW / 2;
const EC_CY = 118;
const EC_R = 46;

export const EclipseArt = memo(function EclipseArt({ foil, uid }: ArtProps) {
  const cx = EC_CX;
  const cy = EC_CY;
  const R = EC_R;
  const corona = useMemo(() => {
    const random = seeded(71);
    let strong = "";
    let soft = "";
    for (let k = 0; k < 260; k += 1) {
      const a = random() * Math.PI * 2;
      // Longer streamers along the equator, as in a real corona.
      const reach = EC_R + 8 + random() * (40 + Math.abs(Math.cos(a)) * 90);
      const bend = (random() - 0.5) * 0.25;
      const x0 = Math.cos(a) * (EC_R + 1);
      const y0 = Math.sin(a) * (EC_R + 1);
      const x1 = Math.cos(a + bend) * reach;
      const y1 = Math.sin(a + bend) * reach;
      const mx = Math.cos(a + bend * 0.3) * (EC_R + reach) * 0.5;
      const my = Math.sin(a + bend * 0.3) * (EC_R + reach) * 0.5;
      const seg = `M${f1(x0)} ${f1(y0)}Q${f1(mx)} ${f1(my)} ${f1(x1)} ${f1(y1)}`;
      if (k % 3 === 0) strong += seg;
      else soft += seg;
    }
    return { strong, soft };
  }, []);
  return (
    <>
      <Layer depth={-1.6}>
        <defs>
          <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.3" stopColor="#fff2c8" stopOpacity="0.9" />
            <stop offset="0.42" stopColor="#f0c36a" stopOpacity="0.45" />
            <stop offset="1" stopColor="#f0c36a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill="#040302" />
        <Stars count={70} seed={5} color="#f7e9c6" twinkle={0.12} />
        <circle cx={cx} cy={cy} r={R * 3.2} fill={`url(#${uid}-glow)`} />
      </Layer>
      <Layer depth={-0.2}>
        <Spin x={cx} y={cy} seconds={240}>
          <path d={corona.soft} fill="none" stroke={foil} strokeWidth={0.35} opacity={0.55} />
          <path d={corona.strong} fill="none" stroke={foil} strokeWidth={0.6} opacity={0.85} className="ce-anim ce-shimmer" />
        </Spin>
      </Layer>
      <Layer depth={0.6}>
        <circle cx={cx} cy={cy} r={R + 1.5} fill="none" stroke="#fff7dd" strokeWidth={1.2} opacity={0.9} />
        <circle cx={cx} cy={cy} r={R} fill="#020101" />
        {/* Prominences. */}
        <path d={`M${cx - R * 0.7} ${cy + R * 0.7}q-6 6 -2 10q4 -2 6 -8M${cx + R * 0.95} ${cy - R * 0.2}q8 -2 8 6q-4 0 -7 -3`} fill="#d9643c" opacity={0.9} />
      </Layer>
      <Layer depth={1.2} cast clip>
        {/* The diamond ring on the rim. */}
        <g transform={`translate(${cx - R * 0.68} ${cy - R * 0.74})`}>
          <g className="ce-anim ce-diamond">
            <circle cx={0} cy={0} r={4} fill="#ffffff" />
            <path d="M-26 0H26M0 -26V26M-12 -12L12 12M-12 12L12 -12" stroke="#ffffff" strokeWidth={0.6} opacity={0.9} />
          </g>
        </g>
        <path d={`M-20 ${AH + 10}V232Q70 214 126 226T280 220V${AH + 10}Z`} fill="#0a0806" />
        <path d="M-20 232Q70 214 126 226T280 220" fill="none" stroke={foil} strokeWidth={0.7} />
        <g fill="#0a0806" stroke={foil} strokeWidth={0.5}>
          <path d="M60 222l2 -10 2 10M64 214l4 -3" />
          <path d="M184 222v-8h6v8" />
        </g>
        <Caption x={AW - 20} y={AH - 20} anchor="end" color="#e9d3a0">
          Eclipsis solis totalis
        </Caption>
      </Layer>
    </>
  );
});

// ——— UR 银河: a dense spiral galaxy in hologram; it reaches past the frame and turns ———
export const GalaxyArt = memo(function GalaxyArt({ foil, uid }: ArtProps) {
  const galaxy = useMemo(() => {
    const random = seeded(101);
    // Stars as round dots of zero length, grouped by colour, size and brightness (a few paths, not thousands of nodes).
    const buckets = new Map<string, { color: string; w: number; o: number; d: string }>();
    const add = (color: string, w: number, o: number, x: number, y: number) => {
      const key = `${color}|${w}|${o}`;
      const bucket = buckets.get(key) ?? { color, w, o, d: "" };
      bucket.d += `M${f1(x)} ${f1(y)}h0`;
      buckets.set(key, bucket);
    };
    for (let k = 0; k < 2600; k += 1) {
      const arm = k % 3;
      const t = Math.pow(random(), 0.6) * 3.4;
      const spread = (random() - 0.5) * (0.45 + t * 0.14);
      const a = t * 1.85 + (arm * Math.PI * 2) / 3 + spread;
      const r = 5 + t * 40 + (random() - 0.5) * 8;
      const b = random();
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (t < 0.65) add("#fff1d6", b > 0.6 ? 1.3 : 0.8, b > 0.5 ? 0.9 : 0.55, x, y);
      else if (b > 0.9) add("foil", 1.4, 0.95, x, y);
      else if (b > 0.5) add("#e6edff", b > 0.75 ? 1.1 : 0.7, 0.8, x, y);
      else add("#a9b8ff", 0.6, 0.5, x, y);
    }
    let arms = "";
    let dust = "";
    for (let arm = 0; arm < 3; arm += 1) {
      const glow: Pt[] = [];
      const lane: Pt[] = [];
      for (let k = 0; k < 40; k += 1) {
        const t = 0.25 + (k / 40) * 3;
        const a = t * 1.85 + (arm * Math.PI * 2) / 3;
        const r = 5 + t * 40;
        glow.push([Math.cos(a) * r, Math.sin(a) * r]);
        lane.push([Math.cos(a - 0.26) * r, Math.sin(a - 0.26) * r]);
      }
      arms += polyline(glow);
      dust += polyline(lane);
    }
    const knots = Array.from({ length: 30 }, () => {
      const t = 0.5 + random() * 2.8;
      const a = t * 1.85 + (Math.floor(random() * 3) * Math.PI * 2) / 3 + (random() - 0.5) * 0.2;
      const r = 5 + t * 40;
      return `M${f1(Math.cos(a) * r)} ${f1(Math.sin(a) * r)}h0`;
    }).join("");
    return { stars: [...buckets.values()], arms, dust, knots };
  }, []);
  return (
    <>
      <Layer depth={-1.8}>
        <rect {...FULL} fill="#020205" />
        <Stars count={150} seed={17} color="#ffffff" twinkle={0.05} big={0.5} />
        <ellipse cx={40} cy={40} rx={8} ry={3} fill="#cfc7ff" opacity={0.35} transform="rotate(30 40 40)" />
        <ellipse cx={220} cy={240} rx={6} ry={2.4} fill="#ffe3c7" opacity={0.3} transform="rotate(-20 220 240)" />
      </Layer>
      <Layer depth={0.8}>
        <defs>
          <radialGradient id={`${uid}-core`}>
            <stop offset="0" stopColor="#fffaf0" stopOpacity="1" />
            <stop offset="0.2" stopColor="#ffe9c4" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#f6d8b0" stopOpacity="0.2" />
            <stop offset="1" stopColor="#f2e6ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0" stopColor="#c9c1ff" stopOpacity="0.3" />
            <stop offset="1" stopColor="#c9c1ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${AW / 2} ${AH / 2 - 6}) rotate(-28) scale(1 0.5)`}>
          <circle cx={0} cy={0} r={150} fill={`url(#${uid}-halo)`} />
          <g className="ce-spin" style={{ animationDuration: "200s" }}>
            <path d={galaxy.arms} fill="none" stroke="#9fb0ff" strokeWidth={22} opacity={0.07} strokeLinecap="round" />
            <path d={galaxy.arms} fill="none" stroke="#d2dbff" strokeWidth={8} opacity={0.08} strokeLinecap="round" />
            <path d={galaxy.dust} fill="none" stroke="#000" strokeWidth={4} opacity={0.4} strokeLinecap="round" />
            {galaxy.stars.map((bucket) => (
              <path key={`${bucket.color}${bucket.w}${bucket.o}`} d={bucket.d} stroke={bucket.color === "foil" ? foil : bucket.color} strokeWidth={bucket.w} opacity={bucket.o} strokeLinecap="round" />
            ))}
            <path d={galaxy.knots} stroke="#ff9fc6" strokeWidth={2.6} opacity={0.7} strokeLinecap="round" />
          </g>
          <circle cx={0} cy={0} r={52} fill={`url(#${uid}-core)`} />
        </g>
      </Layer>
      <Layer depth={1.3}>
        <Caption x={AW - 20} y={AH - 20} anchor="end" color="#e9e4f5">
          Via Lactea
        </Caption>
      </Layer>
    </>
  );
});

// ——— UR 地出: the Earth, half in night, over the Moon's engraved horizon; it rises, its clouds drift ———
// Continents near Africa, in units of the Earth's radius (x right, y down).
const AFRICA: Pt[] = [
  [-0.35, -0.55],
  [-0.05, -0.6],
  [0.15, -0.5],
  [0.3, -0.45],
  [0.38, -0.25],
  [0.5, -0.15],
  [0.42, 0.05],
  [0.3, 0.2],
  [0.25, 0.45],
  [0.1, 0.62],
  [0, 0.64],
  [-0.05, 0.45],
  [-0.1, 0.2],
  [-0.2, 0.05],
  [-0.4, 0],
  [-0.55, -0.1],
  [-0.58, -0.3],
  [-0.48, -0.48],
];
const ARABIA: Pt[] = [
  [0.42, -0.45],
  [0.6, -0.36],
  [0.72, -0.2],
  [0.56, -0.1],
  [0.46, -0.24],
];
const EUROPE: Pt[] = [
  [-0.5, -0.72],
  [-0.2, -0.82],
  [0.1, -0.76],
  [0.3, -0.66],
  [0.05, -0.64],
  [-0.3, -0.64],
];

export const EarthriseArt = memo(function EarthriseArt({ foil, uid }: ArtProps) {
  const ex = 140;
  const ey = 100;
  const er = 46;
  const earth = useMemo(() => {
    const place = (points: Pt[], dx = 0, dy = 0) => smoothClosed(points.map(([x, y]): Pt => [ex + (x + dx) * er, ey + (y + dy) * er]));
    const lands = place(AFRICA, -0.22, 0.06) + place(ARABIA, -0.22, 0.06) + place(EUROPE, -0.22, 0.06) + place([[0.32, 0.4], [0.4, 0.46], [0.36, 0.62], [0.28, 0.56]]);
    // Clouds as one band 200 wide, drawn twice so the drift loops.
    const random = seeded(64);
    let streaks = "";
    for (let k = 0; k < 26; k += 1) {
      const x = -100 + random() * 200;
      const y = -44 + random() * 88;
      const w = 10 + random() * 30;
      streaks += `M${f1(x)} ${f1(y)}q${f1(w / 2)} ${f1(-3 + random() * 6)} ${f1(w)} ${f1(-1 + random() * 2)}`;
    }
    return { lands, streaks };
  }, []);
  const ground = useMemo(() => {
    const random = seeded(88);
    return Array.from({ length: 22 }, () => {
      const x = random() * (AW + 40) - 20;
      const y = 200 + random() * 90;
      const r = 3 + random() * 14 * ((y - 190) / 90);
      return { x, y, r };
    });
  }, []);
  // The night side: everything right of a terminator that bows a little to the left.
  // The night side: right of a terminator that bows to the right by `bow` (the Earth a little more than half lit).
  const night = (bow: number) => {
    const points: Pt[] = [];
    for (let k = 0; k <= 32; k += 1) {
      const t = Math.PI / 2 - (k / 32) * Math.PI;
      points.push([ex + er * 1.02 * Math.cos(t), ey + er * 1.02 * Math.sin(t)]);
    }
    for (let k = 0; k <= 32; k += 1) {
      const t = -Math.PI / 2 + (k / 32) * Math.PI;
      points.push([ex + er * bow * Math.cos(t), ey + er * Math.sin(t)]);
    }
    return polyline(points, true);
  };
  return (
    <>
      <Layer depth={-1.8}>
        <rect {...FULL} fill="#010102" />
        <Stars count={70} seed={45} color="#ffffff" big={0.4} />
      </Layer>
      <Layer depth={-0.6}>
        <defs>
          <clipPath id={`${uid}-earth`}>
            <circle cx={ex} cy={ey} r={er} />
          </clipPath>
          <radialGradient id={`${uid}-oc`} cx="0.3" cy="0.35" r="0.9">
            <stop offset="0" stopColor="#4d8bb4" />
            <stop offset="0.6" stopColor="#1d4a6c" />
            <stop offset="1" stopColor="#0b2236" />
          </radialGradient>
          <linearGradient id={`${uid}-land`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.25" stopColor="#b89c6e" />
            <stop offset="0.6" stopColor="#7a8458" />
            <stop offset="1" stopColor="#5f7346" />
          </linearGradient>
          <radialGradient id={`${uid}-limb`} cx="0.42" cy="0.45" r="0.6">
            <stop offset="0.7" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <g className="ce-anim ce-rise">
          <g clipPath={`url(#${uid}-earth)`}>
            <circle cx={ex} cy={ey} r={er} fill={`url(#${uid}-oc)`} />
            <path d={earth.lands} fill={`url(#${uid}-land)`} />
            <path d={earth.lands} fill="none" stroke={foil} strokeWidth={0.6} opacity={0.7} />
            <g transform={`translate(${ex} ${ey})`}>
              <g className="ce-anim ce-earth-turn" style={{ animationDuration: "160s" }}>
                {[0, 200].map((dx) => (
                  <g key={dx} transform={`translate(${dx} 0)`} fill="none" stroke="#ffffff" strokeLinecap="round">
                    <path d={earth.streaks} strokeWidth={9} opacity={0.12} />
                    <path d={earth.streaks} strokeWidth={4} opacity={0.25} />
                    <path d={earth.streaks} strokeWidth={1.4} opacity={0.75} />
                  </g>
                ))}
              </g>
            </g>
            <circle cx={ex} cy={ey} r={er} fill={`url(#${uid}-limb)`} />
            <path d={night(0.12)} fill="#000" opacity={0.4} />
            <path d={night(0.3)} fill="#000" opacity={0.97} />
          </g>
          {/* The lit limb: a thin blue line of air. */}
          <path d={`M${f1(ex + Math.cos(1.75) * er)} ${f1(ey + Math.sin(1.75) * er)}A${er} ${er} 0 0 1 ${f1(ex + Math.cos(4.55) * er)} ${f1(ey + Math.sin(4.55) * er)}`} fill="none" stroke="#a9dcff" strokeWidth={1.4} opacity={0.9} />
          <path d={`M${f1(ex + Math.cos(2.2) * (er + 1.5))} ${f1(ey + Math.sin(2.2) * (er + 1.5))}A${er + 1.5} ${er + 1.5} 0 0 1 ${f1(ex + Math.cos(4.1) * (er + 1.5))} ${f1(ey + Math.sin(4.1) * (er + 1.5))}`} fill="none" stroke={foil} strokeWidth={0.8} opacity={0.8} />
        </g>
      </Layer>
      <Layer depth={1.2} cast clip>
        <defs>
          <linearGradient id={`${uid}-moon`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a39f98" />
            <stop offset="0.5" stopColor="#5d5a55" />
            <stop offset="1" stopColor="#1f1e1c" />
          </linearGradient>
          <Hatch id={`${uid}-mh`} angle={-20} gap={2} color="#171615" width={0.5} />
        </defs>
        <path d={`M-20 ${AH + 20}V190Q126 150 280 196V${AH + 20}Z`} fill={`url(#${uid}-moon)`} />
        <path d={`M-20 ${AH + 20}V190Q126 150 280 196V${AH + 20}Z`} fill={`url(#${uid}-mh)`} opacity={0.35} />
        {ground.map((crater, index) => (
          <g key={index}>
            <ellipse cx={crater.x} cy={crater.y} rx={crater.r} ry={crater.r * 0.32} fill="#1c1b19" opacity={0.55} />
            <path d={`M${crater.x - crater.r} ${crater.y}A${crater.r} ${crater.r * 0.32} 0 0 0 ${crater.x + crater.r} ${crater.y}`} fill="none" stroke="#d6d2cb" strokeWidth={0.7} opacity={0.75} />
          </g>
        ))}
        <path d="M-20 190Q126 150 280 196" fill="none" stroke="#e7e3dc" strokeWidth={0.9} opacity={0.8} />
        <Caption x={20} y={AH - 20} color="#e9e4f5">
          Apollo 8 · 24 December 1968
        </Caption>
      </Layer>
    </>
  );
});
