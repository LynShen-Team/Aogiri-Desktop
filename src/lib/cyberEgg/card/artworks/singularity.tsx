/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「奇点」 (UR): a black hole. Its accretion disk circles in front of and behind it, and the far side
// of the disk is bent over the top and under the bottom by gravity. The disk streams; the near (left)
// side is brighter, as light moving towards us is.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { seeded } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

const CX = AW / 2;
const CY = 128;
const HOLE = 26;

export const SingularityArt = memo(function SingularityArt({ foil, uid }: ArtProps) {
  const disk = useMemo(() => {
    const rings: Array<{ rx: number; back: string; front: string; speed: number; dash: string }> = [];
    const random = seeded(5);
    for (let rx = 34; rx <= 118; rx += 2.6) {
      const ry = rx * 0.15;
      const back = `M${CX - rx} ${CY}A${rx} ${ry} 0 0 1 ${CX + rx} ${CY}`;
      const front = `M${CX + rx} ${CY}A${rx} ${ry} 0 0 1 ${CX - rx} ${CY}`;
      const a = 1 + random() * 8;
      const b = 1 + random() * 4;
      rings.push({ rx, back, front, speed: 3 + (rx / 118) ** 1.5 * 14, dash: `${a.toFixed(1)} ${b.toFixed(1)} ${(a * 0.4).toFixed(1)} ${(b * 2).toFixed(1)}` });
    }
    let lens = "";
    for (let r = HOLE + 4; r <= HOLE + 22; r += 1.6) lens += `M${CX - r} ${CY}A${r} ${r * 0.92} 0 0 1 ${CX + r} ${CY}`;
    let under = "";
    for (let r = HOLE + 4; r <= HOLE + 11; r += 1.6) under += `M${CX - r} ${CY}A${r} ${r * 0.7} 0 0 0 ${CX + r} ${CY}`;
    const stars: Array<[number, number, number]> = Array.from({ length: 140 }, () => [random() * AW, random() * AH, random()]);
    return { rings, lens, under, stars };
  }, []);
  const opacity = (rx: number) => Math.max(0.12, 1 - (rx - 34) / 100);
  return (
    <>
      <Layer depth={-1.8}>
        <rect {...FULL} fill="#040306" />
        {disk.stars.map(([x, y, b], index) => (
          <circle key={index} cx={x} cy={y} r={0.3 + b * 0.55} fill="#fff" opacity={0.2 + b * 0.5} className={b > 0.9 ? "ce-blink" : undefined} style={b > 0.9 ? { animationDelay: `${-index * 0.37}s` } : undefined} />
        ))}
        <defs>
          <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="0.4" stopColor="#c9b8ff" stopOpacity="0.12" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-doppler`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.12" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx={CX} cy={CY} rx={150} ry={90} fill={`url(#${uid}-glow)`} />
      </Layer>
      <Layer depth={-0.4}>
        {disk.rings.map((ring) => (
          <g key={ring.rx} opacity={opacity(ring.rx) * 0.8}>
            <path d={ring.back} fill="none" stroke="#fff" strokeWidth={0.35} opacity={0.35} />
            <path d={ring.back} pathLength={100} fill="none" stroke={foil} strokeWidth={0.7} strokeDasharray={ring.dash} className="ce-anim ce-orbit" style={{ animationDuration: `${ring.speed}s` }} />
          </g>
        ))}
        <path d={disk.lens} fill="none" stroke={foil} strokeWidth={0.6} opacity={0.85} />
        <path d={disk.lens} fill="none" stroke="#fff" strokeWidth={0.25} opacity={0.5} />
        <path d={disk.under} fill="none" stroke={foil} strokeWidth={0.5} opacity={0.55} />
      </Layer>
      <Layer depth={0.5}>
        <circle cx={CX} cy={CY} r={HOLE + 1.4} fill="none" stroke="#fff" strokeWidth={0.9} opacity={0.9} />
        <circle cx={CX} cy={CY} r={HOLE} fill="#000" />
      </Layer>
      <Layer depth={1.3}>
        {disk.rings.map((ring) => (
          <g key={ring.rx} opacity={opacity(ring.rx)}>
            <path d={ring.front} fill="none" stroke="#fff" strokeWidth={0.4} opacity={0.4} />
            <path d={ring.front} pathLength={100} fill="none" stroke={foil} strokeWidth={0.85} strokeDasharray={ring.dash} className="ce-anim ce-orbit" style={{ animationDuration: `${ring.speed}s` }} />
          </g>
        ))}
        <ellipse cx={CX - 40} cy={CY + 6} rx={70} ry={12} fill={`url(#${uid}-doppler)`} opacity={0.5} />
        <text x={AW - 20} y={AH - 20} textAnchor="end" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize={7} fill="#e9e4f5" opacity={0.7}>
          r = 2GM / c²
        </text>
      </Layer>
    </>
  );
});
