// Sample answers of the 赛博鸡蛋 client API (CE-API-8), for the browser fixtures (`tests/browser`, `?egg`) and
// for a look at the pages before the gateway serves them (`localStorage['lynshen-cyber-egg-mock']`).
// `?egg=drawn` (and `?eggChat`) starts with today's card drawn, `?egg=none` with no round running.
import type { EggDraw, EggKey, EggListing, EggMe, EggOwnedCard, EggTierRule, EggTrade, EggTrades, Tier } from './api';

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
const mode = params.has('eggChat') ? 'drawn' : (params.get('egg') ?? '');
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
						day: { index: 4, count: 14, resets_at: nextReset() },
						per_user_cap_tokens: draw ? draw.card.tokens : 0,
						starts_at: now() - 3 * DAY,
						ends_at: now() + 10 * DAY,
						state: 'running'
					},
		checks: [
			{ key: 'funds', ok: true },
			{ key: 'account_age', ok: true },
			{ key: 'one_per_person', ok: true }
		],
		membership: 'joined',
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
		chances: { enabled: true, available: 0 },
		banned: null,
		paused: null
	};
}

function trades(): EggTrades {
	state.trades ??= {
		incoming: [
			{ id: 't1', from: 'ya***o', to: 'lin_dev', give: [owned('p1-06', 'n', 0, 2)], want: [collection[2]], state: 'open', at: now() - 1_800_000 },
			{ id: 't2', from: 'qi***g', to: 'lin_dev', give: [owned('p1-09', 'r', 0, 1)], want: [collection[8]], state: 'open', at: now() - 4_000_000 }
		],
		outgoing: [],
		done: [{ id: 't3', from: 'lin_dev', to: 'he***u', give: [collection[3]], want: [owned('p1-14', 'ur', 0, 4)], state: 'declined', at: now() - DAY }]
	};
	return state.trades;
}

function listings(): EggListing[] {
	state.listings ??= [
		{ id: 'l1', owner: 'wu***n', mine: false, give: owned('p1-12', 'ssr', 0, 2), want_card_id: null, want_tier: 'sr', at: now() - 3_600_000 },
		{ id: 'l2', owner: 'ch***9', mine: false, give: owned('p1-09', 'r', 0, 1), want_card_id: 'p1-02', want_tier: null, at: now() - 5_400_000 },
		{ id: 'l3', owner: 'mo***i', mine: false, give: owned('p1-05', 'n', 0, 1), want_card_id: null, want_tier: 'n', at: now() - 9_000_000 },
		{ id: 'l4', owner: 'lin_dev', mine: true, give: collection[8], want_card_id: 'p1-12', want_tier: null, at: now() - 12_000_000 }
	];
	return state.listings;
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
				return { listings: listings() };
			case 'POST market': {
				const pick = body as { give: string; want_card_id: string | null; want_tier: Tier | null };
				const card = collection.find((item) => item.id === pick.give);
				const made: EggListing = { id: `l${now()}`, owner: 'lin_dev', mine: true, give: card ?? collection[0], want_card_id: pick.want_card_id, want_tier: pick.want_tier, at: now() };
				listings().unshift(made);
				return made;
			}
		}
		const swap = /^POST trades\/([^/]+)\/(accept|decline|cancel)$/.exec(route);
		if (swap) {
			const all = trades();
			const trade = [...all.incoming, ...all.outgoing].find((item) => item.id === swap[1]) as EggTrade | undefined;
			if (!trade) throw JSON.stringify({ status: 404, code: null, message: 'Not Found' });
			trade.state = swap[2] === 'accept' ? 'accepted' : swap[2] === 'decline' ? 'declined' : 'cancelled';
			all.incoming = all.incoming.filter((item) => item !== trade);
			all.outgoing = all.outgoing.filter((item) => item !== trade);
			all.done.unshift(trade);
			return trade;
		}
		const hall = /^POST market\/([^/]+)\/(take|cancel)$/.exec(route);
		if (hall) {
			const listing = listings().find((item) => item.id === hall[1]);
			state.listings = listings().filter((item) => item.id !== hall[1]);
			return hall[2] === 'take' ? { received: listing?.give } : { ok: true };
		}
		throw JSON.stringify({ status: 404, code: null, message: 'Not Found' });
	})();
	return answer as T;
}
