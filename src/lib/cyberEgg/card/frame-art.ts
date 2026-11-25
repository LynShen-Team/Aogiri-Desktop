// cyber-egg.spec.md CE-C3: the static parts of a card's face: sizes, the window, the ground image, the
// window mask, and the frame's path data by tier. SVG strings become data: URLs once.
import { roundedRect, rosette, waveField, wovenBand } from "./geometry";
import { TIER_LOOK, TIERS, packLook, type CardTier } from "./tiers";

export const CARD_W = 300;
export const CARD_H = 420;
/** The picture window (card units). */
export const WINDOW = { x: 24, y: 24, w: 252, h: 278 };

const svg = (body: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W * 2}" height="${CARD_H * 2}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;

const urls = new Map<string, string>();
/**
 * A data: URL for an SVG string, made once per string. Never a blob: URL: the live site's Content-Security-Policy
 * allows `img-src * data:` only, so a blob: image (and a CSS mask made of one) is blocked there — that is how the
 * cards lost their frame, back and wrapper in G90 while the preview, with no policy, showed them (owner 2026-11-24
 * 「卡牌外面都透明了」). `tests/cyber-egg-image-urls.test.ts` guards it.
 */
export function svgUrl(source: string): string {
  const hit = urls.get(source);
  if (hit) return hit;
  // encodeURIComponent leaves ( ) ' alone; escaped too, the URL also works unquoted in CSS url(…) (the pages put it
  // in `url(${…})`, and a filter's url(#id) inside would end it early).
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source).replace(/[()']/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
  urls.set(source, url);
  return url;
}

/** Paper grain as faint specks: ink-coloured on light grounds, light on dark ones. */
export function grainFilter(id: string, dark: boolean, strength = 1) {
  const [r, g, b] = dark ? [0.92, 0.86, 0.74] : [0.2, 0.18, 0.14];
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="11" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${(dark ? 0.5 : 0.62) * strength} -0.21"/></filter>`;
}

/** The static ground of a tier: paper colour, grain, a faint security print. */
export function groundUrl(tier: CardTier): string {
  const look = TIER_LOOK[tier];
  const rank = TIERS.indexOf(tier);
  const field = waveField({ x: 10, y: 304, w: 280, h: 106, gap: rank >= 3 ? 2.4 : 3, amp: 1.1, wavelength: 24, drift: 0.4 });
  const fieldColor = look.dark ? "#3a2f22" : look.soft;
  const body =
    `<rect width="${CARD_W}" height="${CARD_H}" fill="${look.ground}"/>` +
    `<rect width="${CARD_W}" height="${CARD_H}" filter="url(#gr)"/>` +
    `<path d="${field}" fill="none" stroke="${fieldColor}" stroke-width=".22" stroke-opacity="${look.dark ? 0.9 : 0.22}"/>`;
  return svgUrl(svg(body, grainFilter("gr", look.dark)));
}

/** A mask that keeps the whole card but the picture window (the face of a shadow box). */
export function windowMaskUrl(): string {
  const hole = roundedRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, 5);
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W}" height="${CARD_H}" preserveAspectRatio="none"><path fill-rule="evenodd" fill="#000" d="M0 0H${CARD_W}V${CARD_H}H0Z${hole}"/></svg>`,
  );
}

interface FramePaths {
  outer: string;
  inner: string;
  window: string;
  window2: string;
  rule: string;
  corners: string;
  seal: string;
}

const pathCache = new Map<string, FramePaths>();

export function framePaths(tier: CardTier, period: number): FramePaths {
  const key = `${tier}:${period}`;
  const hit = pathCache.get(key);
  if (hit) return hit;
  const rank = TIERS.indexOf(tier);
  const pack = packLook(period);
  const cornerAt = (cx: number, cy: number) => rosette({ cx, cy, r: rank >= 3 ? 7.5 : 5.5, amp: rank >= 3 ? 2.6 : 1.9, lobes: 10, curves: rank >= 3 ? 6 : 4 });
  const paths: FramePaths = {
    outer: wovenBand({ x: 12, y: 12, w: 276, h: 396, r: 12, width: 8 + rank * 0.7, waves: pack.waves, lines: 3 + rank, second: rank >= 3 ? 3 : undefined }),
    inner: wovenBand({ x: 19.5, y: 19.5, w: 261, h: 381, r: 8, width: 2.6, waves: pack.waves * 2, lines: 2 }),
    window: roundedRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, 5),
    window2: roundedRect(WINDOW.x - 2.2, WINDOW.y - 2.2, WINDOW.w + 4.4, WINDOW.h + 4.4, 6.5),
    rule: `M34 371.5H266`,
    corners: rank >= 1 ? [cornerAt(12, 12), cornerAt(288, 12), cornerAt(12, 408), cornerAt(288, 408)].join("") : "",
    seal: rank >= 2 ? rosette({ cx: 150, cy: 408, r: 8.5, amp: 2.4, lobes: 14, curves: 6 }) : "",
  };
  pathCache.set(key, paths);
  return paths;
}

