// cyber-egg.spec.md CE-UI-2: why today's pack can't be opened, with the user's own numbers. The draw page shows the
// pack dimmed beside the one reason and its one fix; the first that applies wins.
import type { EggMe } from './api';

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
	if (c.pool_tokens !== undefined && c.pool_used_tokens !== undefined && c.pool_used_tokens >= c.pool_tokens) return { kind: 'pool' };
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

/** Fen as yuan for a sentence: 2000 → "20", 1250 → "12.50". */
export const yuan = (fen: number) => (fen % 100 === 0 ? String(fen / 100) : (fen / 100).toFixed(2));
