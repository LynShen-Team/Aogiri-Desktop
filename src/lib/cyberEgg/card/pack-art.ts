// cyber-egg.spec.md CE-C2: a pack's printed wrapper (one image per pack), used by the sealed pack on the
// stage and by the covers on the album's shelf.
import { emblemMarkup, packEmblem } from "./emblem";
import { rosette, waveField, wovenBand } from "./geometry";
import { svgUrl } from "./frame-art";
import { packLook } from "./tiers";

export const PW = 345;
export const PH = 500;
const SEAL = 34;

/** The printed wrapper of a pack as an image (one per pack): ground, guilloché, the medallion, seals. */
export function wrapperUrl(period: number) {
  const look = packLook(period);
  const { back } = look;
  const field = waveField({ x: 0, y: 0, w: PW, h: PH, gap: 3, amp: 1.6, wavelength: 30, drift: 0.55 });
  const cx = PW / 2;
  const cy = PH * 0.47;
  const ring1 = rosette({ cx, cy, r: 92, amp: 8, lobes: look.lobes + 4, curves: 10, squash: 1.18 });
  const ring2 = rosette({ cx, cy, r: 70, amp: 5, lobes: look.lobes, curves: 7, squash: 1.18, swell: 2, swellLobes: 6 });
  const ring3 = rosette({ cx, cy, r: 112, amp: 2.4, lobes: look.lobes * 2 + 8, curves: 3, squash: 1.18 });
  const emblem = emblemMarkup(packEmblem(period, cx, cy, 1.25, 1.1), back.accent, 0.5);
  const band = wovenBand({ x: 16, y: SEAL + 10, w: PW - 32, h: PH - 2 * SEAL - 20, r: 10, width: 7, waves: look.waves, lines: 4 });
  let ridges = "";
  for (let x = 2; x < PW; x += 4) ridges += `M${x} 0V${SEAL}M${x} ${PH - SEAL}V${PH}`;
  const body =
    `<defs><linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".08" stop-color="#fff" stop-opacity=".0"/><stop offset=".86" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>` +
    `<radialGradient id="pl" cx=".42" cy=".42" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>` +
    `<rect width="${PW}" height="${PH}" fill="${back.ground}"/>` +
    `<path d="${field}" fill="none" stroke="${back.line}" stroke-width=".3" stroke-opacity=".35"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="120" ry="140" fill="${back.ground}" fill-opacity=".8"/>` +
    `<path d="${ring3}" fill="none" stroke="${back.line}" stroke-width=".3" stroke-opacity=".8"/>` +
    `<path d="${ring1}" fill="none" stroke="${back.accent}" stroke-width=".38" stroke-opacity=".9"/>` +
    `<path d="${ring2}" fill="none" stroke="${back.accent}" stroke-width=".32" stroke-opacity=".8"/>` +
    emblem +
    `<path d="${band}" fill="none" stroke="${back.accent}" stroke-width=".4" stroke-opacity=".75"/>` +
    `<path d="${ridges}" stroke="#000" stroke-opacity=".28" stroke-width="1"/>` +
    `<path d="M0 ${SEAL}H${PW}M0 ${PH - SEAL}H${PW}" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>` +
    `<rect width="${PW}" height="${PH}" fill="url(#pl)"/><rect width="${PW}" height="${PH}" fill="url(#sh)"/>`;
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW * 2}" height="${PH * 2}" preserveAspectRatio="none">${body}</svg>`);
}
