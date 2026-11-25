/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「洛伦兹」 (R): the Lorenz attractor, the "butterfly" of chaos, in copper on a plotting sheet. A
// point of light runs along the trajectory, which never repeats.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { polyline, type Pt } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

const INK = "#43291c";

function attractor(): { d: string; fixed: Pt[] } {
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  let x = 0.1;
  let y = 0;
  let z = 0;
  const dt = 0.006;
  const points: Pt[] = [];
  const project = (px: number, pz: number): Pt => [AW / 2 + 8 + px * 3.7, AH - 40 - pz * 3.55];
  for (let step = 0; step < 9000; step += 1) {
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    if (step > 300 && step % 2 === 0) points.push(project(x, z));
  }
  const c = Math.sqrt(beta * (rho - 1));
  return { d: polyline(points), fixed: [project(c, rho - 1), project(-c, rho - 1)] };
}

export const LorenzArt = memo(function LorenzArt({ foil }: ArtProps) {
  const curve = useMemo(() => attractor(), []);
  const grid = useMemo(() => {
    let d = "";
    for (let x = 6; x < AW; x += 12) d += `M${x} 0V${AH}`;
    for (let y = 2; y < AH; y += 12) d += `M0 ${y}H${AW}`;
    return d;
  }, []);
  return (
    <>
      <Layer depth={-1}>
        <rect {...FULL} fill="#efe7da" />
        <path d={grid} stroke="#9a7963" strokeWidth={0.22} opacity={0.38} />
        <path d={`M${AW / 2 + 8} 18V${AH - 26}M18 ${AH - 40}H${AW - 18}`} stroke={INK} strokeWidth={0.4} opacity={0.55} />
        <g fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fill={INK}>
          <text x={20} y={26} fontSize={7.5}>
            dx/dt = σ(y − x)
          </text>
          <text x={20} y={36} fontSize={7.5}>
            dy/dt = x(ρ − z) − y
          </text>
          <text x={20} y={46} fontSize={7.5}>
            dz/dt = xy − βz
          </text>
          <text x={AW - 20} y={AH - 20} textAnchor="end" fontSize={6.5} opacity={0.75}>
            σ = 10, ρ = 28, β = 8/3
          </text>
        </g>
      </Layer>
      <Layer depth={0.9} cast>
        <path d={curve.d} fill="none" stroke={INK} strokeWidth={0.22} opacity={0.35} transform="translate(1.2 1.6)" />
        <path d={curve.d} fill="none" stroke={foil} strokeWidth={0.42} strokeLinejoin="round" />
        {curve.fixed.map(([x, y]) => (
          <path key={x} d={`M${x - 3} ${y}H${x + 3}M${x} ${y - 3}V${y + 3}`} stroke={INK} strokeWidth={0.5} />
        ))}
      </Layer>
      <Layer depth={1.3}>
        <path d={curve.d} pathLength={1000} fill="none" stroke="#ffd2b0" strokeWidth={2.4} strokeLinecap="round" strokeDasharray="4 996" opacity={0.45} className="ce-anim ce-comet" />
        <path d={curve.d} pathLength={1000} fill="none" stroke="#fff6ee" strokeWidth={1} strokeLinecap="round" strokeDasharray="4 996" className="ce-anim ce-comet" />
      </Layer>
    </>
  );
});
