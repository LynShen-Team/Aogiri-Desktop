import { describe, expect, it } from 'vitest';
import { catalogOffers, draftModel, toolModeKey } from './draftModel';
import type { ModelOption } from './chat.svelte';

const haiku = { model: 'claude-haiku-5-5', label: 'Haiku 5.5' };
const opus = { model: 'claude-opus-5-5', label: 'Opus 5.5' };
const none = { model: '', label: '' };

describe('draftModel', () => {
	it('names the provider modes', () => {
		expect(toolModeKey(true, 'own')).toBe('lynshen');
		expect(toolModeKey(false, 'own')).toBe('custom:own');
		expect(toolModeKey(undefined, undefined)).toBe('system');
	});

	it('shows the remembered model when it ran in the draft mode and the mode offers it', () => {
		const offers = (m: string) => m === haiku.model;
		expect(draftModel({ remembered: haiku, rememberedMode: 'system', mode: 'system', offers, fallback: opus })).toEqual(haiku);
		expect(draftModel({ remembered: haiku, rememberedMode: 'custom:own', mode: 'custom:own', offers, fallback: opus })).toEqual(haiku);
	});

	it("shows the mode's default otherwise, or nothing when that is not known", () => {
		const all = () => true;
		// Another mode, a model no longer offered, a mode not recorded.
		expect(draftModel({ remembered: haiku, rememberedMode: 'lynshen', mode: 'system', offers: all, fallback: opus })).toEqual(opus);
		expect(draftModel({ remembered: haiku, rememberedMode: 'system', mode: 'system', offers: () => false, fallback: opus })).toEqual(opus);
		expect(draftModel({ remembered: haiku, mode: 'system', offers: all, fallback: opus })).toEqual(opus);
		expect(draftModel({ remembered: haiku, rememberedMode: 'lynshen', mode: 'system', offers: all })).toEqual(none);
		// The draft's own mode not known yet.
		expect(draftModel({ remembered: haiku, rememberedMode: 'system', mode: undefined, offers: all, fallback: opus })).toEqual(none);
	});

	it('finds a model in the catalog by its alias or the id it resolves to', () => {
		const catalog = [{ model: 'haiku', vendor: 'claude-haiku-5-5' }] as ModelOption[];
		expect(catalogOffers(catalog, 'haiku')).toBe(true);
		expect(catalogOffers(catalog, 'claude-haiku-5-5')).toBe(true);
		expect(catalogOffers(catalog, 'claude-opus-5-5')).toBe(false);
		expect(catalogOffers(undefined, 'haiku')).toBe(false);
		expect(catalogOffers(catalog, '')).toBe(false);
	});
});
