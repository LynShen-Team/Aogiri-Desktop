// Sample answers of the 赛博鸡蛋 client API, for the browser fixtures (`tests/browser`, `?egg`) and for a
// look at the pages before the gateway serves them (`localStorage['lynshen-cyber-egg-mock']`).
// `?egg=drawn` (and `?eggChat`) starts with today's card drawn, `?egg=none` with no round running.
import type { EggCollection, EggDraw, EggKey, EggMe, EggOwnedCard, EggTrades, EggUsage, Tier } from './api';
import { DEFAULT_TIER_RULES } from './card/tiers';

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
// A conversation on the tokens (?eggChat) has drawn today.
const mode = params.has('eggChat') ? 'drawn' : (params.get('egg') ?? '');

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

const state = {
	drawn: mode === 'drawn',
	used: 17_820_000,
	opened: null as string | null,
	trades: null as EggTrades | null
};

function today(): EggDraw | null {
	return state.drawn ? { ...TODAY, expires_at: nextReset() } : null;
}

function me(): EggMe {
	const draw = today();
	return {
		campaign:
			mode === 'none'
				? null
				: {
						id: 'r1',
						name: '机器之心',
						models: ['deepseek-v4.1-flash', 'glm-5.3-flash', 'qwen-3.6-plus'],
						day: { index: 4, count: 14, resets_at: nextReset() },
						starts_at: now() - 3 * DAY,
						ends_at: now() + 10 * DAY,
						state: 'running'
					},
		membership: 'joined',
		blocked: null,
		granted_tokens: draw ? draw.card.tokens : 0,
		used_tokens: draw ? state.used : 0,
		today: draw,
		next_draw_at: draw ? nextReset() : now(),
		pack: { period: 1, name: '机器之心' },
		pity_left: { sr: 3 },
		tiers: DEFAULT_TIER_RULES,
		key,
		api_base_url: 'https://api.lynshen.org/new/v1',
		chances: { available: 0 },
		trades_waiting: 2
	};
}

function trades(): EggTrades {
	state.trades ??= {
		listings: [
			{ id: 'l1', owner: 'wu***n', mine: false, give: owned('p1-12', 'ssr', 0, 2), want_card_id: null, want_tier: 'sr', at: now() - 3_600_000 },
			{ id: 'l2', owner: 'ch***9', mine: false, give: owned('p1-09', 'r', 0, 1), want_card_id: 'p1-02', want_tier: null, at: now() - 5_400_000 },
			{ id: 'l3', owner: 'mo***i', mine: false, give: owned('p1-05', 'n', 0, 1), want_card_id: null, want_tier: 'n', at: now() - 9_000_000 },
			{ id: 'l4', owner: 'lin_dev', mine: true, give: collection[8], want_card_id: 'p1-12', want_tier: null, at: now() - 12_000_000 }
		],
		trades: [
			{ id: 't1', from: 'ya***o', to: 'lin_dev', mine: false, give: [owned('p1-06', 'n', 0, 2)], want: [collection[2]], state: 'open', at: now() - 1_800_000 },
			{ id: 't2', from: 'qi***g', to: 'lin_dev', mine: false, give: [owned('p1-09', 'r', 0, 1)], want: [collection[8]], state: 'open', at: now() - 4_000_000 },
			{ id: 't3', from: 'lin_dev', to: 'he***u', mine: true, give: [collection[3]], want: [owned('p1-14', 'ur', 0, 4)], state: 'declined', at: now() - DAY }
		]
	};
	return state.trades;
}

function usage(): EggUsage {
	const at = (h: number, m: number) => {
		const d = new Date();
		d.setHours(h, m, 0, 0);
		return d.getTime();
	};
	const rows = state.drawn
		? [
				{ id: 'u1', at: at(14, 32), model: 'deepseek-v4.1-flash', counted_tokens: 182_400, client: 'aogiri' as const, title: '窗口磨砂默认关闭' },
				{ id: 'u2', at: at(13, 58), model: 'deepseek-v4.1-flash', counted_tokens: 96_100, client: 'aogiri' as const, title: '对话宽度跟随窗口' },
				{ id: 'u3', at: at(11, 20), model: 'glm-5.3-flash', counted_tokens: 1_204_000, client: 'key' as const },
				{ id: 'u4', at: at(10, 5), model: 'deepseek-v4.1-flash', counted_tokens: 16_337_500, client: 'key' as const }
			]
		: [];
	return { rows, granted_tokens: state.drawn ? TODAY.card.tokens : 0, used_tokens: state.drawn ? state.used : 0 };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockCall<T>(method: string, path: string, body?: unknown): Promise<T> {
	await wait(120);
	const route = `${method} ${path.split('?')[0]}`;
	const answer = ((): unknown => {
		switch (route) {
			case 'GET me':
				return me();
			case 'POST draw':
				state.opened = `d${now()}`;
				return { draw_id: state.opened };
			case 'POST pick': {
				state.drawn = true;
				state.opened = null;
				state.used = 0;
				return { me: me(), draw: today(), secret: null };
			}
			case 'GET collection': {
				const cards = state.drawn ? [TODAY.card, ...collection] : collection;
				return { cards, packs: [{ period: 1, state: 'open' }, { period: 2, state: 'upcoming' }, { period: 3, state: 'upcoming' }] } satisfies EggCollection;
			}
			case 'GET trades':
				return trades();
			case 'GET key':
				return { key: { ...key, secret: SECRET }, api_base_url: 'https://api.lynshen.org/new/v1' };
			case 'POST key':
				return { key: { ...key, last4: 'c3d4', created_at: now() }, secret: 'sk-egg-sample1111111111111111c3d4' };
			case 'GET usage':
				return usage();
		}
		const answer = /^POST trades\/([^/]+)\/(accept|decline|cancel|take)$/.exec(route);
		if (answer) {
			const all = trades();
			const trade = all.trades.find((item) => item.id === answer[1]);
			if (trade) trade.state = answer[2] === 'accept' ? 'accepted' : answer[2] === 'decline' ? 'declined' : 'cancelled';
			if (answer[2] === 'take') all.listings = all.listings.filter((item) => item.id !== answer[1]);
			return all;
		}
		if (route === 'POST trades/list') {
			const all = trades();
			const pick = body as { card: string; want_card_id: string | null; want_tier: Tier | null };
			const card = collection.find((item) => item.id === pick.card);
			if (card) all.listings.unshift({ id: `l${now()}`, owner: 'lin_dev', mine: true, give: card, want_card_id: pick.want_card_id, want_tier: pick.want_tier, at: now() });
			return all;
		}
		throw JSON.stringify({ status: 404, code: null, message: 'Not Found' });
	})();
	return answer as T;
}
