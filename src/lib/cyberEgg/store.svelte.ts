// The 赛博鸡蛋 state the app shares: the round and today's tokens (`me`), read when the account is
// signed in and again on focus; the campaign key's secret while the app runs; and the choice to show
// the 「赛博鸡蛋」 group in the model menu.
import { GatewayError } from '$lib/protocol';
import { eggApi, type EggCollection, type EggMe, type EggOwnedCard } from './api';
import { usedShare } from './format';

const PICKER_KEY = 'lynshen-cyber-egg-picker';
/** Read again at most this often on focus. */
const STALE_MS = 60_000;

function readPicker(): boolean {
	try {
		return localStorage.getItem(PICKER_KEY) !== 'off';
	} catch {
		return true;
	}
}

export class EggStore {
	me = $state<EggMe | null>(null);
	/** off: no round, or a gateway without the campaign API (the entry hides). */
	status = $state<'idle' | 'loading' | 'ready' | 'off' | 'error'>('idle');
	error = $state<string | null>(null);
	/** Every card the user owns, newest first (the album and the nav's count). */
	cards = $state<EggOwnedCard[]>([]);
	packs = $state<EggCollection['packs']>([]);
	#cardsAt = 0;
	/** The campaign key in full, from a draw, a rotation or `GET key` (memory only). */
	secret = $state<string | null>(null);
	/** Show the 「赛博鸡蛋」 group in the model menu. */
	inPicker = $state(readPicker());
	/** A clock for the countdowns (every 30 s while something reads it). */
	now = $state(Date.now());
	#readAt = 0;
	#reading: Promise<void> | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			setInterval(() => (this.now = Date.now()), 30_000);
			window.addEventListener('focus', () => {
				if (this.status === 'ready' && Date.now() - this.#readAt > STALE_MS) void this.refresh();
			});
		}
	}

	/** A round runs and this account is in it. */
	get live(): boolean {
		return this.status === 'ready' && !!this.me?.campaign && this.me.campaign.state === 'running';
	}
	get canDraw(): boolean {
		return this.live && !!this.me && !this.me.today && this.me.membership !== 'review' && this.me.membership !== 'refused' && !this.me.blocked;
	}
	get granted(): number {
		return this.me?.granted_tokens ?? 0;
	}
	get used(): number {
		return this.me?.used_tokens ?? 0;
	}
	get remaining(): number {
		return Math.max(0, this.granted - this.used);
	}
	get share(): number {
		return usedShare(this.granted, this.used);
	}
	get resetsAt(): number {
		return this.me?.campaign?.day.resets_at ?? this.me?.today?.expires_at ?? 0;
	}
	get models(): string[] {
		return this.me?.campaign?.models ?? [];
	}
	/** The group can carry a conversation: a round runs, tokens are left, the key is known. */
	get usable(): boolean {
		return this.live && this.remaining > 0 && !this.me?.blocked && this.me?.key?.suspended == null;
	}

	setInPicker(on: boolean) {
		this.inPicker = on;
		try {
			localStorage.setItem(PICKER_KEY, on ? 'on' : 'off');
		} catch {
			/* kept for this run only */
		}
	}

	/** Reads `me` again (one read at a time). */
	refresh(): Promise<void> {
		this.#reading ??= (async () => {
			if (this.status !== 'ready') this.status = 'loading';
			try {
				this.me = await eggApi.me();
				this.status = 'ready';
				this.error = null;
				this.#readAt = Date.now();
			} catch (error) {
				// A gateway without the campaign API, or a signed-out app: no entry.
				if (error instanceof GatewayError && (error.status === 404 || error.code === 'not_signed_in')) {
					this.status = 'off';
					this.me = null;
				} else {
					this.status = this.me ? 'ready' : 'error';
					this.error = error instanceof Error ? error.message : String(error);
				}
			} finally {
				this.#reading = null;
			}
		})();
		return this.#reading;
	}

	/** Reads the album (at most once a minute unless `force`). */
	async loadCards(force = false) {
		if (!force && Date.now() - this.#cardsAt < STALE_MS) return;
		this.#cardsAt = Date.now();
		try {
			const answer = await eggApi.collection();
			this.cards = answer.cards;
			this.packs = answer.packs;
		} catch {
			this.#cardsAt = 0;
		}
	}

	/** The key in full for a conversation that uses the campaign: kept, or asked of the gateway. */
	async keySecret(): Promise<string | null> {
		if (this.secret) return this.secret;
		const answer = await eggApi.key();
		if (answer.key?.secret) this.secret = answer.key.secret;
		return this.secret;
	}

	/** Signed out: forget everything of the account. */
	reset() {
		this.me = null;
		this.secret = null;
		this.status = 'idle';
	}
}

export const egg = new EggStore();
