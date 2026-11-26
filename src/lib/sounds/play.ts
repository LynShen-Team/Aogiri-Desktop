// Plays the app's sounds: each rendered once (synth.ts) into a buffer, then
// through one gain (the volume) to the speakers. Keeps still in tests and
// automated browsers, while the system asks apps to be quiet (Windows: quiet
// hours, a presentation, a full-screen game; quiet.rs), and as the settings
// and events.ts say.

import { invoke } from '@tauri-apps/api/core';
import { DEFAULT_VOLUME, shouldPlay, volumeGain, type SoundEventId } from './events';
import { soundSettings } from './settings.svelte';
import { renderSound, type SoundKind } from './synth';

let ctx: AudioContext | null = null;
/** Each context's volume node (the app's, and the egg's own). */
const outs = new WeakMap<BaseAudioContext, GainNode>();
const buffers = new Map<SoundKind, AudioBuffer>();
const lastPlayed = new Map<SoundKind, number>();
/** One sound of a kind per this long: three sessions ending together chime once. */
const REPEAT_MS = 400;

const inApp = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Under vitest, or a browser driven by a test (Playwright sets `navigator.webdriver`). */
export function soundsSilenced(): boolean {
	if (import.meta.env?.MODE === 'test') return true;
	if (typeof navigator !== 'undefined' && navigator.webdriver) return true;
	return typeof window === 'undefined';
}

function context(): AudioContext | null {
	if (typeof AudioContext === 'undefined') return null;
	try {
		ctx ??= new AudioContext();
	} catch {
		return null;
	}
	return ctx;
}

/** The node every app sound goes through, at the current volume (the egg's pack sounds too).
 *  `relative`: the sound was made for full gain; it stays as made at the default volume. */
export function soundOutput(audio: AudioContext, relative = false): AudioNode {
	let out = outs.get(audio);
	if (!out) {
		out = audio.createGain();
		out.connect(audio.destination);
		outs.set(audio, out);
	}
	out.gain.value = volumeGain(soundSettings.volume) / (relative ? volumeGain(DEFAULT_VOLUME) : 1);
	return out;
}

let quietAt = 0;
let quiet = false;
/** The system's quiet state, asked at most every few seconds. */
async function systemQuiet(): Promise<boolean> {
	if (!inApp()) return false;
	if (Date.now() - quietAt < 5000) return quiet;
	quietAt = Date.now();
	quiet = await invoke<boolean>('system_quiet').catch(() => false);
	return quiet;
}

function start(kind: SoundKind) {
	const audio = context();
	if (!audio) return;
	let buffer = buffers.get(kind);
	if (!buffer) {
		const samples = renderSound(kind, audio.sampleRate);
		buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
		buffer.copyToChannel(samples, 0);
		buffers.set(kind, buffer);
	}
	const source = audio.createBufferSource();
	source.buffer = buffer;
	source.connect(soundOutput(audio));
	void audio.resume().catch(() => {});
	source.start();
}

/** Whether the egg's pack sounds may play (its switch and the master switch). */
export function soundAllowed(id: SoundEventId): boolean {
	return !soundsSilenced() && soundSettings.master && soundSettings.enabled(id);
}

/** Plays `kind` for an event, unless the settings, the focus or the system say not to.
 *  `watching`: the user is looking at what it is about (that conversation is in front). */
export function playSound(kind: SoundKind, opts: { watching?: boolean } = {}) {
	if (soundsSilenced() || !inApp()) return;
	const focused = document.hasFocus();
	const play = shouldPlay(kind, {
		master: soundSettings.master,
		enabled: soundSettings.enabled(kind),
		focused,
		watching: focused && opts.watching === true
	});
	if (!play) return;
	const now = Date.now();
	if (now - (lastPlayed.get(kind) ?? 0) < REPEAT_MS) return;
	lastPlayed.set(kind, now);
	void systemQuiet().then((q) => {
		if (!q) start(kind);
	});
}

/** The webview starts audio suspended until a user gesture; the first one
 *  unlocks it, so a sound for a turn that ends later can play. */
export function unlockSounds() {
	if (typeof window === 'undefined') return;
	const unlock = () => {
		void context()?.resume().catch(() => {});
		window.removeEventListener('pointerdown', unlock, true);
		window.removeEventListener('keydown', unlock, true);
	};
	window.addEventListener('pointerdown', unlock, true);
	window.addEventListener('keydown', unlock, true);
}
