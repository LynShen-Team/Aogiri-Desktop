// The working glyph (WorkingIndicator.svelte, SessionMark.svelte): a small
// sphere of dots that turns slowly, the dots nearer the reader brighter and
// larger, and every GLYPH_CYCLE_MS the dots in front gather for a moment into
// the 04 林光 mark (lynshen-mark.svg: two trunks and the light), drawn in
// dots, then scatter back into the sphere.
//
// The drawing is a function of time (`glyphFrame`): every glyph reads the
// same clock, so the glyphs in one window turn and gather together, as the
// running titles sweep on one clock (shimmer.ts). One requestAnimationFrame
// loop draws them all, and only those on screen; it stops while the page is
// hidden. Reduced motion: one still frame of the sphere, no loop.
//
// Coordinates are on the mark's 16 px grid (lynshen-mark.svg); `size` scales
// them to the canvas.
import { EASE_IN_OUT, timeScale } from '$lib/ui/motion';

/** The dots in the sphere. */
export const GLYPH_DOTS = 28;
/** One turn of the cycle: the sphere, the gathering, the mark, the scatter. */
export const GLYPH_CYCLE_MS = 9000;
/** When the dots start to gather, how long it takes, when they leave the
 *  mark and how long that takes (ms into the cycle). */
export const GATHER_AT = 6600;
export const GATHER_MS = 500;
export const SCATTER_AT = 8300;
export const SCATTER_MS = 600;
/** The latest a dot starts to gather or to scatter after the first one. */
const GATHER_SPREAD = 120;
const SCATTER_SPREAD = 80;
/** The sphere turns once in this long (at its equator; the poles lag, which
 *  reads as a slow swirl). */
const TURN_MS = 7200;
/** The still frame under reduced motion: the sphere, a little turned. */
export const STILL_AT = 900;

/** A dot to draw: its centre and radius on the 16 px grid, its opacity. */
export interface GlyphDot {
	x: number;
	y: number;
	r: number;
	a: number;
}

const C = 8;
const RADIUS = 6.5;
const TILT = 0.38;
const R_BACK = 0.5;
const R_FRONT = 0.86;
const R_MARK = 0.7;

/** The mark in dots: the short trunk, the tall trunk, then the light, on
 *  lynshen-mark.svg's centre lines (trunks at x 4 and 12, the light from
 *  6.53,3.89 to 8.73,9.91). */
export const MARK_DOTS: readonly { x: number; y: number }[] = [
	...[6.5, 8, 9.5, 11, 12.5, 14].map((y) => ({ x: 4, y })),
	...[2, 3.5, 5, 6.5, 8, 9.5, 11, 12.5, 14].map((y) => ({ x: 12, y })),
	...[0, 0.25, 0.5, 0.75, 1].map((f) => ({ x: 6.53 + 2.2 * f, y: 3.89 + 6.02 * f }))
];

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** A fixed spread per dot in [0, 1) (no Math.random: frames are a function of time). */
const spread = (i: number, salt: number) => {
	const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

/** Where dot `i` of the sphere is at `t`, and how near the reader (z in -1..1). */
function sphereDot(i: number, t: number): { x: number; y: number; z: number } {
	const lat0 = 1 - (2 * (i + 0.5)) / GLYPH_DOTS;
	// Each dot drifts a little along its meridian.
	const lat = Math.max(-0.98, Math.min(0.98, lat0 + 0.07 * Math.sin((t / 3100) * 2 * Math.PI + i * 1.7)));
	const ring = Math.sqrt(1 - lat * lat);
	// The equator turns faster than the poles.
	const lon = i * GOLDEN + ((t / TURN_MS) * 2 * Math.PI) * (0.75 + 0.35 * ring);
	const x = ring * Math.cos(lon);
	const z0 = ring * Math.sin(lon);
	const y = lat * Math.cos(TILT) - z0 * Math.sin(TILT);
	const z = lat * Math.sin(TILT) + z0 * Math.cos(TILT);
	return { x: C + RADIUS * x, y: C - RADIUS * y, z };
}

/** How far each dot has gone into the mark (0: in the sphere, 1: in the mark),
 *  `u` ms into the cycle. */
export function gathered(i: number, u: number): number {
	const g0 = GATHER_AT + GATHER_SPREAD * spread(i, 1);
	const s0 = SCATTER_AT + SCATTER_SPREAD * spread(i, 2);
	if (u < g0) return 0;
	if (u < g0 + GATHER_MS) return EASE_IN_OUT((u - g0) / GATHER_MS);
	if (u < s0) return 1;
	if (u < s0 + SCATTER_MS) return 1 - EASE_IN_OUT((u - s0) / SCATTER_MS);
	return 0;
}

/** Which mark dot each sphere dot goes to in cycle `k` (-1: it fades away):
 *  the dots in front when the gathering starts, each to a near mark dot. */
const plans = new Map<number, Int8Array>();
export function gatherPlan(k: number): Int8Array {
	const known = plans.get(k);
	if (known) return known;
	const at = k * GLYPH_CYCLE_MS + GATHER_AT;
	const dots = Array.from({ length: GLYPH_DOTS }, (_, i) => ({ i, ...sphereDot(i, at) }));
	const front = dots.sort((a, b) => b.z - a.z).slice(0, MARK_DOTS.length);
	const pairs: [number, number, number][] = [];
	for (const d of front) MARK_DOTS.forEach((m, j) => pairs.push([(d.x - m.x) ** 2 + (d.y - m.y) ** 2, d.i, j]));
	pairs.sort((a, b) => a[0] - b[0]);
	const plan = new Int8Array(GLYPH_DOTS).fill(-1);
	const taken = new Set<number>();
	for (const [, i, j] of pairs) {
		if (plan[i] !== -1 || taken.has(j)) continue;
		plan[i] = j;
		taken.add(j);
	}
	// Keep the plans of this cycle and the last one only.
	for (const old of plans.keys()) if (old < k - 1) plans.delete(old);
	plans.set(k, plan);
	return plan;
}

/** The glyph at time `t` (ms on the shared clock). */
export function glyphFrame(t: number): GlyphDot[] {
	const k = Math.floor(t / GLYPH_CYCLE_MS);
	const u = t - k * GLYPH_CYCLE_MS;
	const busy = u >= GATHER_AT && u < SCATTER_AT + SCATTER_SPREAD + SCATTER_MS;
	const plan = busy ? gatherPlan(k) : null;
	const out: GlyphDot[] = [];
	for (let i = 0; i < GLYPH_DOTS; i++) {
		const s = sphereDot(i, t);
		const near = (s.z + 1) / 2;
		const dot = { x: s.x, y: s.y, r: R_BACK + (R_FRONT - R_BACK) * near, a: 0.2 + 0.8 * near ** 1.5 };
		const w = plan ? gathered(i, u) : 0;
		if (w > 0 && plan) {
			const j = plan[i];
			if (j >= 0) {
				const m = MARK_DOTS[j];
				dot.x += (m.x - dot.x) * w;
				dot.y += (m.y - dot.y) * w;
				dot.r += (R_MARK - dot.r) * w;
				dot.a += (1 - dot.a) * w;
			} else {
				// Not in the mark: it fades as it falls toward the middle.
				dot.x += (C - dot.x) * 0.3 * w;
				dot.y += (C - dot.y) * 0.3 * w;
				dot.a *= 1 - w;
			}
		}
		out.push(dot);
	}
	return out;
}

/** Whether a frame at `t` moves fast enough to draw at the display's full
 *  rate (the gathering and the scatter); the slow turn draws every other frame. */
export const fastAt = (t: number) => {
	const u = t - Math.floor(t / GLYPH_CYCLE_MS) * GLYPH_CYCLE_MS;
	return u >= GATHER_AT && u < SCATTER_AT + SCATTER_SPREAD + SCATTER_MS;
};

// ---------------------------------------------------------------------------
// Drawing: one loop for every glyph on screen.

interface Glyph {
	canvas: HTMLCanvasElement;
	size: number;
	onScreen: boolean;
	color: string | null;
	draw(t: number): void;
}

const glyphs = new Set<Glyph>();
let frame = 0;
let lastDraw = -Infinity;
let shared: {
	motion: MediaQueryList;
	onMotion: () => void;
	onVisibility: () => void;
	seen: IntersectionObserver | null;
	theme: MutationObserver | null;
} | null = null;

/** The reduced-motion preference and --time-scale, read when the first
 *  glyph comes and when the preference changes (not at every frame). */
let reduced = false;
let scale = 1;
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pageHidden = () => typeof document !== 'undefined' && document.hidden;
const clock = () => performance.now() / (scale || 1);

function paint(g: Glyph, t: number) {
	const ctx = g.canvas.getContext('2d');
	if (!ctx) return;
	const dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
	const px = Math.round(g.size * dpr);
	if (g.canvas.width !== px) g.canvas.width = px;
	if (g.canvas.height !== px) g.canvas.height = px;
	// The dots take the text colour where the glyph sits (read again when
	// the theme changes).
	g.color ??= getComputedStyle(g.canvas).color || '#888';
	const k = px / 16;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, px, px);
	ctx.fillStyle = g.color;
	for (const d of glyphFrame(t)) {
		if (d.a <= 0.01) continue;
		ctx.globalAlpha = d.a;
		ctx.beginPath();
		ctx.arc(d.x * k, d.y * k, d.r * k, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

/** Draws the glyphs on screen, then asks for the next frame while any is. */
function tick(now: number) {
	frame = 0;
	if (pageHidden() || reduced) return;
	const t = clock();
	const live = [...glyphs].filter((g) => g.onScreen);
	if (!live.length) return;
	// About 30 frames a second while the sphere turns, every frame while
	// the dots gather or scatter.
	if (fastAt(t) || now - lastDraw >= 30) {
		lastDraw = now;
		for (const g of live) g.draw(t);
	}
	frame = requestAnimationFrame(tick);
}

function run() {
	if (frame || pageHidden() || reduced) return;
	if (![...glyphs].some((g) => g.onScreen)) return;
	frame = requestAnimationFrame(tick);
}

function halt() {
	if (frame) cancelAnimationFrame(frame);
	frame = 0;
}

/** Under reduced motion every glyph shows the still sphere; otherwise the loop runs. */
function sync() {
	reduced = reducedMotion();
	if (reduced) {
		halt();
		for (const g of glyphs) g.draw(STILL_AT);
	} else run();
}

function share() {
	if (shared) return;
	reduced = reducedMotion();
	scale = timeScale();
	const motion = matchMedia('(prefers-reduced-motion: reduce)');
	const onMotion = () => sync();
	const onVisibility = () => (pageHidden() ? halt() : run());
	motion.addEventListener('change', onMotion);
	document.addEventListener('visibilitychange', onVisibility);
	const seen =
		typeof IntersectionObserver === 'undefined'
			? null
			: new IntersectionObserver((entries) => {
					for (const e of entries) for (const g of glyphs) if (g.canvas === e.target) g.onScreen = e.isIntersecting;
					run();
				});
	// A theme change: the dots take the new text colour at the next frame.
	const theme =
		typeof MutationObserver === 'undefined'
			? null
			: new MutationObserver(() => {
					for (const g of glyphs) g.color = null;
					if (reduced) for (const g of glyphs) g.draw(STILL_AT);
				});
	theme?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
	shared = { motion, onMotion, onVisibility, seen, theme };
}

function unshare() {
	if (!shared || glyphs.size) return;
	halt();
	shared.motion.removeEventListener('change', shared.onMotion);
	document.removeEventListener('visibilitychange', shared.onVisibility);
	shared.seen?.disconnect();
	shared.theme?.disconnect();
	shared = null;
}

/** `use:dotGlyph={size}` on a <canvas>: the glyph, `size` CSS px square. */
export function dotGlyph(canvas: HTMLCanvasElement, size = 14) {
	canvas.style.width = canvas.style.height = `${size}px`;
	const g: Glyph = {
		canvas,
		size,
		// Until the observer says otherwise (it answers at once for a
		// canvas on screen); without one, always.
		onScreen: true,
		color: null,
		draw: (t) => paint(g, t)
	};
	glyphs.add(g);
	share();
	shared?.seen?.observe(canvas);
	g.draw(reduced ? STILL_AT : clock());
	run();
	return {
		update(next = 14) {
			g.size = next;
			canvas.style.width = canvas.style.height = `${next}px`;
			g.draw(reduced ? STILL_AT : clock());
		},
		destroy() {
			if (!glyphs.has(g)) return;
			shared?.seen?.unobserve(canvas);
			glyphs.delete(g);
			if (![...glyphs].some((x) => x.onScreen)) halt();
			unshare();
		}
	};
}
