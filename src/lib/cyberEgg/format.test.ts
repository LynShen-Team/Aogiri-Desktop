import { describe, expect, it } from 'vitest';
import { left, shortTokens, usedShare, wan } from './format';

describe('cyber egg numbers', () => {
	it('writes tokens in 万', () => {
		expect(wan(30_440_000)).toBe('3,044');
		expect(wan(48_260_000)).toBe('4,826');
		expect(wan(5_000)).toBe('0.5');
		expect(wan(0)).toBe('0');
		expect(wan(-10)).toBe('0');
	});
	it('shortens a request', () => {
		expect(shortTokens(182_400)).toBe('182.4k');
		expect(shortTokens(96_100)).toBe('96.1k');
		expect(shortTokens(1_204_000)).toBe('1.2M');
		expect(shortTokens(2_000_000)).toBe('2M');
		expect(shortTokens(640)).toBe('640');
	});
	it('counts the time left in whole minutes, rounding up', () => {
		expect(left(1_000 + (5 * 60 + 12) * 60_000, 1_000)).toEqual({ h: 5, m: 12 });
		expect(left(1_000 + 30_000, 1_000)).toEqual({ h: 0, m: 1 });
		expect(left(1_000, 1_000)).toBeNull();
	});
	it('keeps the meter between 0 and 1', () => {
		expect(usedShare(0, 10)).toBe(0);
		expect(usedShare(100, 25)).toBe(0.25);
		expect(usedShare(100, 250)).toBe(1);
	});
});
