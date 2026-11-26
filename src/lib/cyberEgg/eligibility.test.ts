import { describe, expect, it } from 'vitest';
import type { EggMe } from './api';
import { eggBlock, yuan } from './eligibility';

const base = (over: Partial<EggMe> = {}): EggMe =>
	({
		campaign: { id: 'r', name: 'r', models: [], day: { index: 1, count: 2, resets_at: 0 }, per_user_cap_tokens: 0, pool_tokens: 100, pool_used_tokens: 10, starts_at: 0, ends_at: 0, state: 'running' },
		checks: [
			{ key: 'funds', ok: true },
			{ key: 'account_age', ok: true },
			{ key: 'one_per_person', ok: true }
		],
		membership: 'none',
		blocked: null,
		my_used_tokens: 0,
		key: null,
		api_base_url: '',
		usage: [],
		tiers: [],
		pity_left: { sr: null, ssr: null, ur: null },
		pack: { period: 1, name: 'p' },
		today: null,
		next_draw_at: 0,
		collection: [],
		packs: [],
		...over
	}) as EggMe;

describe('why a pack cannot be opened', () => {
	it('lets an eligible or joined user draw', () => {
		expect(eggBlock(base())).toBeNull();
		expect(eggBlock(base({ membership: 'joined', checks: [{ key: 'funds', ok: false }] }))).toBeNull();
	});
	it('says what is missing of the balance, as the live gateway answers for a new account', () => {
		const me = base({ checks: [{ key: 'funds', ok: false, balance_fen: 0, min_balance_fen: 2000, min_plan: 'Sprout' }, { key: 'account_age', ok: true }, { key: 'one_per_person', ok: true }] });
		expect(eggBlock(me)).toEqual({ kind: 'funds', min_fen: 2000, short_fen: 2000, plan: 'Sprout' });
	});
	it('puts holds and the pool before the requirements', () => {
		expect(eggBlock(base({ membership: 'review' }))?.kind).toBe('review');
		expect(eggBlock(base({ checks: [{ key: 'one_per_person', ok: false }] }))?.kind).toBe('linked');
		expect(eggBlock(base({ blocked: 'low_balance', membership: 'joined' }))?.kind).toBe('low_balance');
		const empty = base();
		empty.campaign!.pool_used_tokens = 100;
		expect(eggBlock(empty)?.kind).toBe('pool');
	});
	it('says nothing once today is drawn', () => {
		expect(eggBlock(base({ banned: { reason: 'refund', at: 0 }, today: { card: {} as never, others: [], expires_at: 0 } }))).toBeNull();
	});
	it('writes yuan', () => {
		expect(yuan(2000)).toBe('20');
		expect(yuan(1250)).toBe('12.50');
	});
});
