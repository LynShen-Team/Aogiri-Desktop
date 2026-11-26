import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { setLocale } from '$lib/i18n';
import { workingElapsed } from './working';

afterEach(() => setLocale('zh'));

describe('workingElapsed', () => {
	it('counts whole seconds, then minutes and seconds, then hours and minutes (zh)', () => {
		setLocale('zh');
		expect(workingElapsed(0)).toBe('0 秒');
		expect(workingElapsed(41_900)).toBe('41 秒');
		expect(workingElapsed(59_999)).toBe('59 秒');
		expect(workingElapsed(60_000)).toBe('1 分 00 秒');
		expect(workingElapsed(65_000)).toBe('1 分 05 秒');
		expect(workingElapsed(3_599_999)).toBe('59 分 59 秒');
		expect(workingElapsed(3_600_000)).toBe('1 时 00 分');
		expect(workingElapsed(3_720_000 + 59_000)).toBe('1 时 02 分');
		expect(workingElapsed(25 * 3_600_000)).toBe('25 时 00 分');
	});

	it('says the same in English', () => {
		setLocale('en');
		expect(workingElapsed(41_000)).toBe('41s');
		expect(workingElapsed(65_000)).toBe('1m 05s');
		expect(workingElapsed(3_720_000)).toBe('1h 02m');
	});

	it('never counts below zero (a clock that went back) or from nothing', () => {
		setLocale('zh');
		expect(workingElapsed(-5)).toBe('0 秒');
		expect(workingElapsed(Number.NaN)).toBe('0 秒');
	});
});

describe('WorkingIndicator', () => {
	const text = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

	it('shows the glyph, 工作中 under its light, and the time since it began', async () => {
		setLocale('zh');
		const { default: WorkingIndicator } = await import('./WorkingIndicator.svelte');
		const html = render(WorkingIndicator, { props: { startedAt: Date.now() - 41_200 } }).body;
		expect(text(html)).toBe('工作中 41 秒');
		// The glyph and the veil are decoration.
		expect(html).toMatch(/<canvas[^>]*class="glyph[^"]*"[^>]*aria-hidden="true"/);
		expect(html).toMatch(/<i class="veil[^"]*" aria-hidden="true">/);
	});

	it('shows no time when it does not know when the work began', async () => {
		setLocale('en');
		const { default: WorkingIndicator } = await import('./WorkingIndicator.svelte');
		expect(text(render(WorkingIndicator, { props: {} }).body)).toBe('Working');
	});
});
