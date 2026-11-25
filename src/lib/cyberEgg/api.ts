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
	/** CE-D6: draws left to each guarantee (the guaranteed one counted); null when off. */
	pity_left: { sr: number | null; ssr: number | null; ur: number | null };
	pack: { period: number; name: string };
	today: EggDraw | null;
	next_draw_at: number;
	/** Every card the user owns, newest first. */
	collection: EggOwnedCard[];
	packs: Array<{ period: number; state: 'open' | 'rerun' | 'upcoming' }>;
	/** CE-H3: extra draws this round. */
	chances?: { enabled?: boolean; available: number } | null;
	banned?: { reason: 'refund'; at: number } | null;
	paused?: { reason: 'invite_refund'; at: number } | null;
}

/** CE-X2: a swap between two users. */
export interface EggTrade {
	id: string;
	from: string;
	to: string;
	give: EggOwnedCard[];
	want: EggOwnedCard[];
	state: 'open' | 'accepted' | 'declined' | 'cancelled' | 'expired';
	at: number;
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
	live: (campaignId: string) => call<{ pool_used_tokens: number; my_used_tokens: number }>('GET', `${id(campaignId)}/live`),
	/** CE-K7: the working key in full (no secret while it is stopped for a leak). */
	key: (campaignId: string) => call<{ key: EggKey | null; api_base_url: string }>('GET', `${id(campaignId)}/key`),
	/** A new key (the old one stops at once), with its secret. */
	rotateKey: (campaignId: string) => call<EggKey>('POST', `${id(campaignId)}/key/rotate`),
	trades: () => call<EggTrades>('GET', 'trades'),
	answer: (tradeId: string, action: 'accept' | 'decline' | 'cancel') => call<EggTrade>('POST', `trades/${id(tradeId)}/${action}`),
	market: () => call<{ listings: EggListing[] }>('GET', 'market'),
	/** Puts a card up in the hall. */
	list: (give: string, want: { card_id?: string | null; tier?: Tier | null }) =>
		call<EggListing>('POST', 'market', { give, want_card_id: want.card_id ?? null, want_tier: want.tier ?? null, topup: null }),
	/** Takes a listing, giving one of this user's cards for it. */
	take: (listingId: string, give: string) => call<{ received: EggOwnedCard }>('POST', `market/${id(listingId)}/take`, { give }),
	unlist: (listingId: string) => call<{ ok: true }>('POST', `market/${id(listingId)}/cancel`)
};

/** What a refusal says to the user. */
export function eggErrorText(error: unknown): string {
	if (error instanceof GatewayError) {
		const known: Record<string, string> = {
			not_signed_in: 'egg.error.signIn',
			already_drawn: 'egg.error.drawn',
			pool_empty: 'egg.error.pool',
			campaign_ended: 'egg.error.ended',
			low_balance: 'egg.error.balance',
			rate_limited: 'egg.error.busy'
		};
		if (error.code && known[error.code]) return t(known[error.code]);
		if (error.status === null) return t('egg.error.network');
		return error.message || t('egg.error.generic');
	}
	return error instanceof Error ? error.message : String(error);
}
