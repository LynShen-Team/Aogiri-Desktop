// CE-D6, CE-C7: the chances the page publishes: each tier's long-run rate once the guarantees count, and one card's
// share of it. The same sums as the website (gateway frontend `pages/cyber-egg/card/tiers.ts` pityRates,
// `card-rate.ts`), so both show the same figures; change them together.
import { TIERS, packCards, type ArtCard, type Tier } from './art';
import type { EggMe, EggPity, EggTierRule } from './api';

const ORDER: Record<Tier, number> = { n: 0, r: 1, sr: 2, ssr: 3, ur: 4 };
/** The round's guarantees when an older gateway sends none (the website's DEFAULT_PITY). */
export const DEFAULT_PITY: EggPity = { sr_at: 10, ssr_at: 0, ur_at: 0, dupe_guard: true, shared_sr_every: 200 };

/** Each tier's chance on one draw without the guarantees (0–1). */
export function baseRates(rules: EggTierRule[]): Record<Tier, number> {
	const total = rules.reduce((sum, rule) => sum + Math.max(0, rule.weight_bp), 0);
	const base = Object.fromEntries(TIERS.map((tier) => [tier, 0])) as Record<Tier, number>;
	for (const rule of rules) base[rule.tier] = total > 0 ? Math.max(0, rule.weight_bp) / total : 0;
	return base;
}

/**
 * Each tier's long-run chance (0–1) with the guarantees. Exact, by renewal: a cycle runs from just after a 流光 to
 * the next; a tier's chance is its expected count in a cycle over the cycle's expected length. The state inside a
 * cycle is (draws since 白银+, draws since 鎏金+); a guarantee that is off keeps its count at 0.
 */
export function pityRates(rules: EggTierRule[], pity: Pick<EggPity, 'sr_at' | 'ssr_at' | 'ur_at' | 'shared_sr_every'>): Record<Tier, number> {
	const base = baseRates(rules);
	// A due guarantee lifts a roll below its tier up to it; a roll at or above it stays.
	const guaranteed = (from: 'sr' | 'ssr' | 'ur'): Array<[Tier, number]> => TIERS.map((tier) => [ORDER[tier] < ORDER[from] ? from : tier, base[tier]] as [Tier, number]);
	const plain = TIERS.map((tier) => [tier, base[tier]] as [Tier, number]);
	const count = Object.fromEntries(TIERS.map((tier) => [tier, 0])) as Record<Tier, number>;
	const srAt = pity.sr_at > 0 ? pity.sr_at : 0;
	const ssrAt = pity.ssr_at > 0 ? pity.ssr_at : 0;
	if (!(pity.ur_at > 0)) {
		// No 流光 guarantee: the state is a small chain of its own; its long-run share of each state gives the chances.
		let dist = new Map<string, number>([['0,0', 1]]);
		// The server's every-nth lift reaches a given player's draw about once in n.
		const every = pity.shared_sr_every && pity.shared_sr_every > 0 ? pity.shared_sr_every : 0;
		const mixed: Array<[Tier, number]> = every
			? [...plain.map(([tier, q]) => [tier, q * (1 - 1 / every)] as [Tier, number]), ...guaranteed('sr').map(([tier, q]) => [tier, q / every] as [Tier, number])]
			: plain;
		const oddsAt = (a: number, b: number) => (ssrAt && b === ssrAt - 1 ? guaranteed('ssr') : srAt && a === srAt - 1 ? guaranteed('sr') : mixed);
		for (let round = 0; round < 4000; round += 1) {
			const next = new Map<string, number>();
			for (const [key, p] of dist) {
				const [a, b] = key.split(',').map(Number);
				for (const [tier, q] of oddsAt(a, b)) {
					if (q <= 0) continue;
					const na = !srAt || ORDER[tier] >= ORDER.sr ? 0 : a + 1;
					const nb = !ssrAt || ORDER[tier] >= ORDER.ssr ? 0 : b + 1;
					const k = `${na},${nb}`;
					next.set(k, (next.get(k) ?? 0) + p * q);
				}
			}
			let change = 0;
			for (const [key, p] of next) change += Math.abs(p - (dist.get(key) ?? 0));
			dist = next;
			if (change < 1e-12) break;
		}
		for (const [key, p] of dist) {
			const [a, b] = key.split(',').map(Number);
			for (const [tier, q] of oddsAt(a, b)) count[tier] += p * q;
		}
		return count;
	}
	let alive = new Map<string, number>([['0,0', 1]]);
	let length = 0;
	for (let c = 0; c < pity.ur_at && alive.size > 0; c += 1) {
		const next = new Map<string, number>();
		let mass = 0;
		for (const [key, p] of alive) {
			if (p < 1e-15) continue;
			mass += p;
			const [a, b] = key.split(',').map(Number);
			length += p;
			const odds = c === pity.ur_at - 1 ? guaranteed('ur') : ssrAt && b === ssrAt - 1 ? guaranteed('ssr') : srAt && a === srAt - 1 ? guaranteed('sr') : plain;
			for (const [tier, q] of odds) {
				if (q <= 0) continue;
				count[tier] += p * q;
				if (tier === 'ur') continue;
				const na = !srAt || tier === 'sr' || tier === 'ssr' ? 0 : a + 1;
				const nb = !ssrAt || tier === 'ssr' ? 0 : b + 1;
				const k = `${na},${nb}`;
				next.set(k, (next.get(k) ?? 0) + p * q);
			}
		}
		alive = next;
		if (mass < 1e-9) break;
	}
	return Object.fromEntries(TIERS.map((tier) => [tier, length > 0 ? count[tier] / length : base[tier]])) as Record<Tier, number>;
}

/** The round's tier chances with the guarantees (memoised per answer). */
const memo = new WeakMap<object, Record<Tier, number>>();
export function roundRates(me: Pick<EggMe, 'tiers' | 'pity'>): Record<Tier, number> {
	let rates = memo.get(me.tiers);
	if (!rates) {
		rates = pityRates(me.tiers, me.pity ?? DEFAULT_PITY);
		memo.set(me.tiers, rates);
	}
	return rates;
}

/** CE-D6: one card's long-run chance on a draw: its tier's rate with the guarantees, shared by the tier's cards. */
export function cardRate(me: Pick<EggMe, 'tiers' | 'pity'>, def: ArtCard): number {
	const same = packCards(def.period).filter((card) => card.tier === def.tier).length || 1;
	return (roundRates(me)[def.tier] ?? 0) / same;
}

/** Small chances keep their third decimal (a 流光 card is 0.025%, not 0.03%). */
export function percent(value: number, language = 'zh-CN'): string {
	return `${(value * 100).toLocaleString(language, { maximumFractionDigits: value < 0.001 ? 3 : 2 })}%`;
}
