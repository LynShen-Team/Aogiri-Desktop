// The sound settings of this device: the master switch (prefs.sounds, kept
// where it always was), the volume and each event's switch (here, in their
// own key). The cyber egg's switch is the egg's own key, which its pack
// sounds read (cyberEgg/card/sound.ts; not imported: that module plays
// through play.ts, which reads these settings).

import { prefs } from '$lib/prefs.svelte';
import { DEFAULT_VOLUME, SOUND_EVENTS, soundEvent, type SoundEventId } from './events';

const KEY = 'aogiri.sounds';
/** cyberEgg/card/sound.ts's switch: "off" or anything else (on). */
const EGG_KEY = 'cyberEgg.sound';

function storage(key: string): string | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
	} catch {
		return null;
	}
}

function store(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* private mode: for this run only */
	}
}

interface Stored {
	volume?: unknown;
	/** Only the events the user switched, so a later default reaches the rest. */
	events?: Record<string, unknown>;
}

function load(): Stored {
	try {
		const raw = storage(KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : null;
		return parsed && typeof parsed === 'object' ? (parsed as Stored) : {};
	} catch {
		return {};
	}
}

class SoundSettings {
	volume = $state(DEFAULT_VOLUME);
	#events = $state<Partial<Record<SoundEventId, boolean>>>({});
	#egg = $state(true);

	constructor() {
		const s = load();
		const v = Number(s.volume);
		if (s.volume !== undefined && Number.isFinite(v)) this.volume = Math.min(1, Math.max(0, v));
		const events: Partial<Record<SoundEventId, boolean>> = {};
		for (const e of SOUND_EVENTS) {
			const on = s.events?.[e.id];
			if (typeof on === 'boolean' && e.id !== 'egg') events[e.id] = on;
		}
		this.#events = events;
		this.#egg = storage(EGG_KEY) !== 'off';
	}

	get master(): boolean {
		return prefs.sounds;
	}

	setMaster(on: boolean) {
		prefs.setFlag('sounds', on);
	}

	enabled(id: SoundEventId): boolean {
		if (id === 'egg') return this.#egg;
		return this.#events[id] ?? soundEvent(id).on;
	}

	setEnabled(id: SoundEventId, on: boolean) {
		if (id === 'egg') {
			this.#egg = on;
			store(EGG_KEY, on ? 'on' : 'off');
			return;
		}
		const next = { ...this.#events };
		if (on === soundEvent(id).on) delete next[id];
		else next[id] = on;
		this.#events = next;
		this.#save();
	}

	setVolume(v: number) {
		this.volume = Math.min(1, Math.max(0, v));
		this.#save();
	}

	#save() {
		store(KEY, JSON.stringify({ volume: this.volume, events: this.#events }));
	}
}

export const soundSettings = new SoundSettings();
