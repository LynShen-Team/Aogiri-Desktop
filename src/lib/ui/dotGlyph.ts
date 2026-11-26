// The working glyph (WorkingIndicator.svelte, SessionMark.svelte): 28 small
// dots whose motion says what the work is doing now (`GlyphMode`, from the
// turn's step: workStatus.ts `workMode`):
//
//   think    a sphere of dots turning slowly, the nearer dots brighter
//   write    rows of dots flowing left to right, in a gentle wave
//   run      a ring of dim dots with a brighter few going round it
//   read     a round field of dots, a bright line scanning it top to bottom
//   edit     the field filling in dot by dot, row by row, then fading
//   wait     three dots, still, breathing (an approval, a wait on others)
//   compact  the sphere drawing in to its centre and spreading out again
//   connect  eight dots around a circle lighting up one by one
//
// A change of mode morphs in MORPH_MS; a mode shows for HOLD_MS at least and
// a new one only once it has been asked for SETTLE_MS (`ModeHold`), so steps
// that flip fast do not flicker. Every glyph reads the same clock, so glyphs
// in the same mode move together, and one requestAnimationFrame loop draws
// them all, only those on screen; it stops while the page is hidden.
// Reduced motion: each mode's still pose (`stillFrame`), no loop.
//
// Coordinates are on a 16 px grid; `size` scales them to the canvas.
import { EASE_IN_OUT, T_BASE, timeScale } from '$lib/ui/motion';

export type GlyphMode = 'think' | 'write' | 'run' | 'read' | 'edit' | 'wait' | 'compact' | 'connect';
export const GLYPH_MODES: readonly GlyphMode[] = ['think', 'write', 'run', 'read', 'edit', 'wait', 'compact', 'connect'];

/** The dots every mode draws (some modes hide a few). */
export const GLYPH_DOTS = 28;
/** A change of mode morphs this long (the shared motion token, 120–320 ms). */
export const MORPH_MS = T_BASE;
/** A mode shows at least this long before the next one replaces it… */
export const HOLD_MS = 400;
/** …and a new mode shows once it has been asked for this long. */
export const SETTLE_MS = 150;

/** A dot to draw: its centre and radius on the 16 px grid, its opacity. */
export interface GlyphDot {
	x: number;
	y: number;
	r: number;
	a: number;
}

const C = 8;
const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mod = (v: number, m: number) => ((v % m) + m) % m;
/** A dot that is not drawn in a mode sits on a drawn one, so it fades there. */
const hidden = (d: GlyphDot): GlyphDot => ({ ...d, a: 0 });

// --- think: the sphere ------------------------------------------------------

const RADIUS = 6.5;
const TILT = 0.38;
/** The sphere turns once in this long (at its equator; the poles lag, which
 *  reads as a slow swirl). */
const TURN_MS = 7200;

function sphere(t: number, scale = 1): GlyphDot[] {
	const out: GlyphDot[] = [];
	for (let i = 0; i < GLYPH_DOTS; i++) {
		const lat0 = 1 - (2 * (i + 0.5)) / GLYPH_DOTS;
		// Each dot drifts a little along its meridian.
		const lat = Math.max(-0.98, Math.min(0.98, lat0 + 0.07 * Math.sin((t / 3100) * TAU + i * 1.7)));
		const ring = Math.sqrt(1 - lat * lat);
		// The equator turns faster than the poles.
		const lon = i * GOLDEN + (t / TURN_MS) * TAU * (0.75 + 0.35 * ring);
		const x = ring * Math.cos(lon);
		const z0 = ring * Math.sin(lon);
		const y = lat * Math.cos(TILT) - z0 * Math.sin(TILT);
		const z = lat * Math.sin(TILT) + z0 * Math.cos(TILT);
		const near = (z + 1) / 2;
		out.push({ x: C + RADIUS * scale * x, y: C - RADIUS * scale * y, r: 0.5 + 0.36 * near, a: 0.2 + 0.8 * near ** 1.5 });
	}
	return out;
}

// --- write: rows flowing ----------------------------------------------------

const ROWS = 4;
const COLS = 7;
/** A dot crosses the field in this long. */
const FLOW_MS = 2800;

function stream(t: number): GlyphDot[] {
	const out: GlyphDot[] = [];
	for (let row = 0; row < ROWS; row++) {
		for (let col = 0; col < COLS; col++) {
			// Where along the row the dot is, 0 (left) to 1 (right).
			const p = mod((col + row * 0.5) / COLS + t / FLOW_MS, 1);
			const y0 = C + (row - (ROWS - 1) / 2) * 2.7;
			out.push({
				x: 1.6 + p * 12.8,
				y: y0 + 0.75 * Math.sin(TAU * (p - t / 2200) + row * 0.9),
				r: 0.62,
				// In at the left edge, out at the right.
				a: 0.2 + 0.75 * Math.sin(Math.PI * p) ** 1.2
			});
		}
	}
	return out;
}

// --- run: a ring with a bright few going round ------------------------------

const RING = 16;
/** The bright head goes round once in this long. */
const ORBIT_MS = 1500;

function orbit(t: number): GlyphDot[] {
	const head = (t / ORBIT_MS) * TAU;
	const ring: GlyphDot[] = [];
	for (let i = 0; i < RING; i++) {
		const angle = (i / RING) * TAU;
		// How far behind the head this dot is: the head and the two dots
		// behind it are bright, the rest dim.
		const behind = mod(head - angle, TAU);
		const b = Math.exp(-behind / 0.8) + Math.exp(-(TAU - behind) / 0.12);
		const lit = clamp01(b);
		ring.push({ x: C + 6 * Math.sin(angle), y: C - 6 * Math.cos(angle), r: 0.58 + 0.32 * lit, a: 0.24 + 0.76 * lit });
	}
	return Array.from({ length: GLYPH_DOTS }, (_, i) => (i < RING ? ring[i] : hidden(ring[(i * 5) % RING])));
}

// --- read / edit: a round field of dots -------------------------------------

/** A 5 × 5 field without its corners, row by row from the top. */
const FIELD: readonly { x: number; y: number }[] = (() => {
	const cells: { x: number; y: number }[] = [];
	for (let row = 0; row < 5; row++)
		for (let col = 0; col < 5; col++) if (!((row === 0 || row === 4) && (col === 0 || col === 4))) cells.push({ x: C + (col - 2) * 2.7, y: C + (row - 2) * 2.7 });
	return cells;
})();
/** The scan line crosses the field in SCAN_MS, then rests. */
const SCAN_MS = 1300;
const SCAN_REST = 350;

function scan(t: number): GlyphDot[] {
	const u = mod(t, SCAN_MS + SCAN_REST);
	// From above the field to below it.
	const line = u < SCAN_MS ? 1.2 + (u / SCAN_MS) * 13.6 : -10;
	const field = FIELD.map((c) => {
		const lit = Math.exp(-(((c.y - line) / 1.25) ** 2));
		return { x: c.x, y: c.y, r: 0.56 + 0.26 * lit, a: 0.22 + 0.78 * lit };
	});
	return Array.from({ length: GLYPH_DOTS }, (_, i) => (i < field.length ? field[i] : hidden(field[(i * 7) % field.length])));
}

/** One dot every TYPE_MS, then the field holds and fades. */
const TYPE_MS = 95;
const TYPED_HOLD = 500;
const TYPED_FADE = 450;
const TYPED_REST = 250;
const TYPE_CYCLE = FIELD.length * TYPE_MS + TYPED_HOLD + TYPED_FADE + TYPED_REST;

function typing(t: number): GlyphDot[] {
	const u = mod(t, TYPE_CYCLE);
	const typed = FIELD.length * TYPE_MS;
	const fade = u < typed + TYPED_HOLD ? 1 : 1 - clamp01((u - typed - TYPED_HOLD) / TYPED_FADE);
	const field = FIELD.map((c, k) => {
		const age = u - k * TYPE_MS;
		const shown = clamp01(age / 110);
		// The newest dot is the brightest, as a cursor; a dot not typed yet
		// is a faint place, so the field keeps its shape.
		const fresh = age >= 0 && age < 2 * TYPE_MS && u < typed ? 1 - age / (2 * TYPE_MS) : 0;
		return { x: c.x, y: c.y, r: 0.6 + 0.2 * fresh, a: 0.08 + shown * fade * (0.66 + 0.26 * fresh) };
	});
	return Array.from({ length: GLYPH_DOTS }, (_, i) => (i < field.length ? field[i] : hidden(field[(i * 7) % field.length])));
}

// --- wait: three dots breathing ---------------------------------------------

const BREATH_MS = 2400;

function breathing(t: number): GlyphDot[] {
	const a = 0.5 + 0.5 * (0.5 - 0.5 * Math.cos((t / BREATH_MS) * TAU));
	const three = [3.6, 8, 12.4].map((x) => ({ x, y: C, r: 1.05, a }));
	return Array.from({ length: GLYPH_DOTS }, (_, i) => (i < 3 ? three[i] : hidden(three[i % 3])));
}

// --- compact: the sphere drawing in and out ---------------------------------

const SQUEEZE_MS = 2600;

function squeeze(t: number): GlyphDot[] {
	const u = mod(t, SQUEEZE_MS) / SQUEEZE_MS;
	// In (0–40 %), held small (40–55 %), out (55–92 %), held (92–100 %).
	const k = u < 0.4 ? EASE_IN_OUT(u / 0.4) : u < 0.55 ? 1 : u < 0.92 ? 1 - EASE_IN_OUT((u - 0.55) / 0.37) : 0;
	return sphere(t, 1 - 0.6 * k).map((d) => ({ ...d, a: Math.min(1, d.a + 0.25 * k) }));
}

// --- connect: dots lighting up round a circle -------------------------------

const DIAL = 8;
const LIGHT_MS = 170;
const DIAL_HOLD = 300;
const DIAL_FADE = 320;
const DIAL_CYCLE = DIAL * LIGHT_MS + DIAL_HOLD + DIAL_FADE;

function dial(t: number): GlyphDot[] {
	const u = mod(t, DIAL_CYCLE);
	const lit = DIAL * LIGHT_MS;
	const fade = u < lit + DIAL_HOLD ? 1 : 1 - clamp01((u - lit - DIAL_HOLD) / DIAL_FADE);
	const dots = Array.from({ length: DIAL }, (_, k) => {
		const angle = (k / DIAL) * TAU;
		const on = clamp01((u - k * LIGHT_MS) / 120) * fade;
		return { x: C + 5.2 * Math.sin(angle), y: C - 5.2 * Math.cos(angle), r: 0.85, a: 0.16 + 0.8 * on };
	});
	return Array.from({ length: GLYPH_DOTS }, (_, i) => (i < DIAL ? dots[i] : hidden(dots[i % DIAL])));
}

const DRAW: Record<GlyphMode, (t: number) => GlyphDot[]> = {
	think: (t) => sphere(t),
	write: stream,
	run: orbit,
	read: scan,
	edit: typing,
	wait: breathing,
	compact: squeeze,
	connect: dial
};

/** The glyph in `mode` at time `t` (ms on the shared clock). */
export function modeFrame(mode: GlyphMode, t: number): GlyphDot[] {
	return (DRAW[mode] ?? DRAW.think)(t);
}

/** Each mode's still pose under reduced motion: the sphere; three rows
 *  mid-flow; the ring with its bright head at the top right; the scan line
 *  across the middle row; the field half typed; three dots; the sphere drawn
 *  in; five of the eight dots lit. */
export const STILL_AT: Record<GlyphMode, number> = {
	think: 900,
	write: 700,
	run: 0.15 * ORBIT_MS,
	read: SCAN_MS / 2,
	edit: 10.5 * TYPE_MS,
	wait: BREATH_MS * 0.4,
	compact: SQUEEZE_MS * 0.47,
	connect: 4.5 * LIGHT_MS + 120
};
export const stillFrame = (mode: GlyphMode) => modeFrame(mode, STILL_AT[mode]);

/** `from` blended toward `to`, `k` of the way (eased). */
export function blend(from: readonly GlyphDot[], to: readonly GlyphDot[], k: number): GlyphDot[] {
	const e = EASE_IN_OUT(clamp01(k));
	return to.map((b, i) => {
		const a = from[i] ?? b;
		return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, r: a.r + (b.r - a.r) * e, a: a.a + (b.a - a.a) * e };
	});
}

/** Which mode shows: a new mode once it has been asked for SETTLE_MS and the
 *  one showing has shown for HOLD_MS, so a step of a moment (a quick read
 *  between two thoughts) does not flash. */
export class ModeHold {
	shown: GlyphMode;
	/** When the shown mode began to show. */
	since: number;
	wanted: GlyphMode;
	/** When the wanted mode was first asked for. */
	asked: number;

	constructor(mode: GlyphMode, now: number) {
		this.shown = this.wanted = mode;
		this.since = this.asked = now;
	}

	/** Ask for `mode` (again or anew) at `now`; returns the mode showing. */
	set(mode: GlyphMode, now: number): GlyphMode {
		if (mode !== this.wanted) {
			this.wanted = mode;
			this.asked = now;
		}
		return this.at(now);
	}

	/** The mode showing at `now`. */
	at(now: number): GlyphMode {
		if (this.wanted !== this.shown && now - this.asked >= SETTLE_MS && now - this.since >= HOLD_MS) {
			this.shown = this.wanted;
			this.since = now;
		}
		return this.shown;
	}

	/** How long until the wanted mode shows (0: it does). */
	due(now: number): number {
		if (this.wanted === this.shown) return 0;
		return Math.max(0, this.asked + SETTLE_MS - now, this.since + HOLD_MS - now);
	}
}

/** What a glyph draws at `t`: its mode (held), morphing from what it drew
 *  last for MORPH_MS after a change. */
export class GlyphState {
	hold: ModeHold;
	drawn: GlyphMode;
	morph: { from: GlyphDot[]; at: number } | null = null;
	last: GlyphDot[] | null = null;

	constructor(mode: GlyphMode, now: number) {
		this.hold = new ModeHold(mode, now);
		this.drawn = mode;
	}

	frame(t: number): GlyphDot[] {
		const mode = this.hold.at(t);
		if (mode !== this.drawn) {
			this.morph = { from: this.last ?? modeFrame(this.drawn, t), at: t };
			this.drawn = mode;
		}
		let dots = modeFrame(mode, t);
		if (this.morph) {
			const k = (t - this.morph.at) / MORPH_MS;
			if (k >= 1) this.morph = null;
			else dots = blend(this.morph.from, dots, k);
		}
		this.last = dots;
		return dots;
	}

	/** Moving fast enough to draw at the display's full rate. */
	fast(): boolean {
		return !!this.morph || this.drawn === 'run' || this.drawn === 'write' || this.drawn === 'connect';
	}
}

// ---------------------------------------------------------------------------
// Drawing: one loop for every glyph on screen.

interface Glyph {
	canvas: HTMLCanvasElement;
	size: number;
	onScreen: boolean;
	color: string | null;
	state: GlyphState;
	/** Under reduced motion: the timer that shows a held mode when it is due. */
	due: ReturnType<typeof setTimeout> | null;
	draw(t: number): void;
	still(): void;
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

function paint(g: Glyph, dots: readonly GlyphDot[]) {
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
	for (const d of dots) {
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
	// About 30 frames a second for the slow modes, every frame for the
	// quick ones and while a glyph changes mode.
	if (live.some((g) => g.state.fast()) || now - lastDraw >= 30) {
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

/** Under reduced motion every glyph shows its mode's still pose; otherwise the loop runs. */
function sync() {
	reduced = reducedMotion();
	if (reduced) {
		halt();
		for (const g of glyphs) g.still();
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
					if (reduced) for (const g of glyphs) g.still();
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

export interface GlyphOptions {
	/** CSS px square. */
	size?: number;
	mode?: GlyphMode;
}

/** `use:dotGlyph={{ size, mode }}` on a <canvas>. */
export function dotGlyph(canvas: HTMLCanvasElement, options: GlyphOptions = {}) {
	let size = options.size ?? 14;
	canvas.style.width = canvas.style.height = `${size}px`;
	share();
	const g: Glyph = {
		canvas,
		size,
		// Until the observer says otherwise (it answers at once for a
		// canvas on screen); without one, always.
		onScreen: true,
		color: null,
		state: new GlyphState(options.mode ?? 'think', clock()),
		due: null,
		draw: (t) => paint(g, g.state.frame(t)),
		// The still pose of the mode showing; a mode asked for and held back
		// shows when it is due.
		still: () => {
			const now = clock();
			const mode = g.state.hold.at(now);
			g.state.drawn = mode;
			g.state.morph = null;
			paint(g, stillFrame(mode));
			if (g.due) clearTimeout(g.due);
			g.due = null;
			const wait = g.state.hold.due(now);
			if (wait > 0) g.due = setTimeout(() => ((g.due = null), reduced && glyphs.has(g) && g.still()), wait * (scale || 1) + 5);
		}
	};
	glyphs.add(g);
	shared?.seen?.observe(canvas);
	if (reduced) g.still();
	else g.draw(clock());
	run();
	return {
		update(next: GlyphOptions = {}) {
			const now = clock();
			if (next.mode) g.state.hold.set(next.mode, now);
			if (next.size && next.size !== g.size) {
				size = g.size = next.size;
				canvas.style.width = canvas.style.height = `${size}px`;
			}
			if (reduced) g.still();
			else run();
		},
		destroy() {
			if (!glyphs.has(g)) return;
			if (g.due) clearTimeout(g.due);
			shared?.seen?.unobserve(canvas);
			glyphs.delete(g);
			if (![...glyphs].some((x) => x.onScreen)) halt();
			unshare();
		}
	};
}
