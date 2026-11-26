// What makes a sound, and when it keeps still. Pure, so the rules are tested
// apart from the audio (play.ts) and the settings (settings.svelte.ts).

import type { SoundKind } from './synth';

/** A synthesized sound, or the cyber egg's own pack sounds (cyberEgg/card/sound.ts). */
export type SoundEventId = SoundKind | 'egg';

/** When an event keeps still:
 *  - `watching`: the user is looking at what it is about (the window has the
 *    focus and that conversation is the one in front);
 *  - `focused`: the window has the focus at all (the low-value events: the
 *    user sees them anyway);
 *  - `never`: the sound answers the user's own click, so it always plays. */
export type QuietWhen = 'watching' | 'focused' | 'never';

export interface SoundEvent {
	id: SoundEventId;
	/** On until the user turns it off. */
	on: boolean;
	quiet: QuietWhen;
}

/** The ones that matter first. */
export const SOUND_EVENTS: readonly SoundEvent[] = [
	{ id: 'done', on: true, quiet: 'watching' },
	{ id: 'attention', on: true, quiet: 'watching' },
	{ id: 'error', on: true, quiet: 'watching' },
	{ id: 'message', on: true, quiet: 'focused' },
	{ id: 'background', on: true, quiet: 'focused' },
	{ id: 'disconnected', on: true, quiet: 'never' },
	{ id: 'connected', on: true, quiet: 'never' },
	{ id: 'copied', on: true, quiet: 'never' },
	// Every message would click: off until asked for.
	{ id: 'sent', on: false, quiet: 'never' },
	{ id: 'egg', on: true, quiet: 'never' }
];

export function soundEvent(id: SoundEventId): SoundEvent {
	return SOUND_EVENTS.find((e) => e.id === id) ?? SOUND_EVENTS[0];
}

/** The volume a new install starts at (0–1). */
export const DEFAULT_VOLUME = 0.7;

/** The gain of a volume (0–1): squared, so the slider's middle sounds like the middle. */
export function volumeGain(volume: number): number {
	const v = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : DEFAULT_VOLUME));
	return v * v;
}

export interface PlayContext {
	/** The master switch. */
	master: boolean;
	/** This event's switch. */
	enabled: boolean;
	/** The window has the focus. */
	focused: boolean;
	/** The user is looking at what the event is about (implies `focused`). */
	watching: boolean;
}

/** Whether `id` plays now. */
export function shouldPlay(id: SoundEventId, c: PlayContext): boolean {
	if (!c.master || !c.enabled) return false;
	switch (soundEvent(id).quiet) {
		case 'watching':
			return !(c.focused && c.watching);
		case 'focused':
			return !c.focused;
		case 'never':
			return true;
	}
}
