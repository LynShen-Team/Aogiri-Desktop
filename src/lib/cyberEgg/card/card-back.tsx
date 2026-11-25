/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// cyber-egg.spec.md CE-C2: the back of every card of a pack. The same for all tiers and all cards, so a
// face-down card tells nothing (the five-card pick, CE-R1, depends on it).
import { ceJsx, CeFragment, memo } from "./jsx";
import { packEmblem, type Emblem } from "./emblem";
import { roundedRect, rosette, waveField, wovenBand } from "./geometry";
import { FoilGradient } from "./foil";
import { CARD_H, CARD_W, grainFilter, svgUrl } from "./frame-art";
import { ROMAN, packLook } from "./tiers";

const CX = 150;
const CY = 200;

function backGroundUrl(period: number) {
  const { back } = packLook(period);
  const field = waveField({ x: 8, y: 8, w: 284, h: 404, gap: 2.7, amp: 1.5, wavelength: 28, drift: 0.55 });
  const halo = rosette({ cx: CX, cy: CY, r: 104, amp: 2.2, lobes: 64, curves: 3, squash: 1.32 });
  const body =
    `<rect width="${CARD_W}" height="${CARD_H}" fill="${back.ground}"/>` +
    `<rect width="${CARD_W}" height="${CARD_H}" filter="url(#gb)"/>` +
    `<path d="${field}" fill="none" stroke="${back.line}" stroke-width=".22" stroke-opacity=".38"/>` +
    `<ellipse cx="${CX}" cy="${CY}" rx="96" ry="127" fill="${back.ground}" fill-opacity=".82"/>` +
    `<path d="${halo}" fill="none" stroke="${back.line}" stroke-width=".22" stroke-opacity=".8"/>`;
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W * 2}" height="${CARD_H * 2}"><defs>${grainFilter("gb", true, 0.8)}</defs>${body}</svg>`,
  );
}

const cache = new Map<number, { ground: string; band: string; ovals: string; emblem: Emblem; frame: string }>();

function backPaths(period: number) {
  const hit = cache.get(period);
  if (hit) return hit;
  const pack = packLook(period);
  const value = {
    ground: backGroundUrl(period),
    band: wovenBand({ x: 12, y: 12, w: 276, h: 396, r: 12, width: 9, waves: pack.waves, lines: 4 }),
    ovals:
      rosette({ cx: CX, cy: CY, r: 78, amp: 7, lobes: pack.lobes + 4, curves: 10, squash: 1.32 }) +
      rosette({ cx: CX, cy: CY, r: 58, amp: 4.5, lobes: pack.lobes, curves: 7, squash: 1.32, swell: 2, swellLobes: 6 }),
    emblem: packEmblem(period, CX, CY, 1, 1.2),
    frame: roundedRect(24, 24, 252, 372, 6),
  };
  cache.set(period, value);
  return value;
}

export const CardBack = memo(function CardBack({ period, packName, foilId }: { period: number; packName: string; foilId: string }) {
  const pack = packLook(period);
  const p = backPaths(period);
  const foil = `url(#${foilId})`;
  return (
    <>
      <img className="ce-ground" src={p.ground} alt="" draggable={false} />
      <svg className="ce-frame" viewBox={`0 0 ${CARD_W} ${CARD_H}`} aria-hidden="true">
        <defs>
          <FoilGradient id={foilId} metal="silver" w={CARD_W} h={CARD_H} />
        </defs>
        <path d={p.band} fill="none" stroke={foil} strokeWidth={0.42} opacity={0.85} />
        <path d={p.frame} fill="none" stroke={pack.back.line} strokeWidth={0.4} />
        <path d={p.ovals} fill="none" stroke={foil} strokeWidth={0.3} />
        <path d={p.emblem.lines} fill="none" stroke={foil} strokeWidth={0.4} opacity={0.95} />
        {p.emblem.solids ? <path d={p.emblem.solids} fill={foil} /> : null}
        {p.emblem.seal ? (
          <g>
            <rect x={p.emblem.seal.x} y={p.emblem.seal.y} width={p.emblem.seal.size} height={p.emblem.seal.size} rx={p.emblem.seal.size * 0.08} fill="#a3362a" />
            <text x={p.emblem.seal.x + p.emblem.seal.size / 2} y={p.emblem.seal.y + p.emblem.seal.size * 0.74} textAnchor="middle" fontFamily="'Songti SC','STSong','SimSun',serif" fontSize={p.emblem.seal.size * 0.7} fill="#f6e9d8">
              {p.emblem.seal.text}
            </text>
          </g>
        ) : null}
      </svg>
      <div className="ce-back-text" style={{ color: pack.back.accent }}>
        <span className="ce-back-numeral">{ROMAN[period] ?? period}</span>
        <span className="ce-back-name">{packName}</span>
        <span className="ce-back-brand">LYNSHEN · 赛博鸡蛋</span>
      </div>
    </>
  );
});
