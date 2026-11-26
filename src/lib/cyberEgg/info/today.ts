// cyber-egg.spec.md CE-H3, CE-D3, CE-UI-5: today's tokens are every draw of the day added up, the day's draw and the
// bonus draws of extra chances. The website's `pages/cyber-egg/today-draws.ts`, for the 调用 page.
import type { EggDraw, EggMe } from '../api';
import { TIERS, cardById } from '../art';
import type { ViewerItem } from '../CardViewer.svelte';

type Today = Pick<EggMe, 'today' | 'today_bonus'>;

/** Today's draws: the day's own first, then the bonus draws, oldest first. */
export function todayDraws(me: Today): EggDraw[] {
	return [...(me.today ? [me.today] : []), ...(me.today_bonus ?? [])];
}

/** The tokens of today's draws together, what of them is used, and what is left. */
export function todayTokens(me: Today & Pick<EggMe, 'my_used_tokens'>): { total: number; used: number; left: number } {
	const total = todayDraws(me).reduce((sum, draw) => sum + draw.card.tokens, 0);
	const used = Math.min(total, Math.max(0, me.my_used_tokens));
	return { total, used, left: total - used };
}

/** Today's draws as the 调用 card stacks them, bottom first: the best on top (higher tier, then more tokens, then newer). */
export function stackOrder(draws: EggDraw[]): EggDraw[] {
	return draws
		.map((draw, index) => ({ draw, index }))
		.sort((a, b) => TIERS.indexOf(a.draw.card.tier) - TIERS.indexOf(b.draw.card.tier) || a.draw.card.tokens - b.draw.card.tokens || a.index - b.index)
		.map(({ draw }) => draw);
}

/**
 * CE-C6, CE-H3: today's cards in the card viewer, top of the pile first (the one a click on the pile opens), each with
 * the copies of it the player owns and what its draw gave.
 */
export function todayItems(me: Today & Pick<EggMe, 'collection'>): Array<{ draw: EggDraw; item: ViewerItem }> {
	return stackOrder(todayDraws(me))
		.reverse()
		.flatMap((draw) => {
			const def = cardById(draw.card.card_id);
			if (!def) return [];
			const copies = me.collection.filter((copy) => copy.card_id === def.id);
			return [{ draw, item: { def, copies, drawn: { serial: draw.card.serial, tokens: draw.card.tokens } } }];
		});
}
