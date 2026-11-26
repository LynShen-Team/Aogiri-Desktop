import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LINK_GRACE_MS, LinkSounds } from './link';

describe('LinkSounds', () => {
	let heard: string[];
	let link: LinkSounds;
	beforeEach(() => {
		vi.useFakeTimers();
		heard = [];
		link = new LinkSounds((k) => heard.push(k));
	});
	afterEach(() => vi.useRealTimers());

	it('is silent at start, and when the daemon was never reached', () => {
		link.update('connecting');
		link.update('unreachable');
		vi.advanceTimersByTime(LINK_GRACE_MS * 2);
		link.update('on');
		expect(heard).toEqual([]);
	});

	it('says nothing of a short drop', () => {
		link.update('on');
		link.update('unreachable');
		vi.advanceTimersByTime(LINK_GRACE_MS - 100);
		link.update('on');
		vi.advanceTimersByTime(LINK_GRACE_MS);
		expect(heard).toEqual([]);
	});

	it('hears a long drop once, then the way back', () => {
		link.update('on');
		link.update('unreachable');
		link.update('connecting');
		link.update('unreachable');
		vi.advanceTimersByTime(LINK_GRACE_MS * 3);
		link.update('connecting');
		link.update('on');
		expect(heard).toEqual(['disconnected', 'connected']);
	});

	it('is silent when stopped on purpose', () => {
		link.update('on');
		link.update('off');
		vi.advanceTimersByTime(LINK_GRACE_MS * 2);
		link.update('on');
		expect(heard).toEqual([]);
	});
});
