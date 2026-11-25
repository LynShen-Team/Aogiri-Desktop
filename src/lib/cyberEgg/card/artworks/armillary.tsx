/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「天球仪」 (SSR): an armillary sphere in gilt on black. The cage of rings (equator, ecliptic,
// colures, tropics) turns about the tilted pole; the near halves of the rings are bright, the far ones dim.
import { ceJsx, CeFragment, memo, useMemo, useRef } from "../jsx";
import { engraveEgg } from "../geometry";
import { AH, AW, FULL, useArtClock, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

const CX = AW / 2;
const CY = 120;
const R = 84;
const TILT = (25 * Math.PI) / 180;
const ELEV = 0.22;
const OBLIQUITY = (23.4 * Math.PI) / 180;

type V = [number, number, number];

/** Cage space (pole = +y) → rotated about the pole by θ → tilted → seen from a little above. */
function view(p: V, theta: number): V {
  const [x0, y0, z0] = p;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const x1 = x0 * c + z0 * s;
  const z1 = -x0 * s + z0 * c;
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);
  const x2 = x1 * ct - y0 * st;
  const y2 = x1 * st + y0 * ct;
  const ce = Math.cos(ELEV);
  const se = Math.sin(ELEV);
  return [x2, y2 * ce - z1 * se, y2 * se + z1 * ce];
}

const screen = (p: V) => `${(CX + p[0] * R).toFixed(1)} ${(CY - p[1] * R).toFixed(1)}`;

/** A circle in cage space: centre + u·cos + v·sin, cut into a near and a far path. */
function ring(centre: V, u: V, v: V, theta: number, steps = 96, ticks = 0): { near: string; far: string } {
  let near = "";
  let far = "";
  let previous: { p: V; front: boolean } | null = null;
  for (let k = 0; k <= steps; k += 1) {
    const a = (k / steps) * Math.PI * 2;
    const p: V = [centre[0] + u[0] * Math.cos(a) + v[0] * Math.sin(a), centre[1] + u[1] * Math.cos(a) + v[1] * Math.sin(a), centre[2] + u[2] * Math.cos(a) + v[2] * Math.sin(a)];
    const q = view(p, theta);
    const front = q[2] >= 0;
    if (previous) {
      const segment = `M${screen(previous.p)}L${screen(q)}`;
      if (previous.front && front) near += segment;
      else far += segment;
    }
    previous = { p: q, front };
    if (ticks && k < steps && k % (steps / ticks) === 0) {
      const inner: V = [p[0] * 0.93, p[1] * 0.93 + centre[1] * 0.07, p[2] * 0.93];
      const t = view(inner, theta);
      const segment = `M${screen(q)}L${screen(t)}`;
      if (front) near += segment;
      else far += segment;
    }
  }
  return { near, far };
}

export const ArmillaryArt = memo(function ArmillaryArt({ foil, uid, live }: ArtProps) {
  const nearRef = useRef<SVGPathElement>(null);
  const farRef = useRef<SVGPathElement>(null);
  const holder = useRef<SVGGElement>(null);
  const globe = useMemo(() => engraveEgg({ cx: CX, cy: CY, w: 15, h: 15, taper: 0, tilt: 0.3 }, { lines: 14, weight: 0.5, hatch: 0, dots: 0, shadow: false, invert: true, highlight: 0.88 }), []);
  const fixed = useMemo(() => {
    // The meridian ring stands still (in the view plane, about the tilted pole), with degree marks.
    let marks = "";
    for (let k = 0; k < 72; k += 1) {
      const a = (k / 72) * Math.PI * 2;
      const r0 = R * 1.08;
      const r1 = R * (k % 6 === 0 ? 1.15 : 1.12);
      marks += `M${(CX + Math.cos(a) * r0).toFixed(1)} ${(CY + Math.sin(a) * r0).toFixed(1)}L${(CX + Math.cos(a) * r1).toFixed(1)} ${(CY + Math.sin(a) * r1).toFixed(1)}`;
    }
    const top = view([0, 1.13, 0], 0);
    const bottom = view([0, -1.13, 0], 0);
    return { marks, axis: `M${screen(top)}L${screen(bottom)}` };
  }, []);

  const draw = (seconds: number) => {
    const theta = seconds * 0.16 + 0.6;
    const c = Math.cos(OBLIQUITY);
    const s = Math.sin(OBLIQUITY);
    const parts = [
      ring([0, 0, 0], [1, 0, 0], [0, 0, 1], theta, 120, 36),
      ring([0, 0, 0], [1, 0, 0], [0, 1, 0], theta),
      ring([0, 0, 0], [0, 0, 1], [0, 1, 0], theta),
      ring([0, s, 0], [c, 0, 0], [0, 0, c], theta),
      ring([0, -s, 0], [c, 0, 0], [0, 0, c], theta),
      ring([0, 0, 0], [c, -s, 0], [0, 0, 1], theta, 120, 12),
      ring([0, 0, 0], [c * 0.94, -s * 0.94, 0], [0, 0, 0.94], theta, 120),
      ring([0, Math.cos(0.4), 0], [Math.sin(0.4), 0, 0], [0, 0, Math.sin(0.4)], theta, 60),
      ring([0, -Math.cos(0.4), 0], [Math.sin(0.4), 0, 0], [0, 0, Math.sin(0.4)], theta, 60),
    ];
    nearRef.current?.setAttribute("d", parts.map((part) => part.near).join(""));
    farRef.current?.setAttribute("d", parts.map((part) => part.far).join(""));
  };
  useArtClock(live, draw, holder);

  return (
    <>
      <Layer depth={-1.4}>
        <defs>
          <radialGradient id={`${uid}-bg`} cx="0.5" cy="0.42" r="0.75">
            <stop offset="0" stopColor="#231a10" />
            <stop offset="1" stopColor="#090705" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-bg)`} />
        <circle cx={CX} cy={CY} r={R * 1.3} fill="none" stroke={foil} strokeWidth={0.25} opacity={0.35} />
        <circle cx={CX} cy={CY} r={R * 1.36} fill="none" stroke={foil} strokeWidth={0.25} opacity={0.25} strokeDasharray="0.8 2.4" />
      </Layer>
      <Layer depth={0.4}>
        <g ref={holder}>
          <path ref={farRef} fill="none" stroke={foil} strokeWidth={0.55} opacity={0.32} />
        </g>
        {/* Stand: a stepped deco pedestal. */}
        <g fill="#0d0a07" stroke={foil} strokeWidth={0.6}>
          <path d={`M${CX - 6} ${CY + R * 1.12}L${CX - 9} ${AH - 46}H${CX + 9}L${CX + 6} ${CY + R * 1.12}Z`} />
          <path d={`M${CX - 34} ${AH - 46}H${CX + 34}V${AH - 40}H${CX - 34}Z`} />
          <path d={`M${CX - 46} ${AH - 40}H${CX + 46}V${AH - 32}H${CX - 46}Z`} />
          <path d={`M${CX - 58} ${AH - 32}H${CX + 58}V${AH - 24}H${CX - 58}Z`} />
        </g>
        <path d={`M${CX - 30} ${AH - 43}H${CX + 30}M${CX - 42} ${AH - 36}H${CX + 42}M${CX - 54} ${AH - 28}H${CX + 54}`} stroke={foil} strokeWidth={0.3} opacity={0.6} />
        <path d={fixed.marks} stroke={foil} strokeWidth={0.4} />
        <circle cx={CX} cy={CY} r={R * 1.08} fill="none" stroke={foil} strokeWidth={0.7} />
        <circle cx={CX} cy={CY} r={R * 1.15} fill="none" stroke={foil} strokeWidth={0.5} />
      </Layer>
      <Layer depth={1.3} cast>
        <path d={fixed.axis} stroke={foil} strokeWidth={1} />
        <circle cx={CX} cy={CY} r={15.5} fill="#120d08" />
        <path d={globe.lines} fill={foil} />
        <path d={globe.outline} fill="none" stroke={foil} strokeWidth={0.5} />
        <path ref={nearRef} fill="none" stroke={foil} strokeWidth={0.95} strokeLinecap="round" />
      </Layer>
    </>
  );
});
