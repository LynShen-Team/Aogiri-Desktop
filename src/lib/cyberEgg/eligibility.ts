// cyber-egg.spec.md CE-UI-2: why today's pack can't be opened, with the user's own numbers. The draw page shows the
// pack dimmed beside the one reason and its one fix; the first that applies wins.
import type { EggCampaign, EggMe } from './api';

export type EggBlock =
	| { kind: 'banned' | 'paused' | 'review' | 'refused' | 'linked' | 'low_balance' | 'ended' | 'pool' }
	/** CE-E1: the paid balance (or a plan) the round asks for, and how much is missing. */
	| { kind: 'funds'; min_fen: number; short_fen: number; plan: string | null }
	/** CE-E2: the account becomes old enough on `at` (ms). */
	| { kind: 'age'; days: number; at: number | null };

/** The reason this user can't open a pack now; null when it can (or has drawn today). */
export function eggBlock(me: EggMe): EggBlock | null {
	const c = me.campaign;
	if (!c || me.today) return null;
	if (me.banned) return { kind: 'banned' };
	if (me.paused) return { kind: 'paused' };
	if (me.membership === 'review') return { kind: 'review' };
	if (me.membership === 'refused') return { kind: 'refused' };
	if (me.checks.some((x) => x.key === 'one_per_person' && !x.ok)) return { kind: 'linked' };
	if (me.blocked === 'low_balance') return { kind: 'low_balance' };
	if (c.state !== 'running') return { kind: 'ended' };
	if (poolDry(c)) return { kind: 'pool' };
	if (me.membership === 'joined') return null;
	const funds = me.checks.find((x) => x.key === 'funds' && !x.ok);
	if (funds) {
		const min = funds.min_balance_fen ?? 0;
		return { kind: 'funds', min_fen: min, short_fen: Math.max(0, min - (funds.balance_fen ?? 0)), plan: funds.min_plan ?? null };
	}
	const age = me.checks.find((x) => x.key === 'account_age' && !x.ok);
	if (age) return { kind: 'age', days: age.min_account_days ?? 0, at: age.eligible_at ?? null };
	return null;
}

/** CE-D5: today's pool can no longer pay a top-tier draw in full, so no pack opens until 00:00; the gateway then
 *  reports the pool as all used. */
export function poolDry(c: EggCampaign): boolean {
	return c.pool_tokens !== undefined && c.pool_used_tokens !== undefined && c.pool_used_tokens >= c.pool_tokens;
}

export type EggExtraChance =
	| { kind: 'none' }
	/** Another pack can be opened now. */
	| { kind: 'open'; n: number }
	/** Today's pool is drawn out: the chances wait for 00:00, unless the round ends today. */
	| { kind: 'dry'; n: number; lastDay: boolean }
	/** The round is paused or over. */
	| { kind: 'stopped'; n: number; state: 'paused' | 'ended' };

/** CE-H2: whether this user's extra chances can open a pack now, and if not, why (the result page says it instead of
 *  offering a pack the gateway would refuse). */
export function extraChance(me: EggMe): EggExtraChance {
	const n = me.chances?.available ?? 0;
	const c = me.campaign;
	// A round that has not started has nothing to open and nothing to explain.
	if (n <= 0 || !c || c.state === 'scheduled') return { kind: 'none' };
	if (c.state !== 'running') return { kind: 'stopped', n, state: c.state };
	if (poolDry(c)) return { kind: 'dry', n, lastDay: c.day.index >= c.day.count };
	return { kind: 'open', n };
}

/** Fen as yuan for a sentence: 2000 → "20", 1250 → "12.50". */
export const yuan = (fen: number) => (fen % 100 === 0 ? String(fen / 100) : (fen / 100).toFixed(2));
