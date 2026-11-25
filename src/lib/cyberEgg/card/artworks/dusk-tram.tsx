/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「黄昏电车」 (SR): an anime-style evening. Tall cumulus lit from below by a low sun, overhead
// wires, a tram crossing on the embankment with its windows lit. Clouds drift at two speeds.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { seeded } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

interface Puff {
  x: number;
  y: number;
  r: number;
}

/** A cumulus as a heap of puffs: dense at the base, rising into towers. */
function cumulus(cx: number, base: number, width: number, height: number, seed: number): Puff[] {
  const random = seeded(seed);
  const puffs: Puff[] = [];
  const count = Math.round(width / 6);
  for (let k = 0; k < count; k += 1) {
    const t = k / (count - 1);
    const x = cx - width / 2 + t * width;
    const tower = Math.sin(t * Math.PI) * (0.55 + random() * 0.45);
    const r = 8 + tower * height * 0.32 + random() * 5;
    puffs.push({ x, y: base - r * 0.6 - tower * height * 0.45, r });
  }
  for (let k = 0; k < count * 0.7; k += 1) {
    const t = 0.18 + random() * 0.64;
    const r = 7 + random() * height * 0.22;
    puffs.push({ x: cx - width / 2 + t * width, y: base - height * (0.35 + random() * 0.55) * Math.sin(t * Math.PI), r });
  }
  return puffs;
}

/** A cumulus lit by a low sun on the right: every puff shaded the same way, lower puffs drawn last. */
function Cloud({ puffs, fill }: { puffs: Puff[]; fill: string }) {
  const sorted = [...puffs].sort((a, b) => a.y - b.y);
  return (
    <g>
      {sorted.map((p, k) => (
        <circle key={k} cx={p.x} cy={p.y} r={p.r} fill={fill} />
      ))}
    </g>
  );
}

function PuffGradient({ id, lit, mid, shade }: { id: string; lit: string; mid: string; shade: string }) {
  return (
    <radialGradient id={id} cx="0.68" cy="0.72" r="0.78" fx="0.74" fy="0.8">
      <stop offset="0" stopColor={lit} />
      <stop offset="0.5" stopColor={mid} />
      <stop offset="1" stopColor={shade} />
    </radialGradient>
  );
}

const GROUND = AH - 64;

export const DuskTramArt = memo(function DuskTramArt({ uid }: ArtProps) {
  const far = useMemo(() => [cumulus(70, 150, 150, 120, 3), cumulus(220, 160, 120, 90, 9)], []);
  const near = useMemo(() => [cumulus(150, 205, 200, 70, 17)], []);
  const wires = useMemo(() => {
    const poles = [-10, 92, 194, 296];
    let d = "";
    for (let k = 0; k < poles.length - 1; k += 1) {
      for (const [dy, sag] of [[0, 9], [6, 11], [12, 7]] as const) {
        const x0 = poles[k];
        const x1 = poles[k + 1];
        const y0 = GROUND - 100 + dy;
        d += `M${x0} ${y0}Q${(x0 + x1) / 2} ${y0 + sag * 2} ${x1} ${y0}`;
      }
    }
    return { poles, d };
  }, []);
  return (
    <>
      <Layer depth={-1.8}>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2e2a45" />
            <stop offset="0.38" stopColor="#6c4f73" />
            <stop offset="0.62" stopColor="#c27b7a" />
            <stop offset="0.8" stopColor="#f1b07c" />
            <stop offset="1" stopColor="#ffd9a1" />
          </linearGradient>
          <radialGradient id={`${uid}-sun`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff6dc" />
            <stop offset="0.25" stopColor="#ffe1a6" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffb36b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        <circle cx={196} cy={GROUND - 22} r={70} fill={`url(#${uid}-sun)`} />
        <circle cx={196} cy={GROUND - 22} r={9} fill="#fff8e6" />
        {[
          [28, 22],
          [70, 12],
          [118, 30],
          [222, 18],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={0.7} fill="#fff" opacity={0.7} />
        ))}
      </Layer>
      <Layer depth={-1.1}>
        <defs>
          <PuffGradient id={`${uid}-pf`} lit="#ffe3c6" mid="#e0a7a2" shade="#7d5f86" />
        </defs>
        <g className="ce-anim ce-drift-far" opacity={0.95}>
          {far.map((puffs, k) => (
            <Cloud key={k} puffs={puffs} fill={`url(#${uid}-pf)`} />
          ))}
          {far.map((puffs, k) => (
            <g key={`b${k}`} transform={`translate(${AW + 40} 0)`}>
              <Cloud puffs={puffs} fill={`url(#${uid}-pf)`} />
            </g>
          ))}
        </g>
      </Layer>
      <Layer depth={-0.5}>
        <defs>
          <PuffGradient id={`${uid}-pn`} lit="#ffd2ac" mid="#c98d96" shade="#5f4a72" />
        </defs>
        <g className="ce-anim ce-drift-near">
          {near.map((puffs, k) => (
            <Cloud key={k} puffs={puffs} fill={`url(#${uid}-pn)`} />
          ))}
          {near.map((puffs, k) => (
            <g key={`b${k}`} transform={`translate(${AW + 60} 0)`}>
              <Cloud puffs={puffs} fill={`url(#${uid}-pn)`} />
            </g>
          ))}
        </g>
        {/* Birds. */}
        <path d="M60 64q3 -3 6 0q3 -3 6 0M84 52q2 -2 4 0q2 -2 4 0M44 80q2 -2 4 0q2 -2 4 0" fill="none" stroke="#3a2c40" strokeWidth={0.8} strokeLinecap="round" />
      </Layer>
      <Layer depth={0.7} clip cast>
        {/* Town and embankment in silhouette. */}
        <path
          d={`M0 ${GROUND}V${GROUND - 14}h18v-10h12v6h16v-18h10v14h22v-8h14v12h20v-22h8v-6h8v28h26v-12h18v8h16v-16h12v20h30v-10h14V${GROUND}Z`}
          fill="#3a2b44"
        />
        <rect x={0} y={GROUND} width={AW} height={AH - GROUND} fill="#2a2033" />
        {[[22, -10], [50, -14], [58, -9], [104, -18], [110, -12], [168, -24], [174, -18], [214, -12], [236, -8]].map(([x, y]) => (
          <rect key={x} x={x} y={GROUND + y} width={2.2} height={2.6} fill="#ffcf8a" opacity={0.8} />
        ))}
        <path d={`M0 ${GROUND + 1}H${AW}`} stroke="#f6b884" strokeWidth={0.6} opacity={0.6} />
        <g className="ce-anim ce-tram" style={{ animationDelay: "-9s" }}>
          <g transform={`translate(0 ${GROUND - 19})`}>
            <path d="M0 18V4q0 -4 4 -4H66q6 0 8 6l2 12Z" fill="#241a2c" />
            {[6, 16, 26, 36, 46, 56].map((x) => (
              <rect key={x} x={x} y={4} width={7} height={6} rx={0.8} fill="#ffd894" />
            ))}
            <rect x={66} y={4} width={6} height={6} rx={0.8} fill="#ffe7b8" />
            <path d="M30 0l6 -8M36 -8h8" stroke="#241a2c" strokeWidth={0.9} />
          </g>
        </g>
      </Layer>
      <Layer depth={1.5} clip>
        {wires.poles.map((x) => (
          <g key={x} fill="#1d1622">
            <rect x={x - 1.6} y={GROUND - 110} width={3.2} height={AH - GROUND + 110} />
            <rect x={x - 11} y={GROUND - 103} width={22} height={2.2} />
            <rect x={x - 8} y={GROUND - 96} width={16} height={1.8} />
          </g>
        ))}
        <path d={wires.d} fill="none" stroke="#1d1622" strokeWidth={0.6} />
      </Layer>
    </>
  );
});
