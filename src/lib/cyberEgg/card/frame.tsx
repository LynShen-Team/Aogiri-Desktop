/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// cyber-egg.spec.md CE-C3: the frame of a card, by tier. The ground (paper, grain, security print) is a
// static image; the frame lines are inline SVG so their foil can catch the light. Richer tiers get
// more bands, corner rosettes and a seal; the picture window is the same on every card.
import { ceJsx, CeFragment, memo } from "./jsx";
import { FoilGradient } from "./foil";
import { CARD_H, CARD_W, framePaths } from "./frame-art";
import { TIER_LOOK, TIERS, type CardTier } from "./tiers";

/** CE-C3: the frame of a card face; `foil` is the id of this card's frame gradient. */
export const CardFrame = memo(function CardFrame({ tier, period, foilId }: { tier: CardTier; period: number; foilId: string }) {
  const look = TIER_LOOK[tier];
  const p = framePaths(tier, period);
  const foil = `url(#${foilId})`;
  const plain = look.metal === "ink";
  return (
    <svg className="ce-frame" viewBox={`0 0 ${CARD_W} ${CARD_H}`} aria-hidden="true" style={{ color: look.ink }}>
      <defs>
        <FoilGradient id={foilId} metal={look.metal === "holo" ? "silver" : look.metal} w={CARD_W} h={CARD_H} />
      </defs>
      {plain ? (
        // Paper: the border is blind embossed (no ink): a light edge above, a shadow below.
        <g fill="none">
          <path d={p.outer} stroke="#fff" strokeWidth={0.6} transform="translate(-.4 -.4)" opacity={0.95} />
          <path d={p.outer} stroke="#5e574a" strokeWidth={0.5} transform="translate(.4 .4)" opacity={0.45} />
          <path d={p.outer} stroke={look.ground} strokeWidth={0.45} />
        </g>
      ) : (
        <path d={p.outer} fill="none" stroke={foil} strokeWidth={0.45} />
      )}
      {TIERS.indexOf(tier) >= 2 ? <path d={p.inner} fill="none" stroke={foil} strokeWidth={0.3} /> : null}
      <path d={p.window2} fill="none" stroke={look.soft} strokeWidth={0.3} opacity={0.8} />
      <path d={p.window} fill="none" stroke={plain ? look.ink : foil} strokeWidth={plain ? 0.6 : 0.9} />
      <path d={p.rule} fill="none" stroke={look.soft} strokeWidth={0.35} opacity={0.7} />
      {p.corners ? <path d={p.corners} fill="none" stroke={foil} strokeWidth={0.28} /> : null}
      {p.seal ? (
        <g>
          <circle cx={150} cy={408} r={11.5} fill={look.ground} />
          <path d={p.seal} fill="none" stroke={foil} strokeWidth={0.3} />
        </g>
      ) : null}
    </svg>
  );
});
