import { describe, expect, it } from 'vitest';
import { renderSound, soundLength, SOUND_KINDS } from './synth';

describe('renderSound', () => {
	it('renders every sound short, finite, under full scale, ending in silence', () => {
		for (const kind of SOUND_KINDS) {
			const s = renderSound(kind, 48000);
			expect(s.length).toBe(Math.ceil(soundLength(kind) * 48000));
			expect(s.length / 48000).toBeLessThanOrEqual(0.6);
			let peak = 0;
			for (const v of s) {
				expect(Number.isFinite(v)).toBe(true);
				peak = Math.max(peak, Math.abs(v));
			}
			expect(peak).toBeGreaterThan(0.2);
			expect(peak).toBeLessThan(0.85);
			expect(Math.abs(s[s.length - 1])).toBeLessThan(1e-3);
		}
	});

	it('is the same every time', () => {
		expect(renderSound('done', 44100)).toEqual(renderSound('done', 44100));
	});

	it('makes each sound its own', () => {
		const seen = new Set(SOUND_KINDS.map((k) => renderSound(k, 8000).slice(0, 400).join()));
		expect(seen.size).toBe(SOUND_KINDS.length);
	});
});
