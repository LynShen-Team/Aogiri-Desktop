// CE-C6: a card opened in the viewer flies there from its place on the page while the page dims, and on closing flies
// back into that place while the dim fades; its place stays empty while it is out. A copy of the card (the ghost,
// above the dialog) makes the flight, so the dialog's box never clips it; both ends are looked up on every frame, so
// it lands exactly where the dialog settles. Reduced motion: no flight, the viewer only fades. The website's
// `pages/cyber-egg/card-flight.ts`, the same timings and curves.

/** A card on screen: its centre, its width as seen, and its turn in degrees. */
export interface Place {
	cx: number;
	cy: number;
	width: number;
	rotate: number;
}

export const OPEN_MS = 460;
export const CLOSE_MS = 380;
/** A card is 5 wide by 7 tall (CE-C4). */
const TALL = 7 / 5;

export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export function reducedMotion(): boolean {
	return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** Where an element is on screen; a turn is read from its own inline `rotate(…deg)` (the lower cards of a pile). */
export function placeOf(node: HTMLElement | null | undefined): Place | null {
	if (!node) return null;
	const rect = node.getBoundingClientRect();
	if (!(rect.width > 0)) return null;
	const turn = /rotate\((-?[\d.]+)deg\)/.exec(node.style.transform ?? '');
	const rotate = turn ? Number(turn[1]) : 0;
	return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, width: rotate ? node.offsetWidth : rect.width, rotate };
}

/** The transform that puts a ghost `width` wide (top left at 0,0, turning about its centre) on `place`. */
export function ghostTransform(place: Place, width: number): string {
	const height = width * TALL;
	return `translate(${(place.cx - width / 2).toFixed(2)}px, ${(place.cy - height / 2).toFixed(2)}px) rotate(${place.rotate.toFixed(2)}deg) scale(${(place.width / width).toFixed(4)})`;
}

const mix = (a: Place, b: Place, p: number): Place => ({
	cx: a.cx + (b.cx - a.cx) * p,
	cy: a.cy + (b.cy - a.cy) * p,
	width: a.width + (b.width - a.width) * p,
	rotate: a.rotate + (b.rotate - a.rotate) * p
});

/** Moves `ghost` (`width` wide) between two places over `ms`, both looked up on every frame. */
export function glide(
	ghost: HTMLElement,
	width: number,
	from: () => Place | null,
	to: () => Place | null,
	ms: number,
	ease: (t: number) => number
): { done: Promise<boolean>; stop: () => Place | null } {
	let start: number | null = null;
	let over = false;
	let a = from();
	let b = to();
	let last = a;
	let finish: (landed: boolean) => void = () => {};
	const done = new Promise<boolean>((resolve) => (finish = resolve));
	let id = 0;
	const tick = (now: number) => {
		if (over) return;
		start ??= now;
		const t = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
		a = from() ?? a;
		b = to() ?? b;
		if (a && b) {
			last = mix(a, b, ease(t));
			ghost.style.transform = ghostTransform(last, width);
		}
		if (t >= 1) {
			over = true;
			finish(true);
			return;
		}
		id = requestAnimationFrame(tick);
	};
	id = requestAnimationFrame(tick);
	return {
		done,
		stop: () => {
			if (!over) {
				over = true;
				cancelAnimationFrame(id);
				finish(false);
			}
			return last;
		}
	};
}
