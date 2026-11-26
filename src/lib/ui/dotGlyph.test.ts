import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	GLYPH_DOTS,
	GLYPH_MODES,
	GlyphState,
	HOLD_MS,
	MORPH_MS,
	ModeHold,
	SETTLE_MS,
	dotGlyph,
	modeFrame,
	stillFrame,
	type GlyphDot,
	type GlyphMode
} from './dotGlyph';

const shown = (dots: GlyphDot[]) => dots.filter((d) => d.a > 0.01);
const bright = (dots: GlyphDot[], above = 0.6) => dots.filter((d) => d.a > above);
/** Mean distance of the drawn dots from the middle. */
const spread = (dots: GlyphDot[]) => {
	const s = shown(dots);
	return s.reduce((sum, d) => sum + Math.hypot(d.x - 8, d.y - 8), 0) / s.length;
};
/** The frame as the eye gets it at 16 px: how much light falls in each 2 px cell. */
const cells = (dots: GlyphDot[]) => {
	const grid = new Array(64).fill(0);
	for (const d of shown(dots)) grid[Math.min(7, Math.floor(d.y / 2)) * 8 + Math.min(7, Math.floor(d.x / 2))] += d.a;
	return grid;
};

describe('modeFrame', () => {
	it('draws every mode inside its box, the same for the same moment', () => {
		for (const mode of GLYPH_MODES) {
			for (let t = 0; t < 8000; t += 53) {
				const dots = modeFrame(mode, t);
				expect(dots).toHaveLength(GLYPH_DOTS);
				for (const d of dots) {
					expect(d.x - d.r, mode).toBeGreaterThanOrEqual(0);
					expect(d.y - d.r, mode).toBeGreaterThanOrEqual(0);
					expect(d.x + d.r, mode).toBeLessThanOrEqual(16);
					expect(d.y + d.r, mode).toBeLessThanOrEqual(16);
					expect(d.a, mode).toBeGreaterThanOrEqual(0);
					expect(d.a, mode).toBeLessThanOrEqual(1);
				}
			}
			// A function of time only: every glyph in the same mode agrees.
			expect(modeFrame(mode, 12_345)).toEqual(modeFrame(mode, 12_345));
		}
	});

	it('thinks as a turning sphere: the nearer dots brighter and larger', () => {
		const dots = modeFrame('think', 900);
		const byAlpha = [...dots].sort((a, b) => a.a - b.a);
		expect(byAlpha[0].a).toBeLessThan(0.35);
		expect(byAlpha.at(-1)!.a).toBeGreaterThan(0.85);
		expect(byAlpha[0].r).toBeLessThan(byAlpha.at(-1)!.r);
		for (const d of dots) expect(Math.hypot(d.x - 8, d.y - 8)).toBeLessThanOrEqual(6.6);
		expect(modeFrame('think', 1500)).not.toEqual(dots);
	});

	it('writes as rows flowing to the right', () => {
		const a = modeFrame('write', 1000);
		const b = modeFrame('write', 1080);
		// Four rows of seven, one under the other; most dots moved right (the
		// rest came round to the left).
		const rows = [0, 1, 2, 3].map((r) => a.slice(r * 7, r * 7 + 7).reduce((sum, d) => sum + d.y, 0) / 7);
		for (let r = 1; r < 4; r++) expect(rows[r] - rows[r - 1]).toBeGreaterThan(2);
		const right = a.filter((d, i) => b[i].x > d.x).length;
		expect(right).toBeGreaterThanOrEqual(GLYPH_DOTS - 5);
	});

	it('runs as a dim ring with two or three bright dots going round', () => {
		let last = -1;
		for (let t = 0; t < 1500; t += 50) {
			const dots = shown(modeFrame('run', t));
			for (const d of dots) expect(Math.hypot(d.x - 8, d.y - 8)).toBeCloseTo(6, 5);
			const lit = bright(dots, 0.55);
			expect(lit.length, `t ${t}`).toBeGreaterThanOrEqual(2);
			expect(lit.length, `t ${t}`).toBeLessThanOrEqual(3);
			expect(dots.length - lit.length).toBeGreaterThanOrEqual(12);
			// The brightest dot goes round clockwise.
			const head = [...dots].sort((x, y) => y.a - x.a)[0];
			const angle = (Math.atan2(head.x - 8, 8 - head.y) + Math.PI * 2) % (Math.PI * 2);
			if (last >= 0 && angle < last) expect(last - angle).toBeGreaterThan(Math.PI);
			last = angle;
		}
	});

	it('reads with a line scanning the field top to bottom, one row bright at a time', () => {
		let row = -Infinity;
		// The moments the line crosses each row.
		for (const t of [134, 392, 650, 908, 1166]) {
			const lit = bright(modeFrame('read', t), 0.6);
			expect(lit.length).toBeGreaterThan(0);
			const ys = new Set(lit.map((d) => d.y.toFixed(2)));
			expect(ys.size, `t ${t}`).toBe(1);
			const y = lit[0].y;
			expect(y).toBeGreaterThan(row);
			row = y;
		}
	});

	it('edits by filling the field in, dot by dot, row by row, then fading', () => {
		const typed = (t: number) => bright(modeFrame('edit', t), 0.5);
		expect(typed(0)).toHaveLength(0);
		expect(typed(500).length).toBeLessThan(typed(1000).length);
		expect(typed(1000).length).toBeLessThan(typed(1900).length);
		// Row by row: the typed dots are the first ones, in reading order.
		const half = typed(1000);
		expect(Math.max(...half.map((d) => d.y))).toBeLessThan(10);
		// Later the field fades and starts again.
		expect(typed(2900)).toHaveLength(0);
	});

	it('waits as three still dots that breathe', () => {
		const a = shown(modeFrame('wait', 0));
		const b = shown(modeFrame('wait', 1200));
		expect(a).toHaveLength(3);
		expect(b.map((d) => [d.x, d.y])).toEqual(a.map((d) => [d.x, d.y]));
		expect(Math.abs(b[0].a - a[0].a)).toBeGreaterThan(0.3);
	});

	it('compacts by drawing the dots in to the middle and spreading them again', () => {
		const open = spread(modeFrame('compact', 0));
		const tight = spread(modeFrame('compact', 1200));
		expect(tight).toBeLessThan(open * 0.55);
		expect(spread(modeFrame('compact', 2500))).toBeGreaterThan(open * 0.9);
	});

	it('connects by lighting eight dots round a circle one by one', () => {
		const lit = (t: number) => bright(modeFrame('connect', t), 0.5).length;
		expect(shown(modeFrame('connect', 0))).toHaveLength(8);
		expect(lit(0)).toBe(0);
		expect(lit(400)).toBeLessThan(lit(800));
		expect(lit(800)).toBeLessThan(lit(1600));
		expect(lit(1600)).toBe(8);
	});

	it('has a still pose for each mode, each plainly unlike the others at 16 px', () => {
		for (const a of GLYPH_MODES)
			for (const b of GLYPH_MODES) {
				if (a >= b) continue;
				const ga = cells(stillFrame(a));
				const gb = cells(stillFrame(b));
				const apart = ga.reduce((sum, v, i) => sum + Math.abs(v - gb[i]), 0);
				expect(apart, `${a} / ${b}`).toBeGreaterThan(4);
			}
	});
});

describe('ModeHold', () => {
	it('shows a new mode once it has been asked for a moment', () => {
		const h = new ModeHold('think', 0);
		expect(h.set('run', 5000)).toBe('think');
		expect(h.due(5000)).toBe(SETTLE_MS);
		expect(h.at(5000 + SETTLE_MS - 1)).toBe('think');
		expect(h.at(5000 + SETTLE_MS)).toBe('run');
		expect(h.due(5000 + SETTLE_MS)).toBe(0);
	});

	it('never shows a step shorter than the settle time (no flicker)', () => {
		const h = new ModeHold('think', 0);
		h.set('read', 5000);
		h.set('think', 5000 + SETTLE_MS - 20);
		for (let t = 5000; t < 7000; t += 10) expect(h.at(t)).toBe('think');
	});

	it('keeps a mode for HOLD_MS before the next one replaces it', () => {
		const h = new ModeHold('think', 0);
		h.set('run', 1000);
		expect(h.at(1000 + SETTLE_MS)).toBe('run');
		const shownAt = 1000 + SETTLE_MS;
		h.set('write', shownAt + 10);
		expect(h.at(shownAt + 10 + SETTLE_MS)).toBe('run');
		expect(h.due(shownAt + 10 + SETTLE_MS)).toBe(HOLD_MS - 10 - SETTLE_MS);
		expect(h.at(shownAt + HOLD_MS)).toBe('write');
	});

	it('asking for the mode showing again cancels a change on its way', () => {
		const h = new ModeHold('think', 0);
		h.set('edit', 1000);
		h.set('think', 1100);
		expect(h.at(2000)).toBe('think');
		expect(h.due(2000)).toBe(0);
	});
});

describe('GlyphState', () => {
	it('morphs from what it drew to the new mode in MORPH_MS, without a jump', () => {
		const g = new GlyphState('think', 0);
		const before = g.frame(1000);
		g.hold.set('run', 1000);
		const at = 1000 + SETTLE_MS;
		const start = g.frame(at);
		// The change starts where the glyph was.
		start.forEach((d, i) => {
			expect(d.x).toBeCloseTo(before[i].x, 0);
			expect(d.y).toBeCloseTo(before[i].y, 0);
		});
		const mid = g.frame(at + MORPH_MS / 2);
		const target = modeFrame('run', at + MORPH_MS / 2);
		const gap = (a: GlyphDot[], b: GlyphDot[]) => a.reduce((s, d, i) => s + Math.hypot(d.x - b[i].x, d.y - b[i].y), 0);
		expect(gap(mid, target)).toBeGreaterThan(0.5);
		expect(gap(mid, target)).toBeLessThan(gap(start, modeFrame('run', at)));
		expect(g.frame(at + MORPH_MS)).toEqual(modeFrame('run', at + MORPH_MS));
		expect(g.fast()).toBe(true);
	});
});

// Just enough of a browser for the loop: the reduced-motion query, the page's
// visibility, animation frames, timers, the clock, the on-screen observer, a
// 2D context.
describe('dotGlyph', () => {
	let reduced: boolean;
	let hidden: boolean;
	// The clock only goes forward, from one test to the next too (the loop
	// keeps when it last drew).
	let now = 10_000;
	let motionListeners: (() => void)[];
	let visibilityListeners: (() => void)[];
	let frames: Map<number, FrameRequestCallback>;
	let nextFrame: number;
	let timers: Map<number, { at: number; fn: () => void }>;
	let seen: { cb: (e: { target: unknown; isIntersecting: boolean }[]) => void; nodes: Set<unknown>; disconnected: boolean }[];

	// What the last frame drew: each dot's opacity, in order.
	type Ctx = { clears: number; alpha: number; alphas: number[] };
	const canvas = () => {
		const ctx: Ctx & Record<string, unknown> = {
			clears: 0,
			alpha: 1,
			alphas: [],
			set globalAlpha(a: number) {
				ctx.alpha = a;
			},
			setTransform() {},
			clearRect() {
				ctx.clears++;
				ctx.alphas = [];
			},
			beginPath() {},
			arc() {
				ctx.alphas.push(ctx.alpha);
			},
			fill() {}
		};
		const node = { style: {} as Record<string, string>, width: 0, height: 0, getContext: () => ctx };
		return { node: node as unknown as HTMLCanvasElement, ctx };
	};
	const still = (mode: GlyphMode) => shown(stillFrame(mode)).map((d) => d.a);
	/** Runs the frame the loop asked for, if any. */
	const step = (at = now) => {
		const [[id, cb]] = frames;
		frames.delete(id);
		cb(at);
	};
	/** Moves the clock on, running the timers that come due. */
	const advance = (ms: number) => {
		now += ms;
		for (const [id, t] of [...timers]) if (t.at <= now) (timers.delete(id), t.fn());
	};

	// Every glyph a test made goes, even when the test fails (the loop and
	// its listeners are shared by the module).
	let made: { destroy(): void }[] = [];
	const glyph = (node: HTMLCanvasElement, size: number, mode?: GlyphMode) => {
		const g = dotGlyph(node, { size, mode });
		made.push(g);
		return g;
	};

	beforeEach(() => {
		reduced = false;
		hidden = false;
		now += 100_000;
		motionListeners = [];
		visibilityListeners = [];
		frames = new Map();
		nextFrame = 1;
		timers = new Map();
		seen = [];
		vi.stubGlobal('performance', { now: () => now });
		vi.stubGlobal('setTimeout', (fn: () => void, ms: number) => {
			const id = nextFrame++;
			timers.set(id, { at: now + ms, fn });
			return id;
		});
		vi.stubGlobal('clearTimeout', (id: number) => timers.delete(id));
		vi.stubGlobal('matchMedia', () => ({
			get matches() {
				return reduced;
			},
			addEventListener: (_: string, f: () => void) => motionListeners.push(f),
			removeEventListener: (_: string, f: () => void) => (motionListeners = motionListeners.filter((g) => g !== f))
		}));
		vi.stubGlobal('document', {
			get hidden() {
				return hidden;
			},
			documentElement: {},
			addEventListener: (_: string, f: () => void) => visibilityListeners.push(f),
			removeEventListener: (_: string, f: () => void) => (visibilityListeners = visibilityListeners.filter((g) => g !== f))
		});
		vi.stubGlobal('getComputedStyle', () => ({ color: 'rgb(236, 236, 236)', getPropertyValue: () => '1' }));
		vi.stubGlobal('devicePixelRatio', 2);
		vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
			frames.set(nextFrame, cb);
			return nextFrame++;
		});
		vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				o: (typeof seen)[number];
				constructor(cb: (typeof seen)[number]['cb']) {
					this.o = { cb, nodes: new Set(), disconnected: false };
					seen.push(this.o);
				}
				observe(n: unknown) {
					this.o.nodes.add(n);
				}
				unobserve(n: unknown) {
					this.o.nodes.delete(n);
				}
				disconnect() {
					this.o.disconnected = true;
				}
			}
		);
		vi.stubGlobal(
			'MutationObserver',
			class {
				observe() {}
				disconnect() {}
			}
		);
	});
	afterEach(() => {
		made.forEach((g) => g.destroy());
		made = [];
		vi.unstubAllGlobals();
	});

	it('moves while it shows: one loop for all glyphs, sized for the screen', () => {
		const a = canvas();
		const b = canvas();
		const ga = glyph(a.node, 16, 'think');
		const gb = glyph(b.node, 12, 'run');
		expect([a.node.width, b.node.width]).toEqual([32, 24]);
		expect(a.node.style.width).toBe('16px');
		// One frame asked for, not one per glyph.
		expect(frames.size).toBe(1);
		const before = a.ctx.clears;
		now += 1000;
		step();
		expect(a.ctx.clears).toBe(before + 1);
		expect(b.ctx.clears).toBeGreaterThan(0);
		expect(frames.size).toBe(1);
		ga.destroy();
		gb.destroy();
		// The last glyph gone: no frame, no listener, no observer.
		expect(frames.size).toBe(0);
		expect(motionListeners).toHaveLength(0);
		expect(visibilityListeners).toHaveLength(0);
		expect(seen.every((o) => o.disconnected)).toBe(true);
	});

	it('follows a change of mode, held back a moment, then morphing', () => {
		const c = canvas();
		const g = glyph(c.node, 16, 'think');
		now += 1000;
		step();
		g.update({ size: 16, mode: 'read' });
		now += SETTLE_MS - 50;
		step();
		expect(c.ctx.alphas).toEqual(shown(modeFrame('think', now)).map((d) => d.a));
		// Due: the morph starts from what was drawn…
		now += 50;
		step();
		expect(c.ctx.alphas).toEqual(shown(modeFrame('think', now - 50)).map((d) => d.a));
		// …and ends on the new mode.
		now += MORPH_MS;
		step();
		expect(c.ctx.alphas).toEqual(shown(modeFrame('read', now)).map((d) => d.a));
	});

	it('under reduced motion shows the still pose of its mode and asks for no frame', () => {
		reduced = true;
		const c = canvas();
		const g = glyph(c.node, 16, 'edit');
		expect(frames.size).toBe(0);
		expect(c.ctx.alphas).toEqual(still('edit'));
		// A new mode: held back as with motion, then its still pose, by a timer.
		advance(1000);
		g.update({ size: 16, mode: 'wait' });
		expect(c.ctx.alphas).toEqual(still('edit'));
		advance(SETTLE_MS + 10);
		expect(c.ctx.alphas).toEqual(still('wait'));
		expect(frames.size).toBe(0);
		// The preference turned off: it moves; on again: still once more.
		reduced = false;
		motionListeners.forEach((f) => f());
		expect(frames.size).toBe(1);
		reduced = true;
		motionListeners.forEach((f) => f());
		expect(frames.size).toBe(0);
		expect(c.ctx.alphas).toEqual(still('wait'));
	});

	it('stops while the page is hidden and goes on when it shows', () => {
		hidden = true;
		const c = canvas();
		glyph(c.node, 16);
		expect(frames.size).toBe(0);
		hidden = false;
		visibilityListeners.forEach((f) => f());
		expect(frames.size).toBe(1);
		// Hidden between two frames: the frame that comes draws nothing and
		// asks for no other.
		hidden = true;
		const clears = c.ctx.clears;
		step();
		expect(c.ctx.clears).toBe(clears);
		expect(frames.size).toBe(0);
	});

	it('draws nothing while off screen (scrolled away, a hidden tab)', () => {
		const c = canvas();
		glyph(c.node, 16);
		const [observer] = seen;
		expect(observer.nodes.has(c.node)).toBe(true);
		observer.cb([{ target: c.node, isIntersecting: false }]);
		const clears = c.ctx.clears;
		now += 1000;
		step();
		expect(c.ctx.clears).toBe(clears);
		expect(frames.size).toBe(0);
		// Back on screen: the loop starts again.
		observer.cb([{ target: c.node, isIntersecting: true }]);
		expect(frames.size).toBe(1);
	});
});
