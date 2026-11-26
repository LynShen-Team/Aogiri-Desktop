// The 赛博鸡蛋 campaign for the Aogiri clients (gateway spec CE-API-8): the player endpoints under
// `/api/desktop/oauth/cyber-egg`, signed with this computer's device key (`monoize_cyber_egg`). Same handlers,
// bodies and answers as the web page's (CE-API-1..5, frontend/src/lib/cyber-egg-api.ts); only the fields the
// desktop reads are typed here. Token amounts are integers, money integer CNY fen, times Unix ms. Cards are
// named by `card_id` (`p1-08`); their pictures come from the shared card-art bundle (art.ts, CE-API-9).
//
// With `localStorage['lynshen-cyber-egg-mock']` set the answers come from `mock.ts` (the browser fixtures
// answer `monoize_cyber_egg` with it too).
import { invoke } from '@tauri-apps/api/core';
import { GatewayError } from '$lib/protocol';
import { t } from '$lib/i18n';
import type { Tier } from './art';

export type { Tier };

/** CE-T1: one round (一期); its pool is daily. */
export interface EggCampaign {
	id: string;
	name: string;
	/** The models the campaign key and the 赛博鸡蛋 group can call. */
	models: string[];
	/** Which day of the round today is, how many it has, and when today's tokens lapse (00:00 Beijing). */
	day: { index: number; count: number; resets_at: number };
	/** For a player: today's grant, the tokens of today's draws (daily and extra). */
	per_user_cap_tokens: number;
	/** CE-P1: the daily pool and what today's draws took of it. */
	pool_tokens?: number;
	pool_used_tokens?: number;
	starts_at: number;
	ends_at: number;
	state: 'scheduled' | 'running' | 'paused' | 'ended';
}

/** CE-E1..E3: one requirement with the user's own numbers. */
export interface EggCheck {
	key: 'funds' | 'account_age' | 'one_per_person';
	ok: boolean;
	balance_fen?: number;
	min_balance_fen?: number;
	/** A plan that counts instead of the balance (null: none does), and the user's own. */
	min_plan?: string | null;
	plan?: string | null;
	account_days?: number;
	min_account_days?: number;
	eligible_at?: number;
}

/** CE-C5: one card a user owns. */
export interface EggOwnedCard {
	id: string;
	card_id: string;
	period: number;
	tier: Tier;
	serial: number;
	/** The tokens its draw gave (0 for a card received in a trade). */
	tokens: number;
	at: number;
	from: 'draw' | 'trade';
	/** A copy swapped in can't be offered again before this instant. */
	relist_after?: number;
	/** In the pack's 典藏: kept in the album, not tradable. */
	locked?: boolean;
}

/** CE-R1: a draw: the card picked, the four not picked, and when its tokens lapse. */
export interface EggDraw {
	card: EggOwnedCard;
	kind?: 'daily' | 'bonus';
	others: Array<{ card_id: string; tier: Tier }>;
	expires_at: number;
	/** CE-D6: the guarantee that lifted this draw (if any), and whose: the player's own, the server's, or both. */
	pity?: 'sr' | 'ssr' | 'ur' | null;
	pity_by?: 'personal' | 'shared' | 'both' | null;
}

/** CE-K: the campaign key; the secret only where the device may see it (CE-K7). */
export interface EggKey {
	id: string;
	prefix: string;
	last4: string;
	created_at: number;
	secret?: string;
	rotations_left: number;
	rotation_limit: number;
	/** Stopped because it was used from too many places at once; a new key works. */
	suspended: 'leak' | null;
}

export interface EggUsageRow {
	id: string;
	at: number;
	model: string;
	input_tokens: number;
	cached_input_tokens: number;
	output_tokens: number;
	/** CE-M1: uncached input + cached input + output, all in full. */
	counted_tokens: number;
}

/** CE-D6: the round's guarantees: draws to a 白银 / 鎏金 / 流光 (0 = off), the duplicate guard, the server's lift. */
export interface EggPity {
	sr_at: number;
	ssr_at: number;
	ur_at: number;
	dupe_guard: boolean;
	shared_sr_every?: number;
}

export interface EggTierRule {
	tier: Tier;
	min_tokens: number;
	max_tokens: number;
	weight_bp: number;
}

/** CE-API-1 `GET /me`: the user's view of the current round. */
export interface EggMe {
	campaign: EggCampaign | null;
	checks: EggCheck[];
	/** none: may join; review: held for a check (CE-A3); refused. */
	membership: 'none' | 'joined' | 'review' | 'refused';
	/** CE-E4: paused because the paid balance fell below the minimum. */
	blocked: 'low_balance' | null;
	/** Today's tokens used (every draw of the day counts in the grant). */
	my_used_tokens: number;
	key: EggKey | null;
	/** CE-K5: the campaign endpoint. */
	api_base_url: string;
	/** Recent calls with the campaign's tokens. */
	usage: EggUsageRow[];
	tiers: EggTierRule[];
	/** CE-D6: the guarantees (0 = off). Every `shared_sr_every`-th draw on the whole server is lifted to 白银+. */
	pity?: EggPity;
	/** CE-D6: draws left to each guarantee (the guaranteed one counted); null when off. */
	pity_left: { sr: number | null; ssr: number | null; ur: number | null };
	pack: { period: number; name: string };
	today: EggDraw | null;
	next_draw_at: number;
	/** Every card the user owns, newest first. */
	collection: EggOwnedCard[];
	packs: Array<{ period: number; state: 'open' | 'rerun' | 'upcoming' }>;
	/** CE-H3: extra draws this round. */
	chances?: { enabled?: boolean; available: number; earned?: number; used?: number } | null;
	/** CE-H2: today's extra draws, oldest first. */
	today_bonus?: EggDraw[];
	/** CE-S1: the 集齐 reward of each open pack (a 典藏 card, cash and gift balance), once per player. */
	sets?: EggSet[];
	/** CE-X5: the user's paid balance (what a top-up can come from) and the market's money rules. */
	balance_fen?: number;
	market_rules?: EggMarketRules;
	banned?: { reason: 'refund'; at: number } | null;
	paused?: { reason: 'invite_refund'; at: number } | null;
}

/** CE-S1: a pack's 集齐 reward and this user's claim of it. */
export interface EggSet {
	period: number;
	bonus_cash_fen: number;
	bonus_gift_fen: number;
	completed: number;
	claimed: { at: number; rank: number; serial: number; cash_fen: number; gift_fen: number; cash?: { state: 'held' | 'pending' | 'paid' | 'refused' | 'balance'; at: number | null } } | null;
	/** First come, first served: how many in all, how many left. */
	cap: number;
	left: number;
}

/** CE-X5: money added to a swap to even it out (paid balance, fen), and who pays it: in a listing the one who put the
 *  card up (`owner`) or the one who takes it (`taker`); in a direct swap the one who sent it (`from`) or the one it
 *  was sent to (`to`). */
export interface EggTopup {
	fen: number;
	by: 'owner' | 'taker' | 'from' | 'to';
}

/** CE-X5: the market's money rules, as the round sets them. */
export interface EggMarketRules {
	topup_enabled: boolean;
	topup_max_fen: number;
	/** Kept by the platform from what the receiving side gets, in thousandths. */
	topup_fee_permille: number;
}

/** CE-X2: a swap between two users. */
export interface EggTrade {
	id: string;
	from: string;
	to: string;
	give: EggOwnedCard[];
	want: EggOwnedCard[];
	topup?: EggTopup | null;
	state: 'open' | 'accepted' | 'declined' | 'cancelled' | 'expired';
	at: number;
}

/** CE-X4: a swap done in the market (最近成交). */
export interface EggTradeEvent {
	id: string;
	at: number;
	who: string;
	gave: string;
	got: string;
	/** Positive when `who` paid it, negative when `who` received it (fen). */
	topup_fen?: number;
	gave_count?: number;
	got_count?: number;
}

/** CE-X4: a card put up in the hall, and what is wanted for it. */
export interface EggListing {
	id: string;
	owner: string;
	mine: boolean;
	give: EggOwnedCard;
	want_card_id: string | null;
	/** With no `want_card_id`: any card of this tier (null: any card). */
	want_tier: Tier | null;
	topup?: EggTopup | null;
	at: number;
}

export interface EggTrades {
	incoming: EggTrade[];
	outgoing: EggTrade[];
	done: EggTrade[];
}

const MOCK_KEY = 'lynshen-cyber-egg-mock';

function mockOn(): boolean {
	try {
		return localStorage.getItem(MOCK_KEY) !== null;
	} catch {
		return false;
	}
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
	try {
		if (mockOn()) {
			const { mockCall } = await import('./mock');
			return await mockCall<T>(method, path, body);
		}
		// Outside the app (the phone page, the web chat) there is no device key.
		if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) throw JSON.stringify({ status: null, code: 'not_signed_in', message: 'not in the app' });
		return await invoke<T>('monoize_cyber_egg', { method, path, body: body ?? null });
	} catch (error) {
		const raw = String(error);
		let parsed: { message?: unknown; code?: unknown; status?: unknown } | null = null;
		try {
			parsed = JSON.parse(raw);
		} catch {
			parsed = null;
		}
		if (parsed && typeof parsed === 'object')
			throw new GatewayError(
				String(parsed.message ?? raw),
				typeof parsed.code === 'string' ? parsed.code : null,
				typeof parsed.status === 'number' ? parsed.status : null
			);
		throw new GatewayError(raw, null, null);
	}
}

const id = (value: string) => encodeURIComponent(value);

export const eggApi = {
	me: () => call<EggMe>('GET', 'me'),
	/** CE-R1: picks one of the five face-down cards (0–4); only now does the server draw. A first draw joins. */
	draw: (campaignId: string, pick: number, bonus = false) =>
		call<{ me: EggMe; draw: EggDraw; secret: string | null }>('POST', `${id(campaignId)}/draw`, bonus ? { pick, bonus } : { pick }),
	/** CE-API-3: the pool and this user's use now (`after`: the last `seq` seen). */
	live: (campaignId: string, after?: number) =>
		call<{ seq?: number; pool_used_tokens: number; my_used_tokens: number }>('GET', `${id(campaignId)}/live${after ? `?after=${after}` : ''}`),
	/** CE-S2: the 典藏 card and the set's reward, once the pack is complete. */
	claimSet: (period: number) => call<{ me: EggMe; set: EggSet }>('POST', `sets/${period}/claim`),
	/** CE-K7: the working key in full (no secret while it is stopped for a leak). */
	key: (campaignId: string) => call<{ key: EggKey | null; api_base_url: string }>('GET', `${id(campaignId)}/key`),
	/** A new key (the old one stops at once), with its secret. */
	rotateKey: (campaignId: string) => call<EggKey>('POST', `${id(campaignId)}/key/rotate`),
	trades: () => call<EggTrades>('GET', 'trades'),
	answer: (tradeId: string, action: 'accept' | 'decline' | 'cancel') => call<EggTrade>('POST', `trades/${id(tradeId)}/${action}`),
	market: () => call<{ listings: EggListing[]; recent?: EggTradeEvent[]; stats?: { listings: number; today_trades: number } }>('GET', 'market'),
	/** A user's cards that can be swapped (定向交换). */
	tradableOf: (username: string) => call<{ username: string; cards: EggOwnedCard[] }>('GET', `trades/user/${id(username)}`),
	/** A direct swap sent to `to`: copies given and wanted, money on top (`by`: from | to). */
	offerTrade: (to: string, give: string[], want: string[], topup: EggTopup | null = null) => call<EggTrade>('POST', 'trades', { to, give, want, topup }),
	/** Puts a card up in the hall. */
	list: (give: string, want: { card_id?: string | null; tier?: Tier | null }, topup: EggTopup | null = null) =>
		call<EggListing>('POST', 'market', { give, want_card_id: want.card_id ?? null, want_tier: want.tier ?? null, topup }),
	/** Takes a listing, giving one of this user's cards for it. */
	take: (listingId: string, give: string) => call<{ received: EggOwnedCard }>('POST', `market/${id(listingId)}/take`, { give }),
	unlist: (listingId: string) => call<{ ok: true }>('POST', `market/${id(listingId)}/cancel`)
};

/** What a refusal says to the user. */
/** The campaign's own refusals (the web's CYBER_EGG_ERRORS); each has its text under egg.error.codes. */
const EGG_ERRORS = new Set([
	'cyber_egg_not_running',
	'cyber_egg_not_eligible',
	'cyber_egg_linked',
	'cyber_egg_already_joined',
	'cyber_egg_pool_empty',
	'cyber_egg_cap_reached',
	'cyber_egg_prepaid_insufficient',
	'cyber_egg_rotation_limit',
	'cyber_egg_key_leaked',
	'cyber_egg_set_incomplete',
	'cyber_egg_set_claimed',
	'cyber_egg_card_locked',
	'cyber_egg_topup_disabled',
	'cyber_egg_topup_limit',
	'cyber_egg_topup_balance',
	'cyber_egg_set_sold_out',
	'cyber_egg_no_chance',
	'cyber_egg_banned',
	'cyber_egg_paused_refund',
	'cyber_egg_trade_not_eligible',
	'cyber_egg_trade_linked',
	'cyber_egg_trade_rare_limit',
	'cyber_egg_card_cooling',
	'cyber_egg_model_unavailable'
]);

export function eggErrorText(error: unknown): string {
	if (error instanceof GatewayError) {
		if (error.code && EGG_ERRORS.has(error.code)) return t(`egg.error.codes.${error.code}`);
		if (error.code === 'not_signed_in' || error.status === 401) return t('egg.error.signIn');
		if (error.status === 429) return t('egg.error.busy');
		if (error.status === null) return t('egg.error.network');
		return error.message || t('egg.error.generic');
	}
	return error instanceof Error ? error.message : String(error);
}
