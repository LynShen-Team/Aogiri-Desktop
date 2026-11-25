/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// cyber-egg.spec.md CE-S1: the 典藏 card a player gets for completing a pack. One design for every pack: the pack's
// emblem in gilt at the centre, its ten cards round it as medallions (each in its tier's metal, in order), a
// guilloché field turning slowly behind, a band of light crossing now and then.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { rosette, sunburst } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer, Spin } from "../layer";
import { packEmblem } from "../emblem";

const SONG = "'Songti SC', 'STSong', 'Noto Serif SC', serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
/** The metal of each tier, as the medallion rims show it. */
const METAL: Record<string, string> = { n: "#d9d0bd", r: "#d48d5c", sr: "#d3dade", ssr: "#ecc66a", ur: "#d8cbff" };

const CX = AW / 2;
const CY = 140;
const RING = 88;

const circle = (cx: number, cy: number, r: number) => `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

export const SetArt = memo(function SetArt({ foil, uid, period = 1, set }: ArtProps) {
  const parts = useMemo(() => {
    let ticks = "";
    for (let k = 0; k < 120; k += 1) {
      const a = (k / 120) * Math.PI * 2;
      const l = k % 12 === 0 ? 6 : 2.5;
      ticks += `M${(Math.cos(a) * 124).toFixed(1)} ${(Math.sin(a) * 124).toFixed(1)}L${(Math.cos(a) * (124 - l)).toFixed(1)} ${(Math.sin(a) * (124 - l)).toFixed(1)}`;
    }
    return {
      emblem: packEmblem(period, CX, CY, 0.92),
      field: rosette({ cx: 0, cy: 0, r: 112, amp: 3.2, lobes: 48, curves: 7 }),
      inner: rosette({ cx: CX, cy: CY, r: 44, amp: 2.2, lobes: 30, curves: 5, swell: 1.4, swellLobes: 6 }),
      rays: sunburst({ cx: CX, cy: CY, r0: 54, r1: 180, rays: 144, short: 0.6 }),
      ticks,
    };
  }, [period]);
  const names = set?.names ?? [];
  const tiers = set?.tiers ?? [];
  return (
    <>
      <Layer depth={-1.6}>
        <defs>
          <radialGradient id={`${uid}-bg`} cx="0.5" cy="0.5" r="0.75">
            <stop offset="0" stopColor="#241a0c" />
            <stop offset="1" stopColor="#050302" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-bg)`} />
        <path d={parts.rays} stroke={foil} strokeWidth={0.3} opacity={0.3} />
      </Layer>
      <Layer depth={-0.8}>
        <Spin x={CX} y={CY} seconds={260}>
          <path d={parts.field} fill="none" stroke={foil} strokeWidth={0.3} opacity={0.55} />
          <path d={parts.ticks} stroke={foil} strokeWidth={0.4} opacity={0.7} />
        </Spin>
      </Layer>
      <Layer depth={0.4} cast>
        <path d={circle(CX, CY, RING) + circle(CX, CY, RING - 3)} fill="none" stroke={foil} strokeWidth={0.6} />
        {names.map((name, k) => {
          // A pack may hold more than ten (owner 2026-11-24): the medallions shrink to fit the ring.
          const a = -Math.PI / 2 + (k / names.length) * Math.PI * 2;
          const x = CX + Math.cos(a) * RING;
          const y = CY + Math.sin(a) * RING;
          const r = Math.min(15, ((Math.PI * RING) / names.length) * 0.84);
          const metal = METAL[tiers[k]] ?? METAL.n;
          return (
            <g key={name}>
              <circle cx={x} cy={y} r={r} fill="#120d07" stroke={metal} strokeWidth={r / 10} />
              <circle cx={x} cy={y} r={r * 0.8} fill="none" stroke={metal} strokeWidth={0.4} />
              <text x={x} y={y - r * 0.07} textAnchor="middle" fontFamily={SERIF} fontSize={r * 0.47} fill={metal}>
                {String(k + 1).padStart(2, "0")}
              </text>
              <text x={x} y={y + r * 0.47} textAnchor="middle" fontFamily={SONG} fontSize={r * 0.31} fill={metal} opacity={0.9}>
                {name}
              </text>
            </g>
          );
        })}
      </Layer>
      <Layer depth={1.2} cast>
        <defs>
          <radialGradient id={`${uid}-disc`} cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#2e2210" />
            <stop offset="1" stopColor="#0c0804" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={54} fill={`url(#${uid}-disc)`} />
        <path d={circle(CX, CY, 54) + circle(CX, CY, 50)} fill="none" stroke={foil} strokeWidth={1} />
        <path d={parts.inner} fill="none" stroke={foil} strokeWidth={0.35} opacity={0.6} />
        <path d={parts.emblem.lines} fill="none" stroke={foil} strokeWidth={0.8} />
        {parts.emblem.solids ? <path d={parts.emblem.solids} fill={foil} /> : null}
        {parts.emblem.seal ? (
          <g>
            <rect x={parts.emblem.seal.x} y={parts.emblem.seal.y} width={parts.emblem.seal.size} height={parts.emblem.seal.size} rx={parts.emblem.seal.size * 0.08} fill="#a3362a" />
            <text x={parts.emblem.seal.x + parts.emblem.seal.size / 2} y={parts.emblem.seal.y + parts.emblem.seal.size * 0.74} textAnchor="middle" fontFamily={SONG} fontSize={parts.emblem.seal.size * 0.7} fill="#f6e9d8">
              {parts.emblem.seal.text}
            </text>
          </g>
        ) : null}
        <text x={CX} y={24} textAnchor="middle" fontFamily={SONG} fontSize={8} letterSpacing={2} fill={foil}>
          {`第 ${ROMAN[period] ?? period} 期 · ${set?.packName ?? ""}`}
        </text>
        <text x={CX} y={AH - 16} textAnchor="middle" fontFamily={SONG} fontSize={8.5} letterSpacing={6} fill={foil}>
          全部集齐
        </text>
      </Layer>
      <Layer depth={1.6} clip>
        <defs>
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff6dc" stopOpacity="0.28" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="ce-anim ce-sheen">
          <rect x={CX - 26} y={-60} width={52} height={AH + 120} fill={`url(#${uid}-sheen)`} transform={`rotate(22 ${CX} ${CY})`} />
        </g>
      </Layer>
    </>
  );
});
