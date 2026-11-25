// The 赛博鸡蛋 campaign's client API (gateway `/api/client/cyber-egg/*`, signed with this computer's
// device key through `monoize_cyber_egg`). Token amounts are integers, money integer CNY fen, times
// Unix ms. The shapes follow the gateway's web edition (frontend/src/lib/cyber-egg-api.ts, G94); the
// client contract is ~/lynshen-wt/deliverables/网关/赛博鸡蛋/客户端API.md.
//
// With `localStorage['lynshen-cyber-egg-mock']` set the answers come from `mock.ts` (the browser
// fixtures answer `monoize_cyber_egg` with it too).
import { invoke } from '@tauri-apps/api/core';
import { GatewayError } from '$lib/protocol';
import { t } from '$lib/i18n';
import type { CardTier } from './card/tiers';

export type Tier = CardTier;

/** One round (一期) of the campaign. */
export interface EggCampaign {
	id: string;
	name: string;
	/** The models the campaign key and the 赛博鸡蛋 group can call. */
	models: string[];
	/** Which day of the round today is, how many it has, and when today's tokens lapse (00:00 Beijing). */
	day: { index: number; count: number; resets_at: number };
	starts_at: number;
	ends_at: number;
	state: 'scheduled' | 'running' | 'paused' | 'ended';
}

/** One card a user owns: `card_id` names the design (`p1-08`), `serial` this copy. */
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
	/** In the pack's 典藏: kept in the album, not tradable. */
	locked?: boolean;
	/** A copy swapped in can't be offered again before this instant. */
	relist_after?: number;
}

/** Today's draw: the card picked, the four not picked, and when its tokens lapse. */
export interface EggDraw {
	card: EggOwnedCard;
	kind?: 'daily' | 'bonus';
	others: Array<{ card_id: string; tier: Tier }>;
	expires_at: number;
}

/** The campaign key: only its ends, and the secret where the device may see it. */
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

export interface EggTierRule {
	tier: Tier;
	min_tokens: number;
	max_tokens: number;
	weight_bp: number;
}

/** `GET me`: the user's view of the running round. */
export interface EggMe {
	campaign: EggCampaign | null;
	/** none: may join; review: held for a check; refused. */
	membership: 'none' | 'joined' | 'review' | 'refused';
	/** Paused because the paid balance fell below the minimum. */
	blocked: 'low_balance' | null;
	/** Today's tokens: what today's draws gave, and what is used. */
	granted_tokens: number;
	used_tokens: number;
	today: EggDraw | null;
	/** When the next draw opens. */
	next_draw_at: number;
	pack: { period: number; name: string };
	/** Draws left until a 白银 or better is guaranteed; null when off. */
	pity_left: { sr: number | null };
	tiers: EggTierRule[];
	key: EggKey | null;
	/** The campaign endpoint the key calls (`https://api.lynshen.org/new/v1`). */
	api_base_url: string;
	/** Extra draws earned this round. */
	chances?: { available: number };
	/** Trade requests waiting for this user's answer. */
	trades_waiting: number;
}

/** `POST draw`: a pack opened on the server; nothing is drawn until a card is picked. */
export interface EggOpened {
	draw_id: string;
}

/** `POST pick`: the card picked (and the key's secret when the draw made the key). */
export interface EggPicked {
	me: EggMe;
	draw: EggDraw;
	secret: string | null;
}

export interface EggCollection {
	cards: EggOwnedCard[];
	/** The packs players can see: open, back for a rerun, or announced. */
	packs: Array<{ period: number; state: 'open' | 'rerun' | 'upcoming' }>;
}

/** A card put up in the trading hall, and what is wanted for it. */
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

/** A swap between two users. */
export interface EggTrade {
	id: string;
	from: string;
	to: string;
	/** Sent by this user (else received). */
	mine: boolean;
	give: EggOwnedCard[];
	want: EggOwnedCard[];
	state: 'open' | 'accepted' | 'declined' | 'cancelled' | 'expired';
	at: number;
}

export interface EggTrades {
	listings: EggListing[];
	trades: EggTrade[];
}

/** One call made with the campaign's tokens. */
export interface EggUsageRow {
	id: string;
	at: number;
	model: string;
	/** Uncached input + cached input + output, all in full. */
	counted_tokens: number;
	/** Where it came from: an Aogiri conversation (with its title) or the key in another tool. */
	client: 'aogiri' | 'key';
	title?: string;
}

export interface EggUsage {
	rows: EggUsageRow[];
	granted_tokens: number;
	used_tokens: number;
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

export const eggApi = {
	me: () => call<EggMe>('GET', 'me'),
	/** Opens today's pack (or an extra one). */
	draw: (bonus = false) => call<EggOpened>('POST', 'draw', { bonus }),
	/** Picks one of the five face-down cards (0–4): only now is the card drawn. */
	pick: (drawId: string, index: number) => call<EggPicked>('POST', 'pick', { draw_id: drawId, index }),
	collection: () => call<EggCollection>('GET', 'collection'),
	trades: () => call<EggTrades>('GET', 'trades'),
	/** Puts a card up in the hall. */
	list: (cardId: string, want: { card_id?: string; tier?: Tier | null }) =>
		call<EggTrades>('POST', 'trades/list', { card: cardId, want_card_id: want.card_id ?? null, want_tier: want.tier ?? null }),
	/** Takes a listing, giving one of this user's cards for it. */
	take: (listingId: string, cardId: string) => call<EggTrades>('POST', `trades/${listingId}/take`, { card: cardId }),
	/** Answers or withdraws a swap. */
	answer: (tradeId: string, action: 'accept' | 'decline' | 'cancel') => call<EggTrades>('POST', `trades/${tradeId}/${action}`),
	key: () => call<{ key: EggKey | null; api_base_url: string }>('GET', 'key'),
	/** A new key (the old one stops); the answer carries the secret. */
	rotateKey: () => call<{ key: EggKey; secret: string }>('POST', 'key'),
	usage: () => call<EggUsage>('GET', 'usage')
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
