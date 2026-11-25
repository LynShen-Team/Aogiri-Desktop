/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「神经网络」 (SR): a small network drawn like a star chart, silver on slate. An activation passes
// through it layer by layer, and the output reads out.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { seeded, type Pt } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

const LAYERS = [4, 6, 7, 5, 2];

function network() {
  const random = seeded(71);
  const columns: Pt[][] = LAYERS.map((count, layer) => {
    const x = 30 + (layer * (AW - 82)) / (LAYERS.length - 1);
    const span = Math.min(AH - 90, count * 30);
    return Array.from({ length: count }, (_, k): Pt => [x + (random() - 0.5) * 8, AH / 2 - 6 - span / 2 + (k + 0.5) * (span / count) + (random() - 0.5) * 7]);
  });
  const edges: Array<{ a: Pt; b: Pt; w: number; layer: number }> = [];
  for (let layer = 0; layer < columns.length - 1; layer += 1) {
    for (const a of columns[layer]) {
      for (const b of columns[layer + 1]) {
        const w = random();
        if (w < 0.22) continue;
        edges.push({ a, b, w, layer });
      }
    }
  }
  const stars: Array<[number, number, number]> = Array.from({ length: 120 }, () => [random() * AW, random() * AH, random()]);
  return { columns, edges, stars };
}

export const NeuralArt = memo(function NeuralArt({ foil, uid }: ArtProps) {
  const net = useMemo(() => network(), []);
  return (
    <>
      <Layer depth={-1.4}>
        <defs>
          <radialGradient id={`${uid}-sky`} cx="0.5" cy="0.45" r="0.8">
            <stop offset="0" stopColor="#243039" />
            <stop offset="1" stopColor="#10151a" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-sky)`} />
        {net.stars.map(([x, y, b], index) => (
          <circle key={index} cx={x} cy={y} r={0.3 + b * 0.5} fill="#dfe8ee" opacity={0.15 + b * 0.35} />
        ))}
        {/* Faint celestial grid, as on a star chart. */}
        <g fill="none" stroke="#9fb0bd" strokeWidth={0.25} opacity={0.22}>
          <circle cx={AW / 2} cy={AH / 2 - 6} r={70} />
          <circle cx={AW / 2} cy={AH / 2 - 6} r={118} />
          <path d={`M0 ${AH / 2 - 6}H${AW}M${AW / 2} 0V${AH}`} strokeDasharray="1.5 2.5" />
        </g>
      </Layer>
      <Layer depth={0.35} clip>
        {net.edges.map((edge, index) => (
          <path
            key={index}
            d={`M${edge.a[0].toFixed(1)} ${edge.a[1].toFixed(1)}L${edge.b[0].toFixed(1)} ${edge.b[1].toFixed(1)}`}
            stroke={foil}
            strokeWidth={0.25 + edge.w * 0.45}
            opacity={0.25 + edge.w * 0.5}
          />
        ))}
        {net.edges
          .filter((edge) => edge.w > 0.8)
          .map((edge, index) => (
            <path
              key={`h${index}`}
              d={`M${edge.a[0].toFixed(1)} ${edge.a[1].toFixed(1)}L${edge.b[0].toFixed(1)} ${edge.b[1].toFixed(1)}`}
              pathLength={100}
              stroke="#ffffff"
              strokeWidth={0.9}
              strokeLinecap="round"
              strokeDasharray="14 86"
              className="ce-anim ce-signal"
              style={{ animationDelay: `${edge.layer * 0.55}s` }}
            />
          ))}
      </Layer>
      <Layer depth={1.2} cast>
        {net.columns.map((column, layer) =>
          column.map(([x, y], k) => (
            <g key={`${layer}-${k}`}>
              <circle cx={x} cy={y} r={4.2} fill="#151b21" stroke={foil} strokeWidth={0.8} />
              <circle cx={x} cy={y} r={2} fill="#eef5fa" className="ce-anim ce-fire" style={{ animationDelay: `${layer * 0.55 + k * 0.04}s` }} />
            </g>
          )),
        )}
        <g fontFamily="Georgia, 'Times New Roman', serif" fill="#cfd9e0">
          {net.columns[net.columns.length - 1].map(([x, y], k) => (
            <text key={k} x={x + 9} y={y + 2.5} fontSize={7} fontStyle="italic">
              {k === 0 ? "0.97" : "0.03"}
            </text>
          ))}
          <text x={20} y={AH - 20} fontSize={5.5} letterSpacing={0.8} opacity={0.6}>
            INPUT → OUTPUT
          </text>
        </g>
      </Layer>
    </>
  );
});
