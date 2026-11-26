// Sample answers of the 赛博鸡蛋 client API (CE-API-8), for the browser fixtures (`tests/browser`, `?egg`) and
// for a look at the pages before the gateway serves them (`localStorage['lynshen-cyber-egg-mock']`).
// `?egg=drawn` (and `?eggChat`) starts with today's card drawn, `?egg=none` with no round running; `&eggDry` with
// today's pool drawn out (CE-D5; `=last` on the round's last day), `&eggRound=paused|ended` with the round stopped.
import type { EggDraw, EggKey, EggListing, EggMe, EggOwnedCard, EggTierRule, EggTopup, EggTrade, EggTradeEvent, EggTrades, Tier } from './api';

const DAY = 86_400_000;
const now = () => Date.now();
/** The next 00:00 in Beijing (UTC+8). */
function nextReset(at = now()): number {
	const shifted = at + 8 * 3_600_000;
	return shifted - (shifted % DAY) + DAY - 8 * 3_600_000;
}

const params = (() => {
	try {
		return new URL(location.href).searchParams;
	} catch {
		return new URLSearchParams();
	}
})();
const mode = params.has('eggChat') || params.has('eggSeed') ? 'drawn' : (params.get('egg') ?? '');
const dry = params.get('eggDry');
const POOL = 1_000_000_000;
const CAMPAIGN = 'r1';

const TIERS: EggTierRule[] = [
	{ tier: 'n', min_tokens: 5_000_000, max_tokens: 10_000_000, weight_bp: 5785 },
	{ tier: 'r', min_tokens: 10_000_000, max_tokens: 20_000_000, weight_bp: 3000 },
	{ tier: 'sr', min_tokens: 20_000_000, max_tokens: 40_000_000, weight_bp: 1200 },
	{ tier: 'ssr', min_tokens: 40_000_000, max_tokens: 70_000_000, weight_bp: 10 },
	{ tier: 'ur', min_tokens: 70_000_000, max_tokens: 100_000_000, weight_bp: 5 }
];

let serial = 1280;
const owned = (card_id: string, tier: Tier, tokens: number, daysAgo: number, from: 'draw' | 'trade' = 'draw'): EggOwnedCard => ({
	id: `c-${card_id}-${(serial += 1)}`,
	card_id,
	period: Number(card_id.slice(1, card_id.indexOf('-'))),
	tier,
	serial,
	tokens,
	at: now() - daysAgo * DAY,
	from
});

const key: EggKey = { id: 'k1', prefix: 'sk-egg-', last4: 'a1b2', created_at: now() - 6 * DAY, rotations_left: 3, rotation_limit: 3, suspended: null };
const SECRET = 'sk-egg-sample0000000000000000a1b2';

const collection: EggOwnedCard[] = [
	owned('p1-01', 'n', 6_120_000, 7),
	owned('p1-02', 'n', 7_800_000, 6),
	owned('p1-02', 'n', 5_400_000, 5),
	owned('p1-03', 'n', 8_900_000, 5, 'trade'),
	owned('p1-07', 'r', 14_300_000, 4),
	owned('p1-08', 'r', 12_600_000, 3),
	owned('p1-10', 'sr', 28_800_000, 2),
	owned('p1-11', 'sr', 31_500_000, 1),
	owned('p1-11', 'sr', 22_000_000, 1, 'trade')
];

const TODAY: Omit<EggDraw, 'expires_at'> = {
	card: owned('p1-13', 'ssr', 48_260_000, 0),
	kind: 'daily',
	others: [
		{ card_id: 'p1-04', tier: 'n' },
		{ card_id: 'p1-08', tier: 'r' },
		{ card_id: 'p1-10', tier: 'sr' },
		{ card_id: 'p1-02', tier: 'n' }
	]
};

const state = { drawn: mode === 'drawn', used: 17_820_000, trades: null as EggTrades | null, listings: null as EggListing[] | null };

function today(): EggDraw | null {
	return state.drawn ? { ...TODAY, expires_at: nextReset() } : null;
}

function at(h: number, m: number) {
	const d = new Date();
	d.setHours(h, m, 0, 0);
	return d.getTime();
}

function me(): EggMe {
	const draw = today();
	const call = (id: string, h: number, m: number, model: string, input: number, cached: number, output: number) => ({
		id,
		at: at(h, m),
		model,
		input_tokens: input,
		cached_input_tokens: cached,
		output_tokens: output,
		counted_tokens: input + cached + output
	});
	return {
		campaign:
			mode === 'none'
				? null
				: {
						id: CAMPAIGN,
						name: '机器之心',
						models: ['deepseek-v4.1-flash', 'glm-5.3-flash', 'qwen-3.6-plus'],
						day: { index: dry === 'last' ? 14 : 4, count: 14, resets_at: nextReset() },
						per_user_cap_tokens: draw ? draw.card.tokens : 0,
						pool_tokens: POOL,
						pool_used_tokens: dry === null ? 412_000_000 : POOL,
						starts_at: now() - 3 * DAY,
						ends_at: now() + 10 * DAY,
						state: (params.get('eggRound') as 'paused' | 'ended' | null) ?? 'running'
					},
		checks: [
			// ?egg=short: a new account below the round's minimum, as the live gateway answers.
			mode === 'short' ? { key: 'funds', ok: false, balance_fen: 0, min_balance_fen: 2000, min_plan: 'Sprout', plan: null } : { key: 'funds', ok: true },
			{ key: 'account_age', ok: true },
			{ key: 'one_per_person', ok: true }
		],
		membership: mode === 'short' ? 'none' : 'joined',
		blocked: null,
		my_used_tokens: draw ? state.used : 0,
		key,
		api_base_url: 'https://api.lynshen.org/new/v1',
		usage: draw
			? [
					call('u1', 14, 32, 'deepseek-v4.1-flash', 21_400, 152_000, 9_000),
					call('u2', 13, 58, 'deepseek-v4.1-flash', 8_100, 81_000, 7_000),
					call('u3', 11, 20, 'glm-5.3-flash', 404_000, 760_000, 40_000),
					call('u4', 10, 5, 'deepseek-v4.1-flash', 3_337_500, 12_600_000, 400_000)
				]
			: [],
		tiers: TIERS,
		pity: { sr_at: 10, ssr_at: 0, ur_at: 0, dupe_guard: true, shared_sr_every: 200 },
		pity_left: { sr: 3, ssr: null, ur: null },
		pack: { period: 1, name: '机器之心' },
		today: draw,
		next_draw_at: draw ? nextReset() : now(),
		collection: draw ? [TODAY.card, ...collection] : collection,
		packs: [
			{ period: 1, state: 'open' },
			{ period: 2, state: 'upcoming' },
			{ period: 3, state: 'upcoming' }
		],
		chances: { enabled: true, available: params.has('eggChances') ? 2 : 0 },
		// ?eggSet=claimed: this player has claimed the 集齐 reward (rank 7, the cash still held).
		sets: [
			{
				period: 1,
				bonus_cash_fen: 30_000,
				bonus_gift_fen: 20_000,
				completed: 12,
				claimed: params.get('eggSet') === 'claimed' ? { at: now() - DAY, rank: 7, serial: 7, cash_fen: 30_000, gift_fen: 20_000, cash: { state: 'held', at: null } } : null,
				cap: 100,
				left: 88
			}
		],
		balance_fen: 3_650,
		market_rules: { topup_enabled: true, topup_max_fen: 5_000, topup_fee_permille: 50 },
		// ?eggBanned: refunded, so the album is view-only and the market closed (CE-B1).
		banned: params.has('eggBanned') ? { reason: 'refund', at: now() - DAY } : null,
		paused: null
	};
}

// The market (MarketView, market/*): my listings and others', the direct swaps sent to me and by me, the latest swaps
// in the hall and today's count. A swap moves the copies in and out of the sample collection, so the album follows.
// 定向交换 finds any username: `empty` has nothing to swap, `nobody` does not exist.
const ME = 'lin_dev';
const MIN = 60_000;
const HOUR = 3_600_000;
const hall = { recent: null as EggTradeEvent[] | null, today: 37, lookup: new Map<string, EggOwnedCard[]>() };

function trades(): EggTrades {
	state.trades ??= {
		incoming: [
			{ id: 't1', from: 'ya***o', to: ME, give: [owned('p1-06', 'n', 0, 2), owned('p1-04', 'n', 0, 3)], want: [collection[2]], state: 'open', at: now() - 30 * MIN },
			{ id: 't2', from: 'qi***g', to: ME, give: [owned('p1-09', 'r', 0, 1)], want: [collection[7]], topup: { fen: 1000, by: 'from' }, state: 'open', at: now() - 67 * MIN }
		],
		outgoing: [{ id: 't4', from: ME, to: 'zh***o', give: [collection[1]], want: [owned('p1-12', 'ssr', 0, 6)], topup: { fen: 1500, by: 'from' }, state: 'open', at: now() - 3 * HOUR }],
		done: [
			{ id: 't5', from: 'he***u', to: ME, give: [owned('p1-03', 'n', 0, 5)], want: [owned('p1-01', 'n', 0, 6)], state: 'accepted', at: now() - DAY },
			{ id: 't3', from: ME, to: 'he***u', give: [collection[3]], want: [owned('p1-14', 'ur', 0, 4)], state: 'declined', at: now() - 2 * DAY },
			{ id: 't6', from: 'ji***n', to: ME, give: [owned('p1-05', 'n', 0, 8)], want: [collection[0]], topup: { fen: 300, by: 'from' }, state: 'expired', at: now() - 4 * DAY }
		]
	};
	return state.trades;
}

function listings(): EggListing[] {
	const other = (id: string, by: string, give: [string, Tier], want: string | Tier | null, ago: number, topup: EggListing['topup'] = null): EggListing => ({
		id,
		owner: by,
		mine: false,
		give: owned(give[0], give[1], 0, 1),
		want_card_id: want && want.startsWith('p') ? want : null,
		want_tier: want && !want.startsWith('p') ? (want as Tier) : null,
		topup,
		at: now() - ago
	});
	state.listings ??= [
		other('l16', 'an***a', ['p1-07', 'r'], 'p1-01', 15 * MIN),
		other('l6', 'sun.k', ['p1-01', 'n'], 'p1-08', 23 * MIN, { fen: 500, by: 'owner' }),
		other('l7', 'ta***e', ['p1-14', 'ur'], 'p1-13', 40 * MIN, { fen: 5000, by: 'taker' }),
		other('l17', 'xu***e', ['p1-02', 'n'], 'p1-11', 50 * MIN),
		other('l1', 'wu***n', ['p1-12', 'ssr'], 'sr', HOUR, { fen: 2000, by: 'taker' }),
		other('l2', 'ch***9', ['p1-09', 'r'], 'p1-02', 1.5 * HOUR),
		other('l8', 'ji***n', ['p1-15', 'ur'], 'sr', 2 * HOUR, { fen: 4500, by: 'taker' }),
		other('l3', 'mo***i', ['p1-05', 'n'], 'n', 2.5 * HOUR),
		other('l15', 'gu***o', ['p1-04', 'n'], null, 3 * HOUR),
		other('l9', 'pe***r', ['p1-10', 'sr'], 'p1-07', 5 * HOUR),
		other('l12', 'su***y', ['p1-03', 'n'], 'p1-04', 7 * HOUR),
		other('l5', 'xiaoyu', ['p1-01', 'n'], 'n', 9 * HOUR),
		other('l13', 'li***u', ['p1-08', 'r'], 'r', 12 * HOUR),
		other('l10', 'fa***g', ['p1-06', 'n'], 'p1-15', DAY),
		other('l11', 'ro***a', ['p1-15', 'ur'], 'ur', 2 * DAY, { fen: 3000, by: 'owner' }),
		{ id: 'l4', owner: ME, mine: true, give: collection[8], want_card_id: 'p1-12', want_tier: null, topup: { fen: 1000, by: 'owner' }, at: now() - 12_000_000 },
		{ id: 'l14', owner: ME, mine: true, give: collection[5], want_card_id: null, want_tier: 'sr', at: now() - 26 * HOUR }
	];
	return state.listings;
}

function recent(): EggTradeEvent[] {
	const swap = (id: string, who: string, gave: string, got: string, ago: number, extra: Partial<EggTradeEvent> = {}): EggTradeEvent => ({ id, who, gave, got, at: now() - ago, ...extra });
	hall.recent ??= [
		swap('r1', 'an***a', 'p1-02', 'p1-01', 3 * MIN),
		swap('r2', 'sun.k', 'p1-07', 'p1-10', 12 * MIN, { topup_fen: 800 }),
		swap('r3', 'wu***n', 'p1-11', 'p1-12', 26 * MIN, { topup_fen: -1500 }),
		swap('r4', 'qi***g', 'p1-02', 'p1-06', 48 * MIN),
		swap('r5', 'he***u', 'p1-04', 'p1-09', 1.5 * HOUR, { gave_count: 2 }),
		swap('r6', 'mo***i', 'p1-13', 'p1-14', 3 * HOUR, { topup_fen: 3000 }),
		swap('r7', 'ya***o', 'p1-05', 'p1-03', 5 * HOUR),
		swap('r8', 'ch***9', 'p1-01', 'p1-08', 9 * HOUR)
	];
	return hall.recent;
}

/** A user's cards that can be swapped (定向交换), the same each time the name is looked up. */
function tradableOf(name: string): EggOwnedCard[] {
	if (name === 'empty') return [];
	let cards = hall.lookup.get(name);
	if (!cards) {
		cards = [owned('p1-12', 'ssr', 0, 3), owned('p1-04', 'n', 0, 2), owned('p1-09', 'r', 0, 2), owned('p1-13', 'ssr', 0, 1), owned('p1-06', 'n', 0, 1), owned('p1-14', 'ur', 0, 5)];
		hall.lookup.set(name, cards);
	}
	return cards;
}

/** The gateway's refusals of money on a swap (CE-X5): over the round's limit, or more than the paid balance. */
function checkTopup(topup: EggTopup | null | undefined, payer: boolean) {
	if (!topup || topup.fen <= 0) return;
	const rules = me().market_rules;
	if (rules && topup.fen > rules.topup_max_fen) throw JSON.stringify({ status: 400, code: 'cyber_egg_topup_limit', message: 'topup over limit' });
	if (payer && topup.fen > (me().balance_fen ?? 0)) throw JSON.stringify({ status: 400, code: 'cyber_egg_topup_balance', message: 'balance too low' });
}

/** Copies leave the sample collection and others come in (fresh from a swap: cooling for a day). */
function swapCopies(gone: EggOwnedCard[], got: EggOwnedCard[]): EggOwnedCard[] {
	for (const card of gone) {
		const at = collection.findIndex((item) => item.id === card.id);
		if (at >= 0) collection.splice(at, 1);
	}
	const fresh = got.map((card) => ({ ...card, from: 'trade' as const, tokens: 0, at: now(), relist_after: now() + DAY }));
	collection.unshift(...fresh);
	return fresh;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockCall<T>(method: string, path: string, body?: unknown): Promise<T> {
	await wait(120);
	const route = `${method} ${path.split('?')[0]}`;
	const answer = ((): unknown => {
		switch (route) {
			case 'GET me':
				return me();
			case `POST ${CAMPAIGN}/draw`:
				state.drawn = true;
				state.used = 0;
				return { me: me(), draw: today(), secret: null };
			case `GET ${CAMPAIGN}/live`:
				return { pool_used_tokens: 0, my_used_tokens: state.drawn ? state.used : 0 };
			case `GET ${CAMPAIGN}/key`:
				return { key: { ...key, secret: SECRET }, api_base_url: 'https://api.lynshen.org/new/v1' };
			case `POST ${CAMPAIGN}/key/rotate`:
				return { ...key, last4: 'c3d4', created_at: now(), secret: 'sk-egg-sample1111111111111111c3d4' };
			case 'GET trades':
				return trades();
			case 'GET market':
				return { listings: listings(), recent: recent(), stats: { listings: listings().length, today_trades: hall.today } };
			case 'POST market': {
				const pick = body as { give: string; want_card_id: string | null; want_tier: Tier | null; topup?: EggTopup | null };
				checkTopup(pick.topup, pick.topup?.by === 'owner');
				const card = collection.find((item) => item.id === pick.give);
				const made: EggListing = { id: `l${now()}`, owner: ME, mine: true, give: card ?? collection[0], want_card_id: pick.want_card_id, want_tier: pick.want_tier, topup: pick.topup ?? null, at: now() };
				listings().unshift(made);
				return made;
			}
			case 'POST trades': {
				const offer = body as { to: string; give: string[]; want: string[]; topup?: EggTopup | null };
				checkTopup(offer.topup, offer.topup?.by === 'from');
				const theirs = tradableOf(offer.to);
				const made: EggTrade = {
					id: `t${now()}`,
					from: ME,
					to: offer.to,
					give: collection.filter((item) => offer.give.includes(item.id)),
					want: theirs.filter((item) => offer.want.includes(item.id)),
					topup: offer.topup ?? null,
					state: 'open',
					at: now()
				};
				trades().outgoing.unshift(made);
				return made;
			}
		}
		const user = /^GET trades\/user\/([^/]+)$/.exec(route);
		if (user) {
			const name = decodeURIComponent(user[1]);
			if (name === 'nobody') throw JSON.stringify({ status: 404, code: null, message: 'User not found' });
			return { username: name, cards: tradableOf(name) };
		}
		const swap = /^POST trades\/([^/]+)\/(accept|decline|cancel)$/.exec(route);
		if (swap) {
			const all = trades();
			const trade = [...all.incoming, ...all.outgoing].find((item) => item.id === swap[1]) as EggTrade | undefined;
			if (!trade) throw JSON.stringify({ status: 404, code: null, message: 'Not Found' });
			trade.state = swap[2] === 'accept' ? 'accepted' : swap[2] === 'decline' ? 'declined' : 'cancelled';
			if (swap[2] === 'accept') {
				// Sent to me: I give what they want and get what they give.
				swapCopies(trade.want, trade.give);
				hall.today += 1;
			}
			all.incoming = all.incoming.filter((item) => item !== trade);
			all.outgoing = all.outgoing.filter((item) => item !== trade);
			all.done.unshift(trade);
			return trade;
		}
		const stall = /^POST market\/([^/]+)\/(take|cancel)$/.exec(route);
		if (stall) {
			const listing = listings().find((item) => item.id === stall[1]);
			if (!listing) throw JSON.stringify({ status: 404, code: null, message: 'Not Found' });
			if (stall[2] === 'take') {
				checkTopup(listing.topup, listing.topup?.by === 'taker');
				const gave = collection.find((item) => item.id === (body as { give: string }).give);
				const [received] = swapCopies(gave ? [gave] : [], [listing.give]);
				const fen = listing.topup?.fen ?? 0;
				recent().unshift({ id: `r${now()}`, who: ME, gave: gave?.card_id ?? listing.give.card_id, got: received.card_id, topup_fen: listing.topup?.by === 'taker' ? fen : -fen, at: now() });
				hall.today += 1;
				state.listings = listings().filter((item) => item.id !== stall[1]);
				return { received };
			}
			state.listings = listings().filter((item) => item.id !== stall[1]);
			return { ok: true };
		}
		throw JSON.stringify({ status: 404, code: null, message: 'Not Found' });
	})();
	return answer as T;
}
