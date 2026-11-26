// The web's own CSS for the 赛博鸡蛋 card as an object, taken mechanically from the gateway's `frontend/src/index.css`
// (scripts/sync-cyber-egg-art.mjs writes it to card.web.css at the commit the card-art bundle was exported from), so
// the desktop's card is lit, raised, turned, blurred and framed by the very rules the website uses, and its album,
// market and viewer are laid out by the web's own rules for them (PAGE). The web's scene, its phone sheets and its
// draw host are the web's alone and stay out.
//
// A rule is kept when every class its selector names is the card's (SHARED) or a shared page's (PAGE); a list keeps
// its card selectors only; @media and @supports keep the card rules inside them; @keyframes come along when a
// kept rule animates with them. The web's theme class and console colours are mapped to the desktop's.

/** The classes of the card object (card3d.tsx, frame, foil, the artworks' motion), the pack (pack.tsx), the draw
 *  stage's light (draw-stage.tsx) and the card states the album and the viewer show (card-view.tsx). */
export const SHARED = new Set([
	// the card
	'ce-card', 'ce-tilt', 'ce-flip', 'ce-front', 'ce-depth', 'ce-face', 'ce-back', 'ce-edge', 'ce-shadow', 'ce-ground',
	'ce-frame', 'ce-defs', 'ce-plane', 'ce-base', 'ce-wall', 'ce-skin', 'ce-glare', 'ce-glaze', 'ce-glaze-flat', 'ce-holo',
	'ce-text', 'ce-name', 'ce-code', 'ce-line', 'ce-foot', 'ce-back-text', 'ce-back-numeral', 'ce-back-name', 'ce-back-brand',
	// its states
	'ce-card-unowned', 'ce-card-locked', 'ce-lock-tag', 'ce-come-clear', 'ce-card-open', 'ce-card-dim', 'ce-tier-dot',
	'ce-view-stage', 'ce-view-card',
	// the pictures' motion
	'ce-anim', 'ce-spin', 'ce-blink', 'ce-beam', 'ce-beam-2', 'ce-rain', 'ce-scan', 'ce-pulse', 'ce-comet', 'ce-signal', 'ce-fire',
	'ce-drift-far', 'ce-drift-near', 'ce-tram', 'ce-orbit', 'ce-sway', 'ce-voyage', 'ce-glint', 'ce-glint-soft', 'ce-index-arm',
	'ce-telescope', 'ce-shooting', 'ce-scarf', 'ce-shimmer', 'ce-diamond', 'ce-earth-turn', 'ce-rise', 'ce-ripple',
	'ce-ripple-slow', 'ce-petal', 'ce-struck', 'ce-bob', 'ce-whisker', 'ce-bead-move', 'ce-flicker', 'ce-lantern', 'ce-mallet',
	'ce-float-x', 'ce-sheen', 'ce-caustic', 'ce-caustic-2', 'ce-tail', 'ce-fall', 'ce-crane', 'ce-flap', 'ce-type', 'ce-strike',
	'ce-vu', 'ce-tape', 'ce-write',
	// the pack
	'ce-pack', 'ce-pack-shadow', 'ce-pack-tilt', 'ce-pack-skin', 'ce-pack-back', 'ce-pack-rim', 'ce-pack-print',
	'ce-pack-kicker', 'ce-pack-title', 'ce-pack-sub', 'ce-pack-glint', 'ce-pack-lip', 'ce-pack-ribbon', 'ce-pack-light',
	'ce-pack-notch', 'ce-pack-hit', 'ce-pack-open',
	// the draw stage's cards and light
	'ce-stage-card', 'ce-stage-shake', 'ce-stage-spin', 'ce-aura', 'ce-aura-floor', 'ce-aura-prism', 'ce-aura-rays',
	'ce-glints', 'ce-motes',
	// state helpers the selectors above combine with
	'is-pickable', 'is-picked'
]);

/** The web's own layout of the album (binder, pockets, tabs, 集齐), the market (tiles, pages, top-up pill, the
 *  swap's reveal), the viewer's stage and the odds list: the desktop builds the same markup on these rules, so the
 *  pages look the same as well as the card. The web's scene, its phone sheets and its draw host stay out. */
export const PAGE = new Set([
	'ce-album2', 'ce-album2-bar', 'ce-album2-total', 'ce-album-card', 'ce-tabs', 'ce-tab', 'ce-tab-numeral', 'ce-tab-count',
	'ce-book', 'ce-book-arrow', 'ce-spread', 'ce-spread-rings', 'ce-page', 'ce-page-grid', 'ce-page-no', 'ce-pocket',
	'ce-pocket-bare', 'ce-slot-empty', 'ce-slot-no', 'ce-slot-any', 'ce-count', 'ce-new', 'ce-unowned', 'ce-locked',
	'ce-set-strip', 'ce-set-panel', 'ce-set-card', 'ce-set-dialog', 'ce-claim-stage', 'ce-claim-aura',
	'ce-market-tile', 'ce-pages-strip', 'ce-dots', 'ce-dot', 'ce-topup', 'ce-get-stage', 'ce-get-gave', 'ce-get-got',
	'ce-get-aura', 'ce-odds-cards', 'ce-odds-card', 'ce-result-name'
]);

/** The web's theme class (`.dark` on the root): the desktop marks the theme on <html data-theme> (`[data-theme='dark']`). */
const THEME = 'dark';

interface Block {
	prelude: string;
	body: string;
	children?: Block[];
}

/** Top-level blocks of a stylesheet (comments dropped). */
function parse(css: string): Block[] {
	const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const out: Block[] = [];
	let i = 0;
	while (i < text.length) {
		const open = text.indexOf('{', i);
		if (open < 0) break;
		const prelude = text.slice(i, open).trim();
		let depth = 1;
		let j = open + 1;
		for (; j < text.length && depth > 0; j += 1) {
			if (text[j] === '{') depth += 1;
			else if (text[j] === '}') depth -= 1;
		}
		const body = text.slice(open + 1, j - 1);
		// `@import …;` and the like before a block end with a semicolon: keep only what follows the last one.
		const clean = prelude.includes(';') ? prelude.slice(prelude.lastIndexOf(';') + 1).trim() : prelude;
		out.push(/^@(media|supports)\b/.test(clean) ? { prelude: clean, body, children: parse(body) } : { prelude: clean, body });
		i = j;
	}
	return out;
}

/** A selector list split at its top-level commas (not those inside :is(…) or :not(…)). */
function selectors(prelude: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let start = 0;
	for (let k = 0; k < prelude.length; k += 1) {
		const c = prelude[k];
		if (c === '(') depth += 1;
		else if (c === ')') depth -= 1;
		else if (c === ',' && depth === 0) {
			out.push(prelude.slice(start, k).trim());
			start = k + 1;
		}
	}
	out.push(prelude.slice(start).trim());
	return out.filter(Boolean);
}

/** Whether a selector is about the card alone. */
function cardSelector(selector: string): boolean {
	const classes = [...selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]).filter((c) => c !== THEME);
	return classes.length > 0 && classes.every((c) => SHARED.has(c) || PAGE.has(c));
}

/** The web's theme class and console colours, as the desktop names them. */
function desktop(text: string): string {
	return text
		// An attribute weighs what the web's class does, so every themed rule keeps the web's specificity.
		.replace(/(^|,\s*)\.dark\s+/g, "$1[data-theme='dark'] ")
		.replace(/hsl\(var\(--ring\)\)/g, 'var(--brand-bright)')
		.replace(/var\(--font-sans-cjk\)/g, 'var(--font-sans)')
		.replace(/hsl\(var\(--(foreground|muted-foreground|background|muted|border|card)\)(?:\s*\/\s*([\d.]+))?\)/g, (_m, token: string, alpha?: string) => {
			const name = { foreground: '--text', 'muted-foreground': '--dim', background: '--bg', muted: '--surface2', border: '--border', card: '--panel' }[token];
			return alpha ? `color-mix(in oklab, var(${name}) ${Math.round(Number(alpha) * 100)}%, transparent)` : `var(${name})`;
		});
}

function keep(blocks: Block[]): Block[] {
	const out: Block[] = [];
	for (const block of blocks) {
		if (block.children) {
			const inner = keep(block.children);
			if (inner.length) out.push({ prelude: block.prelude, body: '', children: inner });
		} else if (!block.prelude.startsWith('@')) {
			const mine = selectors(block.prelude).filter(cardSelector);
			if (mine.length) out.push({ prelude: mine.join(',\n'), body: block.body });
		}
	}
	return out;
}

function print(blocks: Block[], indent = ''): string {
	return blocks
		.map((b) =>
			b.children
				? `${indent}${b.prelude} {\n${print(b.children, `${indent}\t`)}\n${indent}}`
				: `${indent}${desktop(b.prelude)} {\n${b.body
						.trim()
						.split('\n')
						.map((line) => `${indent}\t${desktop(line.trim())}`)
						.join('\n')}\n${indent}}`
		)
		.join('\n');
}

/** The card's own CSS out of the web's stylesheet, with the keyframes it animates by. */
export function extractCardCss(css: string): string {
	const all = parse(css);
	const rules = keep(all);
	const used = new Set<string>();
	const scan = (blocks: Block[]) => {
		for (const b of blocks) {
			if (b.children) scan(b.children);
			for (const m of b.body.matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g))
				for (const name of m[1].split(/[\s,]+/)) if (/^[a-z][\w-]*$/i.test(name)) used.add(name);
		}
	};
	scan(rules);
	const frames = all.filter((b) => /^@keyframes\s+/.test(b.prelude) && used.has(b.prelude.replace(/^@keyframes\s+/, '').trim()));
	const keyframes = frames.map((b) => `${b.prelude} {${b.body}}`).join('\n');
	return `${print(rules)}\n${keyframes}\n`;
}
