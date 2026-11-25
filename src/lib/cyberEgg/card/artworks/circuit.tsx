/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「电路」 (R): a circuit board with a chip at its heart. Its copper traces are foil; pulses of light
// run out along a few of them.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { polyline, seeded, type Pt } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

const CX = 126;
const CY = 128;
const HALF = 32;
const PINS = 9;

interface Trace {
  d: string;
  end: Pt;
  pulse: boolean;
  delay: number;
}

/** Routes from every pin outward: straight, a 45° bend fanning out, straight to the board edge or a pad. */
function routes(): Trace[] {
  const random = seeded(23);
  const traces: Trace[] = [];
  const pitch = (HALF * 2 - 10) / (PINS - 1);
  const sides: Array<{ out: Pt; along: Pt; base: (k: number) => Pt; limit: number }> = [
    { out: [0, -1], along: [1, 0], base: (k) => [CX - HALF + 5 + k * pitch, CY - HALF], limit: 8 },
    { out: [0, 1], along: [1, 0], base: (k) => [CX - HALF + 5 + k * pitch, CY + HALF], limit: AH - 8 },
    { out: [-1, 0], along: [0, 1], base: (k) => [CX - HALF, CY - HALF + 5 + k * pitch], limit: 8 },
    { out: [1, 0], along: [0, 1], base: (k) => [CX + HALF, CY - HALF + 5 + k * pitch], limit: AW - 8 },
  ];
  for (const side of sides) {
    for (let k = 0; k < PINS; k += 1) {
      const [bx, by] = side.base(k);
      const spread = (k - (PINS - 1) / 2) * 1.9;
      const first = 6 + Math.abs(k - (PINS - 1) / 2) * 1.2;
      const p1: Pt = [bx + side.out[0] * first, by + side.out[1] * first];
      const run = 10 + Math.abs(spread) * 5.4;
      const p2: Pt = [p1[0] + side.out[0] * run + side.along[0] * spread * 5.4, p1[1] + side.out[1] * run + side.along[1] * spread * 5.4];
      const length = 14 + random() * 60;
      const p3: Pt = [p2[0] + side.out[0] * length, p2[1] + side.out[1] * length];
      // Clip to the board.
      p3[0] = Math.max(6, Math.min(AW - 6, p3[0]));
      p3[1] = Math.max(6, Math.min(AH - 6, p3[1]));
      const points: Pt[] = [[bx, by], p1, p2, p3];
      traces.push({ d: polyline(points), end: p3, pulse: random() < 0.2, delay: random() * 6 });
    }
  }
  return traces;
}

export const CircuitArt = memo(function CircuitArt({ foil, uid }: ArtProps) {
  const traces = useMemo(() => routes(), []);
  const weave = useMemo(() => {
    let d = "";
    for (let k = -AH; k < AW; k += 3.2) d += `M${k} 0L${k + AH} ${AH}M${k + AH} 0L${k} ${AH}`;
    return d;
  }, []);
  const pins = useMemo(() => {
    const pitch = (HALF * 2 - 10) / (PINS - 1);
    const list: Array<[number, number, number, number]> = [];
    for (let k = 0; k < PINS; k += 1) {
      const t = CX - HALF + 5 + k * pitch;
      list.push([t - 1.3, CY - HALF - 4, 2.6, 4], [t - 1.3, CY + HALF, 2.6, 4]);
      const s = CY - HALF + 5 + k * pitch;
      list.push([CX - HALF - 4, s - 1.3, 4, 2.6], [CX + HALF, s - 1.3, 4, 2.6]);
    }
    return list;
  }, []);
  return (
    <>
      <Layer depth={-1}>
        <defs>
          <radialGradient id={`${uid}-board`} cx="0.5" cy="0.46" r="0.75">
            <stop offset="0" stopColor="#1b2b22" />
            <stop offset="1" stopColor="#0b130e" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-board)`} />
        <path d={weave} stroke="#2e4a3a" strokeWidth={0.25} opacity={0.5} />
        {/* Silkscreen marks. */}
        <g fill="none" stroke="#d8d2bf" strokeWidth={0.4} opacity={0.5}>
          <rect x={CX - HALF - 9} y={CY - HALF - 9} width={HALF * 2 + 18} height={HALF * 2 + 18} rx={2} strokeDasharray="2 2" />
          <circle cx={18} cy={18} r={5} />
          <circle cx={AW - 18} cy={AH - 18} r={5} />
        </g>
        <text x={20} y={AH - 20} fontFamily="Georgia, serif" fontSize={5.5} letterSpacing={0.8} fill="#d8d2bf" opacity={0.6}>
          LS-01 · REV C
        </text>
      </Layer>
      <Layer depth={0.25} clip>
        {traces.map((trace, index) => (
          <g key={index}>
            <path d={trace.d} fill="none" stroke={foil} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={trace.end[0]} cy={trace.end[1]} r={2.3} fill="#0d1610" stroke={foil} strokeWidth={1.1} />
          </g>
        ))}
        {traces
          .filter((trace) => trace.pulse)
          .map((trace, index) => (
            <path
              key={`p${index}`}
              d={trace.d}
              pathLength={100}
              fill="none"
              stroke="#fff1e2"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeDasharray="7 93"
              className="ce-anim ce-pulse"
              style={{ animationDelay: `${-trace.delay}s` }}
            />
          ))}
      </Layer>
      <Layer depth={1.4} cast>
        <rect x={CX - HALF - 1} y={CY - HALF + 2} width={HALF * 2 + 2} height={HALF * 2} rx={2} fill="#000" opacity={0.45} />
        {pins.map(([x, y, w, h], index) => (
          <rect key={index} x={x} y={y} width={w} height={h} fill={foil} />
        ))}
        <rect x={CX - HALF} y={CY - HALF} width={HALF * 2} height={HALF * 2} rx={1.6} fill="#121413" stroke="#2c302e" strokeWidth={0.6} />
        <rect x={CX - HALF + 6} y={CY - HALF + 6} width={HALF * 2 - 12} height={HALF * 2 - 12} rx={1} fill="none" stroke="#2a2e2c" strokeWidth={0.5} />
        <circle cx={CX - HALF + 6} cy={CY + HALF - 6} r={1.6} fill="#1d201f" />
        <text x={CX} y={CY - 2} textAnchor="middle" fontFamily="Georgia, serif" fontSize={9} letterSpacing={1.2} fill="#b8b2a4">
          LS
        </text>
        <text x={CX} y={CY + 9} textAnchor="middle" fontFamily="Georgia, serif" fontSize={4} letterSpacing={0.8} fill="#7d786d">
          CYBER EGG · 2026
        </text>
      </Layer>
    </>
  );
});
