/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「差分机」 (N): a patent drawing of three meshing gears on squared paper. They turn slowly.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { polyline, type Pt } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer, Spin } from "../layer";

const INK = "#2f2d29";
const PAPER = "#ece5d6";

/** A gear outline about the origin: `teeth` trapezoid teeth on pitch radius `r`. */
function gearPath(r: number, teeth: number, depth: number): string {
  const pitch = (Math.PI * 2) / teeth;
  const root = r - depth * 0.55;
  const tip = r + depth * 0.45;
  const points: Pt[] = [];
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    const c = tooth * pitch;
    const at = (angle: number, radius: number): Pt => [Math.cos(angle) * radius, Math.sin(angle) * radius];
    points.push(at(c - pitch * 0.3, root), at(c - pitch * 0.17, tip), at(c + pitch * 0.17, tip), at(c + pitch * 0.3, root));
    for (let k = 1; k <= 3; k += 1) points.push(at(c + pitch * 0.3 + (pitch * 0.4 * k) / 4, root));
  }
  return polyline(points, true);
}

function circle(r: number) {
  return `M${-r} 0a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

/** Concentric turned rings on the gear's web: the look of machined metal, unchanged by rotation. */
function turned(r0: number, r1: number, gap: number) {
  let d = "";
  for (let r = r0; r < r1; r += gap) d += circle(r);
  return d;
}

interface GearSpec {
  x: number;
  y: number;
  r: number;
  teeth: number;
  phase: number;
  spokes: number;
}

const MODULE = 5.2;
const G1: GearSpec = { x: 100, y: 142, r: (24 * MODULE) / 2, teeth: 24, phase: 10, spokes: 6 };
const G2: GearSpec = { x: 0, y: 0, r: (14 * MODULE) / 2, teeth: 14, phase: 3.57, spokes: 0 };
const G3: GearSpec = { x: 0, y: 0, r: (10 * MODULE) / 2, teeth: 10, phase: 16, spokes: 0 };
{
  const place = (gear: GearSpec, angle: number) => {
    const a = (angle * Math.PI) / 180;
    gear.x = G1.x + Math.cos(a) * (G1.r + gear.r);
    gear.y = G1.y + Math.sin(a) * (G1.r + gear.r);
  };
  place(G2, -35);
  place(G3, 70);
}

function Gear({ spec, seconds, reverse, id }: { spec: GearSpec; seconds: number; reverse?: boolean; id: string }) {
  const paths = useMemo(() => {
    const outline = gearPath(spec.r, spec.teeth, MODULE * 2.1);
    const rim = spec.r - MODULE * 1.9;
    const hub = Math.max(6, spec.r * 0.22);
    let web = "";
    if (spec.spokes) {
      // Curved spokes with lightening holes between them.
      for (let k = 0; k < spec.spokes; k += 1) {
        const a = (k / spec.spokes) * Math.PI * 2;
        const b = a + Math.PI / spec.spokes;
        const m = (hub + rim) / 2;
        const hole = (rim - hub) * 0.38;
        web += `M${(Math.cos(b) * m - hole).toFixed(1)} ${(Math.sin(b) * m).toFixed(1)}a${hole.toFixed(1)} ${hole.toFixed(1)} 0 1 0 ${(2 * hole).toFixed(1)} 0a${hole.toFixed(1)} ${hole.toFixed(1)} 0 1 0 ${(-2 * hole).toFixed(1)} 0`;
      }
    } else {
      for (let k = 0; k < 4; k += 1) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const m = (hub + rim) / 2;
        const hole = (rim - hub) * 0.26;
        web += `M${(Math.cos(a) * m - hole).toFixed(1)} ${(Math.sin(a) * m).toFixed(1)}a${hole.toFixed(1)} ${hole.toFixed(1)} 0 1 0 ${(2 * hole).toFixed(1)} 0a${hole.toFixed(1)} ${hole.toFixed(1)} 0 1 0 ${(-2 * hole).toFixed(1)} 0`;
      }
    }
    return { outline, rim: circle(rim), rim2: circle(rim - 2.2), hub: circle(hub), hub2: circle(hub * 0.45), web, rings: turned(hub + 3, rim - 3.5, 2.1) };
  }, [spec]);
  return (
    <>
      <defs>
        <pattern id={`${id}-hp`} width={1.8} height={1.8} patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <path d="M0 0V1.8" stroke={INK} strokeWidth={0.5} />
        </pattern>
      </defs>
      {/* Cast shadow on the paper: the outline offset down-right, hatched. */}
      <g transform={`translate(${spec.x + 5} ${spec.y + 6})`}>
        <g transform={`rotate(${spec.phase})`}>
          <g className="ce-spin" style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}>
            <path d={paths.outline} fill={`url(#${id}-hp)`} opacity={0.6} />
          </g>
        </g>
      </g>
      <Spin x={spec.x} y={spec.y} seconds={seconds} reverse={reverse} phase={spec.phase}>
        <path d={paths.outline} fill={PAPER} stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />
        <path d={paths.rings} fill="none" stroke={INK} strokeWidth={0.28} opacity={0.55} />
        <path d={paths.rim} fill="none" stroke={INK} strokeWidth={0.7} />
        <path d={paths.rim2} fill="none" stroke={INK} strokeWidth={0.35} />
        <path d={paths.web} fill={PAPER} stroke={INK} strokeWidth={0.7} />
        <path d={paths.hub} fill={PAPER} stroke={INK} strokeWidth={0.8} />
        <path d={paths.hub2} fill={INK} />
        <path d={`M${-spec.r * 0.12} 0H${spec.r * 0.12}`} stroke={PAPER} strokeWidth={1.2} />
      </Spin>
    </>
  );
}

function Grid() {
  const d = useMemo(() => {
    let path = "";
    for (let x = 6; x < AW; x += 9) path += `M${x} 0V${AH}`;
    for (let y = 4; y < AH; y += 9) path += `M0 ${y}H${AW}`;
    return path;
  }, []);
  return <path d={d} stroke="#8b8578" strokeWidth={0.22} opacity={0.42} />;
}

export const GearsArt = memo(function GearsArt({ uid }: ArtProps) {
  const s1 = 48;
  return (
    <>
      <Layer depth={-1}>
        <rect {...FULL} fill={PAPER} />
        <Grid />
        {/* Dimension line across the large gear. */}
        <g stroke={INK} strokeWidth={0.4} fill="none" opacity={0.8}>
          <path d={`M${G1.x - G1.r} ${G1.y + G1.r + 22}H${G1.x + G1.r}`} />
          <path d={`M${G1.x - G1.r} ${G1.y + G1.r + 18}v8M${G1.x + G1.r} ${G1.y + G1.r + 18}v8`} />
          <path d={`M${G1.x - G1.r + 5} ${G1.y + G1.r + 19.5}l-5 2.5l5 2.5M${G1.x + G1.r - 5} ${G1.y + G1.r + 19.5}l5 2.5l-5 2.5`} />
        </g>
        <text x={G1.x} y={G1.y + G1.r + 19} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize={6.5} fill={INK}>
          ⌀ 124
        </text>
        <text x={20} y={AH - 20} fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize={9} fill={INK}>
          Fig. 1.
        </text>
        <text x={AW - 20} y={AH - 20} textAnchor="end" fontFamily="Georgia, 'Times New Roman', serif" fontSize={5.5} letterSpacing={0.6} fill={INK} opacity={0.75}>
          DIFFERENCE ENGINE · GEAR TRAIN
        </text>
      </Layer>
      <Layer depth={1.1} cast>
        <Gear spec={G1} seconds={s1} id={`${uid}-g1`} />
        <Gear spec={G2} seconds={(s1 * G2.teeth) / G1.teeth} reverse id={`${uid}-g2`} />
        <Gear spec={G3} seconds={(s1 * G3.teeth) / G1.teeth} reverse id={`${uid}-g3`} />
        {/* Labels with leaders, as on a patent sheet. */}
        <g fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize={8} fill={INK}>
          <path d={`M${G2.x + G2.r + 6} ${G2.y - G2.r - 2}l10 -10`} stroke={INK} strokeWidth={0.4} />
          <text x={G2.x + G2.r + 18} y={G2.y - G2.r - 13}>
            A
          </text>
          <path d={`M${G1.x - G1.r - 4} ${G1.y - G1.r + 10}l-8 -8`} stroke={INK} strokeWidth={0.4} />
          <text x={G1.x - G1.r - 18} y={G1.y - G1.r}>
            B
          </text>
          <path d={`M${G3.x + G3.r + 5} ${G3.y + 4}l12 4`} stroke={INK} strokeWidth={0.4} />
          <text x={G3.x + G3.r + 19} y={G3.y + 11}>
            C
          </text>
        </g>
      </Layer>
    </>
  );
});
