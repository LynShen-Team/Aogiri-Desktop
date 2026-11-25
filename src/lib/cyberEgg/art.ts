// 赛博鸡蛋's card art, read from the one bundle every client shares (gateway spec CE-API-9; format in
// static/cyber-egg/art/ART-FORMAT.md; copied there by scripts/sync-cyber-egg-art.mjs, never edited by hand).
// The cards, their tiers, packs, frames, grounds, backs and wrappers all come from its manifest; this module
// only looks them up and builds the URLs.
import manifest from '../../../static/cyber-egg/art/manifest.json';

export type Tier = 'n' | 'r' | 'sr' | 'ssr' | 'ur';
export const TIERS: Tier[] = ['n', 'r', 'sr', 'ssr', 'ur'];

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}
export interface Plane {
	depth: number;
	pop: boolean;
	cast: boolean;
	clip: boolean;
	box: Box;
	opacity?: number;
	file: string;
}
export interface ArtCard {
	id: string;
	period: number;
	no: number;
	of: number;
	tier: Tier;
	name: string;
	line: string;
	ground: string;
	special?: 'set';
	thumb: { file: string; x: number; y: number; w: number; h: number };
	planes: Plane[];
}
export interface ArtPack {
	period: number;
	name: string;
	line: string;
	ready: boolean;
	cards: string[];
	set?: string;
	back: { ground: string; line: string; accent: string; svg: string };
	wrapper: string;
	thumbs: string;
}
export interface TierLook {
	code: string;
	label?: string;
	ground: string;
	ink: string;
	soft: string;
	metal: 'ink' | 'copper' | 'silver' | 'gold' | 'holo';
	dark: boolean;
	edge: string;
	light: string;
	glow: string;
}

const m = manifest as unknown as {
	version: number;
	source: { commit: string };
	geometry: { card: Box & { radius: number }; window: Box & { radius: number }; planeBox: Box };
	tiers: Record<Tier, TierLook>;
	packs: ArtPack[];
	cards: ArtCard[];
	frames: Record<string, string>;
	grounds: Record<Tier, { svg: string; grain: string }>;
	grain: Record<'light' | 'dark' | 'back', { file: string; tile: number }>;
};

/** Where the bundle is served from (the app's static files). */
const BASE = '/cyber-egg/art/';
export const artUrl = (file: string) => `${BASE}${file}`;

export const GEOMETRY = m.geometry;
export const TIER_LOOK: Record<Tier, TierLook> = m.tiers;
export const PACKS: ArtPack[] = m.packs;
const CARDS = new Map(m.cards.map((card) => [card.id, card]));

export const cardById = (id: string): ArtCard | undefined => CARDS.get(id);
export const packOf = (period: number): ArtPack | undefined => PACKS.find((p) => p.period === period);
/** The cards of a pack in order (without its 典藏 card). */
export const packCards = (period: number): ArtCard[] =>
	(packOf(period)?.cards ?? []).map((id) => CARDS.get(id)).filter((c): c is ArtCard => !!c);
export const frameOf = (tier: Tier, period: number) => artUrl(m.frames[`${tier}:${period}`] ?? m.frames[`${tier}:1`]);
export const groundOf = (tier: Tier) => ({ svg: artUrl(m.grounds[tier].svg), grain: artUrl(m.grounds[tier].grain) });
export const backGrain = () => artUrl(m.grain.back.file);
/** The grain tile's side in card units (a card is 300 wide). */
export const GRAIN_TILE = m.grain.light.tile;

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** A mask that keeps the whole card but its picture window (the face of a shadow box), from the geometry. */
export const windowMaskUrl = (() => {
	let url = '';
	return () => {
		if (url) return url;
		const { card, window: w } = GEOMETRY;
		const svg =
			`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${card.w} ${card.h}'>` +
			`<path fill-rule='evenodd' d='M0 0H${card.w}V${card.h}H0Z` +
			`M${w.x + w.radius} ${w.y}H${w.x + w.w - w.radius}A${w.radius} ${w.radius} 0 0 1 ${w.x + w.w} ${w.y + w.radius}` +
			`V${w.y + w.h - w.radius}A${w.radius} ${w.radius} 0 0 1 ${w.x + w.w - w.radius} ${w.y + w.h}` +
			`H${w.x + w.radius}A${w.radius} ${w.radius} 0 0 1 ${w.x} ${w.y + w.h - w.radius}` +
			`V${w.y + w.radius}A${w.radius} ${w.radius} 0 0 1 ${w.x + w.radius} ${w.y}Z'/></svg>`;
		url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
		return url;
	};
})();

/**
 * An exported SVG ready to inline in a card: its ids made unique to `uid` (a card can show twice on a page), and
 * its foil gradients marked so the card's tilt can move their light (the web's `data-foil`: `w h k`, k 1.1 for
 * the hologram's colours, 0.42 for metal; they reflect, the hologram's repeat).
 */
export function inlineSvg(source: string, uid: string, foil: { w: number; h: number; holo: boolean } | null): string {
	let out = source.replace(/id='([^']+)'/g, `id='$1-${uid}'`).replace(/url\(#([^)]+)\)/g, `url(#$1-${uid})`).replace(/href='#([^']+)'/g, `href='#$1-${uid}'`);
	if (foil)
		out = out.replace(
			/<linearGradient([^>]*gradientUnits='userSpaceOnUse'[^>]*)>/g,
			`<linearGradient$1 spreadMethod='${foil.holo ? 'repeat' : 'reflect'}' data-foil='${foil.w} ${foil.h} ${foil.holo ? 1.1 : 0.42}'>`
		);
	return out;
}

const texts = new Map<string, Promise<string>>();
/** An exported SVG's text (fetched once). */
export function svgText(file: string): Promise<string> {
	let hit = texts.get(file);
	if (!hit) {
		hit = fetch(artUrl(file)).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${file}: ${r.status}`))));
		texts.set(file, hit);
		hit.catch(() => texts.delete(file));
	}
	return hit;
}
