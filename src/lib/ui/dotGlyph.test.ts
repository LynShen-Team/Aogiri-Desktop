import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mark from '../lynshen-mark.svg?raw';
import {
	GATHER_AT,
	GATHER_MS,
	GLYPH_CYCLE_MS,
	GLYPH_DOTS,
	MARK_DOTS,
	SCATTER_AT,
	SCATTER_MS,
	STILL_AT,
	dotGlyph,
	gathered,
	glyphFrame
} from './dotGlyph';

const HOLD = (GATHER_AT + GATHER_MS + 200 + SCATTER_AT) / 2;

describe('glyphFrame', () => {
	it('draws the same dots for the same moment, inside its box, all through the cycle', () => {
		for (let t = 0; t < 2 * GLYPH_CYCLE_MS; t += 37) {
			const dots = glyphFrame(t);
			expect(dots).toHaveLength(GLYPH_DOTS);
			for (const d of dots) {
				expect(d.x - d.r).toBeGreaterThanOrEqual(0);
				expect(d.y - d.r).toBeGreaterThanOrEqual(0);
				expect(d.x + d.r).toBeLessThanOrEqual(16);
				expect(d.y + d.r).toBeLessThanOrEqual(16);
				expect(d.a).toBeGreaterThanOrEqual(0);
				expect(d.a).toBeLessThanOrEqual(1);
			}
		}
		// A function of time only: every glyph in the window agrees.
		expect(glyphFrame(12_345)).toEqual(glyphFrame(12_345));
	});

	it('is a sphere with depth before the dots gather: the nearer, the brighter and larger', () => {
		const dots = glyphFrame(STILL_AT);
		const byAlpha = [...dots].sort((a, b) => a.a - b.a);
		expect(byAlpha[0].a).toBeLessThan(0.35);
		expect(byAlpha.at(-1)!.a).toBeGreaterThan(0.85);
		expect(byAlpha[0].r).toBeLessThan(byAlpha.at(-1)!.r);
		// Round: every dot is about as far from the middle as the sphere's
		// radius or nearer.
		for (const d of dots) expect(Math.hypot(d.x - 8, d.y - 8)).toBeLessThanOrEqual(6.6);
	});

	it('gathers into the mark, every dot of it once, then scatters back', () => {
		for (const k of [0, 1, 7]) {
			const dots = glyphFrame(k * GLYPH_CYCLE_MS + HOLD);
			const shown = dots.filter((d) => d.a > 0.01);
			expect(shown).toHaveLength(MARK_DOTS.length);
			const at = (p: { x: number; y: number }) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
			expect(new Set(shown.map(at))).toEqual(new Set(MARK_DOTS.map(at)));
			expect(shown.every((d) => Math.abs(d.a - 1) < 1e-9)).toBe(true);
		}
		for (let i = 0; i < GLYPH_DOTS; i++) {
			expect(gathered(i, GATHER_AT - 1)).toBe(0);
			expect(gathered(i, HOLD)).toBe(1);
			expect(gathered(i, SCATTER_AT + 200 + SCATTER_MS)).toBe(0);
		}
		// About a second in the mark, once in about nine.
		expect(SCATTER_AT - (GATHER_AT + GATHER_MS)).toBeGreaterThanOrEqual(1000);
		expect(GLYPH_CYCLE_MS).toBeGreaterThanOrEqual(8000);
		expect(GLYPH_CYCLE_MS).toBeLessThanOrEqual(10_000);
	});

	it("draws the app's own mark: the dots lie on lynshen-mark.svg's trunks and light", () => {
		// The trunks: x from..to and y from..to of each capsule path.
		const trunks = [...mark.matchAll(/d="M([\d.]+) ([\d.]+)L[\d.]+ ([\d.]+)A1 1 0 0 0 ([\d.]+)/g)].map(([, x0, y0, y1, x1]) => ({ x: (+x0 + +x1) / 2, top: +y0, bottom: +y1 }));
		expect(trunks).toHaveLength(2);
		for (const trunk of trunks) {
			const on = MARK_DOTS.filter((d) => d.x === trunk.x);
			expect(on.length).toBeGreaterThanOrEqual(5);
			expect(Math.min(...on.map((d) => d.y))).toBe(trunk.top);
			expect(Math.max(...on.map((d) => d.y))).toBe(trunk.bottom);
		}
		// The light runs down to the right, between the trunks.
		const light = MARK_DOTS.filter((d) => d.x !== trunks[0].x && d.x !== trunks[1].x);
		expect(light.length).toBeGreaterThanOrEqual(4);
		for (let i = 1; i < light.length; i++) {
			expect(light[i].x).toBeGreaterThan(light[i - 1].x);
			expect(light[i].y).toBeGreaterThan(light[i - 1].y);
		}
	});
});

// Just enough of a browser for the loop: the reduced-motion query, the page's
// visibility, animation frames, the on-screen observer, a 2D context.
describe('dotGlyph', () => {
	let reduced: boolean;
	let hidden: boolean;
	let motionListeners: (() => void)[];
	let visibilityListeners: (() => void)[];
	let frames: Map<number, FrameRequestCallback>;
	let nextFrame: number;
	let seen: { cb: (e: { target: unknown; isIntersecting: boolean }[]) => void; nodes: Set<unknown>; disconnected: boolean }[];

	type Ctx = { arcs: number; clears: number; alphas: number[] };
	const canvas = () => {
		const ctx: Ctx & Record<string, unknown> = {
			arcs: 0,
			clears: 0,
			alphas: [],
			set globalAlpha(a: number) {
				ctx.alphas.push(a);
			},
			setTransform() {},
			clearRect() {
				ctx.clears++;
				ctx.alphas = [];
			},
			beginPath() {},
			arc() {
				ctx.arcs++;
			},
			fill() {}
		};
		const node = { style: {} as Record<string, string>, width: 0, height: 0, getContext: () => ctx };
		return { node: node as unknown as HTMLCanvasElement, ctx };
	};
	/** Runs the frame the loop asked for, if any. */
	const step = (now = performance.now()) => {
		const [[id, cb]] = frames;
		frames.delete(id);
		cb(now);
	};

	beforeEach(() => {
		reduced = false;
		hidden = false;
		motionListeners = [];
		visibilityListeners = [];
		frames = new Map();
		nextFrame = 1;
		seen = [];
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
	afterEach(() => vi.unstubAllGlobals());

	it('turns while it shows: one loop for all glyphs, sized for the screen', () => {
		const a = canvas();
		const b = canvas();
		const ga = dotGlyph(a.node, 14);
		const gb = dotGlyph(b.node, 12);
		expect([a.node.width, b.node.width]).toEqual([28, 24]);
		expect(a.node.style.width).toBe('14px');
		// One frame asked for, not one per glyph.
		expect(frames.size).toBe(1);
		const before = a.ctx.clears;
		step(performance.now() + 1000);
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

	it('under reduced motion shows the still sphere and asks for no frame', () => {
		reduced = true;
		const c = canvas();
		const g = dotGlyph(c.node, 14);
		expect(frames.size).toBe(0);
		// One frame drawn: the sphere at STILL_AT, every dot of it.
		expect(c.ctx.clears).toBe(1);
		expect(c.ctx.alphas).toEqual(glyphFrame(STILL_AT).filter((d) => d.a > 0.01).map((d) => d.a));
		// The preference turned off: it turns; on again: still once more.
		reduced = false;
		motionListeners.forEach((f) => f());
		expect(frames.size).toBe(1);
		reduced = true;
		motionListeners.forEach((f) => f());
		expect(frames.size).toBe(0);
		expect(c.ctx.alphas).toEqual(glyphFrame(STILL_AT).filter((d) => d.a > 0.01).map((d) => d.a));
		g.destroy();
	});

	it('stops while the page is hidden and goes on when it shows', () => {
		hidden = true;
		const c = canvas();
		const g = dotGlyph(c.node, 14);
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
		g.destroy();
	});

	it('draws nothing while off screen (scrolled away, a hidden tab)', () => {
		const c = canvas();
		const g = dotGlyph(c.node, 14);
		const [observer] = seen;
		expect(observer.nodes.has(c.node)).toBe(true);
		observer.cb([{ target: c.node, isIntersecting: false }]);
		const clears = c.ctx.clears;
		step(performance.now() + 1000);
		expect(c.ctx.clears).toBe(clears);
		expect(frames.size).toBe(0);
		// Back on screen: the loop starts again.
		observer.cb([{ target: c.node, isIntersecting: true }]);
		expect(frames.size).toBe(1);
		g.destroy();
	});
});
