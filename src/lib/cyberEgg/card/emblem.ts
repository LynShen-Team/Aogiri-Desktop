// cyber-egg.spec.md CE-C2: the emblem of each pack, in the middle of its wrapper and of its card back: a gear
// flower for 机器之心, a star chart for 星海, cloud curls under a seal for 东方. Path data in the caller's units.
import { hypotrochoid, polyline, seeded, type Pt } from "./geometry";

export interface Emblem {
  /** Lines in the accent colour. */
  lines: string;
  /** Solid shapes in the accent colour. */
  solids: string;
  /** A seal: a filled square with one character (东方). */
  seal: { x: number; y: number; size: number; text: string } | null;
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

function gearRing(cx: number, cy: number, r: number, teeth: number, depth: number) {
  const points: Pt[] = [];
  for (let k = 0; k < teeth; k += 1) {
    const a = (k / teeth) * Math.PI * 2;
    const p = (Math.PI * 2) / teeth;
    const at = (angle: number, radius: number): Pt => [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    points.push(at(a - p * 0.3, r), at(a - p * 0.17, r + depth), at(a + p * 0.17, r + depth), at(a + p * 0.3, r));
  }
  return polyline(points, true);
}

function star(cx: number, cy: number, r: number) {
  return polyline([[cx, cy - r], [cx + r * 0.25, cy - r * 0.25], [cx + r, cy], [cx + r * 0.25, cy + r * 0.25], [cx, cy + r], [cx - r * 0.25, cy + r * 0.25], [cx - r, cy], [cx - r * 0.25, cy - r * 0.25]], true);
}

/** A cloud curl (云纹). */
function curl(x: number, y: number, r: number, flip = 1) {
  return `M${x} ${y}a${r} ${r} 0 1 1 ${flip * r * 1.6} ${-r * 0.4}a${r * 0.6} ${r * 0.6} 0 1 1 ${-flip * r * 0.9} ${r * 0.5}M${x} ${y}q${-flip * r * 1.2} ${r * 0.6} ${-flip * r * 2.6} ${r * 0.1}`;
}

export function packEmblem(period: number, cx: number, cy: number, s: number, squash = 1): Emblem {
  const kind = ((period - 1) % 3) + 1;
  if (kind === 2) {
    // 星海: a star chart: rings, a cross, a constellation.
    const random = seeded(period * 31);
    const stars: Pt[] = [
      [-18, -8],
      [-8, -14],
      [2, -10],
      [10, -2],
      [20, 2],
      [16, 14],
      [4, 12],
    ].map(([x, y]) => [cx + x * s, cy + y * s * squash]);
    let dots = "";
    for (let k = 0; k < 16; k += 1) {
      const a = random() * Math.PI * 2;
      const r = random() * 30 * s;
      dots += circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * squash, 0.5 * s);
    }
    return {
      lines:
        `M${cx - 34 * s} ${cy}a${34 * s} ${34 * s * squash} 0 1 0 ${68 * s} 0a${34 * s} ${34 * s * squash} 0 1 0 ${-68 * s} 0` +
        `M${cx - 27 * s} ${cy}a${27 * s} ${27 * s * squash} 0 1 0 ${54 * s} 0a${27 * s} ${27 * s * squash} 0 1 0 ${-54 * s} 0` +
        `M${cx - 34 * s} ${cy}H${cx + 34 * s}M${cx} ${cy - 34 * s * squash}V${cy + 34 * s * squash}` +
        polyline(stars),
      solids: stars.map(([x, y]) => star(x, y, 2.6 * s)).join("") + dots,
      seal: null,
    };
  }
  if (kind === 3) {
    // 东方: cloud curls on both sides, a seal in the middle.
    return {
      lines: curl(cx - 8 * s, cy + 6 * s, 9 * s) + curl(cx + 8 * s, cy + 6 * s, 9 * s, -1) + curl(cx - 20 * s, cy - 16 * s, 6 * s) + curl(cx + 20 * s, cy - 16 * s, 6 * s, -1),
      solids: "",
      seal: { x: cx - 9 * s, y: cy - 9 * s - 2 * s, size: 18 * s, text: "東" },
    };
  }
  // 机器之心: a gear round a spirograph flower.
  return {
    lines: hypotrochoid({ cx, cy, R: 7, r: 3, d: 4.6, scale: 4.4 * s, turns: 3, squash }) + gearRing(cx, cy, 30 * s, 24, 3 * s),
    solids: "",
    seal: null,
  };
}

/** The emblem as SVG markup (for wrapper and back images). */
export function emblemMarkup(emblem: Emblem, color: string, width: number) {
  let out = `<path d="${emblem.lines}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
  if (emblem.solids) out += `<path d="${emblem.solids}" fill="${color}"/>`;
  if (emblem.seal) {
    const { x, y, size, text } = emblem.seal;
    out += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.08}" fill="#a3362a"/><text x="${x + size / 2}" y="${y + size * 0.74}" text-anchor="middle" font-family="'Songti SC','STSong','SimSun',serif" font-size="${size * 0.7}" fill="#f6e9d8">${text}</text>`;
  }
  return out;
}
