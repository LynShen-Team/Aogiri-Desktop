// The engine connection's sounds: `disconnected` once the daemon has stayed
// out of reach for a few seconds (a blip, or the Mac waking, says nothing),
// then `connected` when it is back. The first connection at start is silent.

export type LinkStatus = 'off' | 'connecting' | 'on' | 'unreachable';

/** How long the daemon stays out of reach before it is heard. */
export const LINK_GRACE_MS = 5000;

export class LinkSounds {
	#wasOn = false;
	#lost = false;
	#timer: ReturnType<typeof setTimeout> | null = null;
	#status: LinkStatus = 'off';

	#play: (kind: 'connected' | 'disconnected') => void;

	constructor(play: (kind: 'connected' | 'disconnected') => void) {
		this.#play = play;
	}

	update(status: LinkStatus) {
		this.#status = status;
		if (status === 'on') {
			this.#clear();
			if (this.#lost) this.#play('connected');
			this.#lost = false;
			this.#wasOn = true;
		} else if (status === 'unreachable' && this.#wasOn && !this.#lost && !this.#timer) {
			this.#timer = setTimeout(() => {
				this.#timer = null;
				if (this.#status === 'on' || this.#status === 'off') return;
				this.#lost = true;
				this.#play('disconnected');
			}, LINK_GRACE_MS);
		} else if (status === 'off') {
			// Stopped on purpose (sign-out, quitting): nothing to hear.
			this.#clear();
			this.#wasOn = false;
			this.#lost = false;
		}
	}

	dispose() {
		this.#clear();
	}

	#clear() {
		if (this.#timer) clearTimeout(this.#timer);
		this.#timer = null;
	}
}
