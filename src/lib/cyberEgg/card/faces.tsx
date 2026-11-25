/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// cyber-egg.spec.md CE-C4: what is inside the two faces of a card (the gateway's card3d.tsx markup). The
// Svelte card (Card3D.svelte) holds the object itself (shadow, tilt, flip, edges) and draws these into its
// faces with `mountArt`.
import { ceJsx, CeFragment, type CSSProperties } from './jsx';
import { CardBack } from './card-back';
import type { CardDef } from './cards';
import { FoilGradient } from './foil';
import { CardFrame } from './frame';
import { WINDOW, groundUrl } from './frame-art';
import { TIER_LOOK } from './tiers';

const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(3)}%`;
const WINDOW_BOX: CSSProperties = { left: pct(WINDOW.x, 300), top: pct(WINDOW.y, 420), width: pct(WINDOW.w, 300), height: pct(WINDOW.h, 420) };

/** The front: the sunken picture seen through the window, the paper with its frame, light and text. */
export function FrontFace({ card, packName, serial, uid, live }: { card: CardDef; packName: string; serial?: number | null; uid: string; live: boolean }) {
	const look = TIER_LOOK[card.tier];
	const Art = card.Art;
	return (
		<>
			{/* Far planes first: they sit behind the face, seen through the window. */}
			<div className="ce-depth" style={WINDOW_BOX}>
				<div className="ce-plane ce-base" style={{ '--d': -2.2 }} />
				<svg className="ce-defs" aria-hidden="true" width="0" height="0">
					<defs>
						<FoilGradient id={`${uid}-a`} metal={look.metal} w={WINDOW.w} h={WINDOW.h} />
					</defs>
				</svg>
				<Art foil={`url(#${uid}-a)`} uid={uid} live={live} period={card.period} set={card.set} />
				<div className="ce-plane ce-wall" style={{ '--d': -0.02 }} />
			</div>
			{/* The face: paper with the window cut out, the frame, the light, the text. */}
			<div className="ce-skin">
				<img className="ce-ground" src={groundUrl(card.tier)} alt="" draggable={false} />
				<CardFrame tier={card.tier} period={card.period} foilId={`${uid}-f`} />
				<div className="ce-holo" aria-hidden="true" />
				<div className="ce-glare" aria-hidden="true" />
				<div className="ce-text">
					<span className="ce-name">{card.name}</span>
					<span className="ce-code">{card.special === 'set' ? '典藏' : look.code}</span>
					<span className="ce-line">{card.line}</span>
					<span className="ce-foot">
						<span>{card.special === 'set' ? `${packName} · ${card.of}/${card.of}` : `${packName} · ${String(card.no).padStart(2, '0')}/${card.of}`}</span>
						{serial ? <span>№ {String(serial).padStart(6, '0')}</span> : null}
					</span>
				</div>
			</div>
			<div className="ce-glaze" aria-hidden="true" />
		</>
	);
}

/** The back: the same on every card of a pack, so a face-down card hides its tier. */
export function BackFace({ period, packName, uid }: { period: number; packName: string; uid: string }) {
	return (
		<>
			<CardBack period={period} packName={packName} foilId={`${uid}-b`} />
			<div className="ce-glaze ce-glaze-flat" aria-hidden="true" />
		</>
	);
}
