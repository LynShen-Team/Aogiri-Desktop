// cyber-egg.spec.md CE-C3: the engraving geometry of the 赛博鸡蛋 cards and the egg. Pure functions that
// return SVG path data; no DOM. Everything is drawn here (guilloché rosettes, woven borders, the egg as
// an intaglio print with swelling lines); no outside artwork.

export type Pt = [number, number];
type V3 = [number, number, number];

const TAU = Math.PI * 2;
const n1 = (value: number) => String(Math.round(value * 10) / 10);
const n2 = (value: number) => String(Math.round(value * 100) / 100);

/** A deterministic random source, so a card looks the same on every render. */
export function seeded(seed: number) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

export function polyline(points: Pt[], close = false, precise = false): string {
  if (points.length === 0) return "";
  const f = precise ? n2 : n1;
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let index = 1; index < points.length; index += 1) d += `L${f(points[index][0])} ${f(points[index][1])}`;
  return close ? `${d}Z` : d;
}

/** A rounded rectangle as path data. */
export function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${n1(x + k)} ${n1(y)}H${n1(x + w - k)}A${n1(k)} ${n1(k)} 0 0 1 ${n1(x + w)} ${n1(y + k)}V${n1(y + h - k)}A${n1(k)} ${n1(k)} 0 0 1 ${n1(x + w - k)} ${n1(y + h)}H${n1(x + k)}A${n1(k)} ${n1(k)} 0 0 1 ${n1(x)} ${n1(y + h - k)}V${n1(y + k)}A${n1(k)} ${n1(k)} 0 0 1 ${n1(x + k)} ${n1(y)}Z`;
}

/** The point at arc length `s` on a rounded rectangle (clockwise from the top-left straight), with its inward normal. */
function rectPoint(x: number, y: number, w: number, h: number, r: number, s: number): { p: Pt; n: Pt } {
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const arc = (Math.PI / 2) * r;
  const perimeter = 2 * sw + 2 * sh + 4 * arc;
  let t = ((s % perimeter) + perimeter) % perimeter;
  const corner = (cx: number, cy: number, from: number, u: number): { p: Pt; n: Pt } => {
    const angle = from + (u / arc) * (Math.PI / 2);
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    return { p: [cx + nx * r, cy + ny * r], n: [-nx, -ny] };
  };
  if (t < sw) return { p: [x + r + t, y], n: [0, 1] };
  t -= sw;
  if (t < arc) return corner(x + w - r, y + r, -Math.PI / 2, t);
  t -= arc;
  if (t < sh) return { p: [x + w, y + r + t], n: [-1, 0] };
  t -= sh;
  if (t < arc) return corner(x + w - r, y + h - r, 0, t);
  t -= arc;
  if (t < sw) return { p: [x + w - r - t, y + h], n: [0, -1] };
  t -= sw;
  if (t < arc) return corner(x + r, y + h - r, Math.PI / 2, t);
  t -= arc;
  if (t < sh) return { p: [x, y + h - r - t], n: [1, 0] };
  t -= sh;
  return corner(x + r, y + r, Math.PI, t);
}

function rectPerimeter(w: number, h: number, r: number) {
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
}

/**
 * A woven border: `lines` sine curves running round a rounded rectangle, each shifted in phase, so they
 * cross like the rope border of a bank note. The band is centred on the rectangle and `width` wide.
 */
export function wovenBand(o: { x: number; y: number; w: number; h: number; r: number; width: number; waves: number; lines: number; spread?: number; second?: number }): string {
  const perimeter = rectPerimeter(o.w, o.h, o.r);
  const steps = Math.max(240, Math.round(perimeter / 1.6));
  const spread = o.spread ?? Math.PI;
  let d = "";
  for (let line = 0; line < o.lines; line += 1) {
    const phase = (line / o.lines) * spread;
    const points: Pt[] = [];
    for (let step = 0; step < steps; step += 1) {
      const s = (step / steps) * perimeter;
      const { p, n } = rectPoint(o.x, o.y, o.w, o.h, o.r, s);
      const u = (s / perimeter) * TAU * o.waves + phase;
      const offset = (o.width / 2) * (o.second ? 0.72 * Math.sin(u) + 0.28 * Math.sin(u * o.second) : Math.sin(u));
      points.push([p[0] + n[0] * offset, p[1] + n[1] * offset]);
    }
    d += polyline(points, true);
  }
  return d;
}

/**
 * A guilloché rosette: `curves` closed curves r(θ) = r + amp·sin(lobes·θ + kΔ) (+ a slower swell), whose
 * crossings make the woven ring of a bank-note medallion.
 */
export function rosette(o: { cx: number; cy: number; r: number; amp: number; lobes: number; curves: number; swell?: number; swellLobes?: number; spread?: number; squash?: number }): string {
  const steps = Math.max(240, o.lobes * 18);
  const spread = o.spread ?? TAU / o.lobes;
  const squash = o.squash ?? 1;
  let d = "";
  for (let curve = 0; curve < o.curves; curve += 1) {
    const phase = (curve / o.curves) * spread * o.lobes;
    const points: Pt[] = [];
    for (let step = 0; step < steps; step += 1) {
      const theta = (step / steps) * TAU;
      const radius = o.r + o.amp * Math.sin(o.lobes * theta + phase) + (o.swell ?? 0) * Math.cos((o.swellLobes ?? 0) * theta);
      points.push([o.cx + radius * Math.cos(theta), o.cy + radius * Math.sin(theta) * squash]);
    }
    d += polyline(points, true);
  }
  return d;
}

/** A hypotrochoid flower (spirograph): fine petals for the centre of a medallion or a card back. */
export function hypotrochoid(o: { cx: number; cy: number; R: number; r: number; d: number; scale: number; turns: number; squash?: number }): string {
  const steps = Math.round(o.turns * 220);
  const points: Pt[] = [];
  const k = (o.R - o.r) / o.r;
  for (let step = 0; step <= steps; step += 1) {
    const t = (step / steps) * TAU * o.turns;
    const x = (o.R - o.r) * Math.cos(t) + o.d * Math.cos(k * t);
    const y = (o.R - o.r) * Math.sin(t) - o.d * Math.sin(k * t);
    points.push([o.cx + x * o.scale, o.cy + y * o.scale * (o.squash ?? 1)]);
  }
  return polyline(points);
}

/** Radiating lines between two radii, every other one shorter: the sunburst of a medallion. */
export function sunburst(o: { cx: number; cy: number; r0: number; r1: number; rays: number; squash?: number; short?: number }): string {
  let d = "";
  const squash = o.squash ?? 1;
  for (let ray = 0; ray < o.rays; ray += 1) {
    const angle = (ray / o.rays) * TAU;
    const outer = ray % 2 === 0 ? o.r1 : o.r0 + (o.r1 - o.r0) * (o.short ?? 0.62);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    d += `M${n1(o.cx + c * o.r0)} ${n1(o.cy + s * o.r0 * squash)}L${n1(o.cx + c * outer)} ${n1(o.cy + s * outer * squash)}`;
  }
  return d;
}

/** Parallel wavy lines filling a rectangle: the ground print of a security paper. */
export function waveField(o: { x: number; y: number; w: number; h: number; gap: number; amp: number; wavelength: number; drift?: number }): string {
  let d = "";
  const rows = Math.ceil(o.h / o.gap) + 1;
  for (let row = 0; row < rows; row += 1) {
    const y0 = o.y + row * o.gap;
    const points: Pt[] = [];
    for (let x = o.x; x <= o.x + o.w + 0.1; x += 2) {
      const phase = row * (o.drift ?? 0.35);
      points.push([x, y0 + o.amp * Math.sin(((x - o.x) / o.wavelength) * TAU + phase) + o.amp * 0.4 * Math.sin(((x - o.x) / (o.wavelength * 2.7)) * TAU - phase)]);
    }
    d += polyline(points);
  }
  return d;
}

// ——— The egg as an intaglio print ———————————————————————————————————————————————

export interface EggGeometry {
  cx: number;
  cy: number;
  /** Half width at the widest. */
  w: number;
  /** Half height. */
  h: number;
  /** How much wider the bottom is than the top (0..0.3). */
  taper: number;
  /** View from above, radians: the latitude lines curve down. */
  tilt: number;
}

const LIGHT = normalize([-0.52, -0.66, 0.54]);
const BOUNCE = normalize([0.7, 0.55, 0.1]);

function normalize(v: V3): V3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** The egg's radius at latitude v (−1 top … 1 bottom). */
function eggRadius(egg: EggGeometry, v: number) {
  return egg.w * Math.sqrt(Math.max(0, 1 - v * v)) * (1 + egg.taper * v);
}

/** A point on the surface (v latitude, φ longitude; φ = π/2 faces the viewer), seen with the tilt. */
function surface(egg: EggGeometry, v: number, phi: number): { p: Pt; z: number } {
  const radius = eggRadius(egg, v);
  const X = radius * Math.cos(phi);
  const Y = v * egg.h;
  const Z = radius * Math.sin(phi);
  const c = Math.cos(egg.tilt);
  const s = Math.sin(egg.tilt);
  return { p: [egg.cx + X, egg.cy + Y * c + Z * s], z: -Y * s + Z * c };
}

/** Light on the surface (0 dark … 1 lit) and whether the point faces the viewer. */
function shadeAt(egg: EggGeometry, v: number, phi: number): { shade: number; visible: boolean } {
  const e = 1e-3;
  const at = (vv: number, pp: number): V3 => {
    const radius = eggRadius(egg, vv);
    const X = radius * Math.cos(pp);
    const Y = vv * egg.h;
    const Z = radius * Math.sin(pp);
    const c = Math.cos(egg.tilt);
    const s = Math.sin(egg.tilt);
    return [X, Y * c + Z * s, -Y * s + Z * c];
  };
  const a = at(Math.min(0.999, v + e), phi);
  const b = at(Math.max(-0.999, v - e), phi);
  const c2 = at(v, phi + e);
  const d2 = at(v, phi - e);
  const dv: V3 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dp: V3 = [c2[0] - d2[0], c2[1] - d2[1], c2[2] - d2[2]];
  let normal = normalize([dv[1] * dp[2] - dv[2] * dp[1], dv[2] * dp[0] - dv[0] * dp[2], dv[0] * dp[1] - dv[1] * dp[0]]);
  // Outward: away from the egg's axis.
  const centre = at(v, phi);
  const axisY = v * egg.h * Math.cos(egg.tilt);
  const axisZ = -v * egg.h * Math.sin(egg.tilt);
  const outward = centre[0] * normal[0] + (centre[1] - axisY) * normal[1] + (centre[2] - axisZ) * normal[2];
  if (outward < 0) normal = [-normal[0], -normal[1], -normal[2]];
  // The viewer looks down −z in our frame where +z faces them; z of the normal is index 2 (SVG y is down, so flip y for light).
  const lambert = Math.max(0, normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2]);
  // Light bounced back from the table and the right: keeps the shaded edge round instead of flat black.
  const bounce = Math.max(0, normal[0] * BOUNCE[0] + normal[1] * BOUNCE[1] + normal[2] * BOUNCE[2]) * 0.22;
  return { shade: Math.min(1, 0.1 + lambert * 0.92 + bounce), visible: normal[2] > -0.02 };
}

/** A polyline drawn as a filled shape whose width follows `widths`: the swelling line of an engraver. */
function swell(points: Pt[], widths: number[], minimum: number): string {
  let d = "";
  let run: number[] = [];
  const flush = () => {
    if (run.length >= 2) {
      const left: Pt[] = [];
      const right: Pt[] = [];
      for (let k = 0; k < run.length; k += 1) {
        const index = run[k];
        const prev = points[Math.max(0, index - 1)];
        const next = points[Math.min(points.length - 1, index + 1)];
        let nx = -(next[1] - prev[1]);
        let ny = next[0] - prev[0];
        const length = Math.hypot(nx, ny) || 1;
        nx /= length;
        ny /= length;
        // Taper both ends of a run so a stroke starts and ends like a burin cut.
        const edge = Math.min(k, run.length - 1 - k);
        const taper = Math.min(1, (edge + 0.5) / 2.5);
        const half = (widths[index] * taper) / 2;
        left.push([points[index][0] + nx * half, points[index][1] + ny * half]);
        right.push([points[index][0] - nx * half, points[index][1] - ny * half]);
      }
      d += polyline([...left, ...right.reverse()], true, true);
    }
    run = [];
  };
  for (let index = 0; index < points.length; index += 1) {
    if (widths[index] >= minimum) run.push(index);
    else flush();
  }
  flush();
  return d;
}

export interface EggPrint {
  outline: string;
  /** Latitude lines (filled swelling shapes). */
  lines: string;
  /** Cross hatching in the shade. */
  hatch: string;
  /** Stipple in the deepest shade. */
  dots: string;
  /** The cast shadow, hatched. */
  shadow: string;
}

/** The egg engraved: latitude lines that swell in the shade and vanish in the light, hatching and stipple below. */
export function engraveEgg(egg: EggGeometry, o: { lines: number; weight: number; hatch?: number; dots?: number; seed?: number; shadow?: boolean; highlight?: number; invert?: boolean }): EggPrint {
  // On a dark ground the lines are the light (gold on black): width follows light, not shade.
  const tone = (shade: number) => (o.invert ? Math.min(1, shade * 1.08) : 1 - shade);
  const outlinePoints: Pt[] = [];
  const steps = 160;
  for (let step = 0; step <= steps; step += 1) {
    const v = -Math.cos((step / steps) * Math.PI);
    outlinePoints.push(surface(egg, v, 0).p);
  }
  for (let step = steps; step >= 0; step -= 1) {
    const v = -Math.cos((step / steps) * Math.PI);
    outlinePoints.push(surface(egg, v, Math.PI).p);
  }
  // The visible silhouette is the outer envelope of the tilted surface; the side meridians are close enough at small tilts.
  const outline = polyline(outlinePoints, true);

  const gap = (2 * egg.h) / o.lines;
  const maxWidth = gap * o.weight;
  const highlight = o.highlight ?? 0.9;
  let lines = "";
  for (let line = 1; line < o.lines; line += 1) {
    const v = -Math.cos((line / o.lines) * Math.PI);
    const points: Pt[] = [];
    const widths: number[] = [];
    const count = 90;
    for (let step = 0; step <= count; step += 1) {
      const phi = -0.25 + (step / count) * (Math.PI + 0.5);
      const { shade, visible } = shadeAt(egg, v, phi);
      if (!visible) {
        points.push(surface(egg, v, phi).p);
        widths.push(0);
        continue;
      }
      const dark = tone(shade);
      points.push(surface(egg, v, phi).p);
      const gone = o.invert ? shade < 1 - highlight : shade > highlight;
      widths.push(gone ? 0 : maxWidth * (0.1 + 0.9 * Math.pow(dark, 1.35)));
    }
    lines += swell(points, widths, maxWidth * 0.16);
  }

  let hatch = "";
  const meridians = o.hatch ?? 0;
  for (let index = 0; index < meridians; index += 1) {
    // Helical lines across the latitudes, as an engraver crosses contour lines at an angle.
    const phi0 = (index / meridians) * Math.PI * 1.6 - 0.3;
    const points: Pt[] = [];
    const widths: number[] = [];
    for (let step = 1; step < 80; step += 1) {
      const v = -Math.cos((step / 80) * Math.PI);
      const phi = phi0 - 0.55 * v;
      const { shade, visible } = shadeAt(egg, v, phi);
      points.push(surface(egg, v, phi).p);
      const dark = tone(shade);
      widths.push(visible && phi > -0.1 && phi < Math.PI + 0.1 && dark > 0.6 ? maxWidth * 0.55 * Math.min(1, (dark - 0.6) / 0.3) : 0);
    }
    hatch += swell(points, widths, maxWidth * 0.14);
  }

  let dots = "";
  if (o.dots) {
    const random = seeded(o.seed ?? 7);
    let placed = 0;
    for (let tries = 0; tries < o.dots * 8 && placed < o.dots; tries += 1) {
      const v = random() * 1.9 - 0.95;
      const phi = random() * Math.PI;
      const { shade, visible } = shadeAt(egg, v, phi);
      if (!visible || tone(shade) < 0.7) continue;
      const { p } = surface(egg, v, phi);
      const r = maxWidth * (0.14 + 0.18 * tone(shade));
      dots += `M${n2(p[0] - r)} ${n2(p[1])}a${n2(r)} ${n2(r)} 0 1 0 ${n2(2 * r)} 0a${n2(r)} ${n2(r)} 0 1 0 ${n2(-2 * r)} 0`;
      placed += 1;
    }
  }

  let shadow = "";
  if (o.shadow !== false && !o.invert) {
    // The cast shadow lies to the lower right of the light: an ellipse of horizontal hatching, heavier at its core.
    const base = surface(egg, 0.999, Math.PI / 2).p[1];
    const sx = egg.cx + egg.w * 0.32;
    const sy = base + egg.h * 0.02;
    const rx = egg.w * 1.05;
    const ry = egg.h * 0.1;
    const rows = 7;
    for (let row = 0; row < rows; row += 1) {
      const t = (row + 0.5) / rows * 2 - 1;
      const half = rx * Math.sqrt(1 - t * t);
      const y = sy + t * ry;
      const points: Pt[] = [];
      const widths: number[] = [];
      for (let step = 0; step <= 40; step += 1) {
        const u = step / 40 * 2 - 1;
        points.push([sx + u * half, y]);
        const core = Math.max(0, 1 - Math.hypot(u * 0.9, t));
        widths.push(maxWidth * 0.7 * Math.pow(core, 1.1));
      }
      shadow += swell(points, widths, maxWidth * 0.12);
    }
  }
  return { outline, lines, hatch, dots, shadow };
}

/** The egg's silhouette as a closed polygon in its own box (for clip paths and the crack line). */
export function eggSilhouette(egg: EggGeometry, steps = 96): Pt[] {
  const points: Pt[] = [];
  for (let step = 0; step <= steps; step += 1) points.push(surface(egg, -Math.cos((step / steps) * Math.PI), 0).p);
  for (let step = steps; step >= 0; step -= 1) points.push(surface(egg, -Math.cos((step / steps) * Math.PI), Math.PI).p);
  return points;
}

/** The visible front arc of a latitude (for cracks): from the left edge to the right edge. */
export function latitudeArc(egg: EggGeometry, v: number, steps = 40): Pt[] {
  const points: Pt[] = [];
  for (let step = 0; step <= steps; step += 1) points.push(surface(egg, v, Math.PI - (step / steps) * Math.PI).p);
  return points;
}
