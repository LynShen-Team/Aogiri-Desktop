import { describe, expect, it } from 'vitest';
import { DEFAULT_VOLUME, SOUND_EVENTS, shouldPlay, volumeGain } from './events';
import { SOUND_KINDS } from './synth';
import { soundSettings } from './settings.svelte';
import { ROWS, searchRows } from '$lib/settings/nav';
import { t, setLocale } from '$lib/i18n';

const ctx = { master: true, enabled: true, focused: false, watching: false };

describe('sound events', () => {
	it('lists every synthesized sound once, and the egg', () => {
		const ids = SOUND_EVENTS.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect([...ids].sort()).toEqual([...SOUND_KINDS, 'egg'].sort());
	});

	it('keeps still when switched off', () => {
		expect(shouldPlay('done', { ...ctx, master: false })).toBe(false);
		expect(shouldPlay('done', { ...ctx, enabled: false })).toBe(false);
	});

	it('keeps the key events still only for what the user is looking at', () => {
		for (const id of ['done', 'attention', 'error'] as const) {
			expect(shouldPlay(id, ctx)).toBe(true);
			expect(shouldPlay(id, { ...ctx, focused: true })).toBe(true);
			expect(shouldPlay(id, { ...ctx, focused: true, watching: true })).toBe(false);
		}
	});

	it('keeps the low-value events still while the window has the focus', () => {
		for (const id of ['message', 'background'] as const) {
			expect(shouldPlay(id, ctx)).toBe(true);
			expect(shouldPlay(id, { ...ctx, focused: true })).toBe(false);
		}
	});

	it('plays the answers to a click whatever the focus', () => {
		expect(shouldPlay('copied', { ...ctx, focused: true, watching: true })).toBe(true);
	});

	it('starts with the message click off and the rest on', () => {
		expect(SOUND_EVENTS.filter((e) => !e.on).map((e) => e.id)).toEqual(['sent']);
	});

	it('maps the volume to a gain', () => {
		expect(volumeGain(0)).toBe(0);
		expect(volumeGain(1)).toBe(1);
		expect(volumeGain(2)).toBe(1);
		expect(volumeGain(Number.NaN)).toBeCloseTo(DEFAULT_VOLUME ** 2);
		expect(volumeGain(0.5)).toBeLessThan(0.5);
	});
});

describe('sound settings', () => {
	// Owner 2026-11-27: 「提示音就不应该显示」. Settings has no row for the
	// sounds and its search finds none; they play with their defaults.
	it('has no settings row, and the search finds none', () => {
		expect(ROWS.filter((r) => r.id.startsWith('sounds') || r.titleKey.startsWith('sounds.'))).toEqual([]);
		setLocale('zh');
		for (const q of ['提示音', '声音', '音量', 'sound']) expect(searchRows(q, t)).toEqual([]);
		setLocale('en');
		for (const q of ['sound', 'sounds', 'volume']) expect(searchRows(q, t)).toEqual([]);
		setLocale('zh');
	});

	it('plays with the defaults: on, the task-finished and needs-you sounds on', () => {
		expect(soundSettings.master).toBe(true);
		expect(soundSettings.enabled('done')).toBe(true);
		expect(soundSettings.enabled('attention')).toBe(true);
		expect(soundSettings.enabled('sent')).toBe(false);
		expect(soundSettings.volume).toBe(DEFAULT_VOLUME);
	});
});
