/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「莫比乌斯」 (UR): a Möbius strip in hologram foil, ruled like an engraving, turning slowly on a
// pearl ground. One side, one edge.
import { ceJsx, CeFragment, memo, useMemo, useRef } from "../jsx";
import { AH, AW, FULL, useArtClock, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

const CX = AW / 2;
const CY = 126;
const R = 70;
const HALF = 28;
const RULINGS = 132;
const INK = "#26242e";

type V = [number, number, number];

function point(u: number, v: number): V {
  const k = R + v * Math.cos(u / 2);
  return [k * Math.cos(u), v * Math.sin(u / 2), k * Math.sin(u)];
}

function project(p: V, spin: number, tilt: number): V {
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  const x = p[0] * c + p[2] * s;
  const z = -p[0] * s + p[2] * c;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  return [x, p[1] * ct - z * st, p[1] * st + z * ct];
}

const xy = (p: V) => `${(CX + p[0]).toFixed(1)} ${(CY - p[1]).toFixed(1)}`;

export const MobiusArt = memo(function MobiusArt({ foil, live }: ArtProps) {
  const far = useRef<SVGPathElement>(null);
  const mid = useRef<SVGPathElement>(null);
  const near = useRef<SVGPathElement>(null);
  const edgeFar = useRef<SVGPathElement>(null);
  const edgeNear = useRef<SVGPathElement>(null);
  const holder = useRef<SVGGElement>(null);
  const dots = useMemo(() => {
    let d = "";
    for (let y = 8; y < AH; y += 9) {
      for (let x = (y / 9) % 2 ? 4 : 8.5; x < AW; x += 9) d += `M${x} ${y}h0.01`;
    }
    return d;
  }, []);

  const draw = (seconds: number) => {
    const spin = seconds * 0.22 + 0.4;
    const tilt = 0.62 + Math.sin(seconds * 0.3) * 0.08;
    const buckets = ["", "", ""];
    for (let k = 0; k < RULINGS; k += 1) {
      const u = (k / RULINGS) * Math.PI * 2;
      const a = project(point(u, -HALF), spin, tilt);
      const b = project(point(u, HALF), spin, tilt);
      const depth = (a[2] + b[2]) / 2;
      const bucket = depth < -R * 0.35 ? 0 : depth < R * 0.35 ? 1 : 2;
      buckets[bucket] += `M${xy(a)}L${xy(b)}`;
    }
    let edgeBack = "";
    let edgeFront = "";
    let previous: V | null = null;
    for (let k = 0; k <= 360; k += 1) {
      const u = (k / 360) * Math.PI * 4;
      const p = project(point(u, HALF), spin, tilt);
      if (previous) {
        const segment = `M${xy(previous)}L${xy(p)}`;
        if ((previous[2] + p[2]) / 2 >= 0) edgeFront += segment;
        else edgeBack += segment;
      }
      previous = p;
    }
    far.current?.setAttribute("d", buckets[0]);
    mid.current?.setAttribute("d", buckets[1]);
    near.current?.setAttribute("d", buckets[2]);
    edgeFar.current?.setAttribute("d", edgeBack);
    edgeNear.current?.setAttribute("d", edgeFront);
  };
  useArtClock(live, draw, holder);

  return (
    <>
      <Layer depth={-1.2}>
        <rect {...FULL} fill="#f3f1f4" />
        <path d={dots} stroke="#8d88a0" strokeWidth={1} strokeLinecap="round" opacity={0.35} />
        <ellipse cx={CX} cy={AH - 40} rx={86} ry={9} fill="#26242e" opacity={0.08} />
        <text x={20} y={AH - 20} fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize={7} fill={INK} opacity={0.7}>
          A. F. Möbius, 1858
        </text>
      </Layer>
      <Layer depth={1.3} cast>
        <g ref={holder}>
          <path ref={edgeFar} fill="none" stroke={INK} strokeWidth={0.45} opacity={0.35} />
          <path ref={far} fill="none" stroke={foil} strokeWidth={0.55} opacity={0.35} />
          <path ref={mid} fill="none" stroke={foil} strokeWidth={0.75} opacity={0.7} />
          <path ref={near} fill="none" stroke={foil} strokeWidth={0.95} />
          <path ref={edgeNear} fill="none" stroke={INK} strokeWidth={0.8} />
        </g>
      </Layer>
    </>
  );
});
