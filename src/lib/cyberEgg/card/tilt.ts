// cyber-egg.spec.md CE-C4: the spring that turns a card toward the pointer (the gateway's card3d.tsx
// `useTilt`, without React). It writes the card's CSS variables and moves every foil gradient.

const MAX_TILT = 20;

export interface TiltOptions {
	/** Sways slowly by itself while the pointer is away. */
	sway?: boolean;
	/** Turns under the pointer. */
	interactive?: boolean;
	/** Holds the card at a tilt (−1..1 each way) instead of following the pointer. */
	pose?: { x: number; y: number } | null;
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const reduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

export class Tilt {
	#root: HTMLElement;
	#opts: TiltOptions;
	#x = 0;
	#y = 0;
	#vx = 0;
	#vy = 0;
	#tx = 0;
	#ty = 0;
	#raf = 0;
	#hover = false;
	#t0 = performance.now();
	#gradients: SVGLinearGradientElement[] = [];
	#onVisibility = () => {
		if (document.hidden && this.#raf) {
			cancelAnimationFrame(this.#raf);
			this.#raf = 0;
		} else if (!document.hidden && this.#opts.sway && !reduced()) this.#kick();
	};

	constructor(root: HTMLElement, opts: TiltOptions) {
		this.#root = root;
		this.#opts = opts;
		document.addEventListener('visibilitychange', this.#onVisibility);
		this.refresh();
		this.update(opts);
	}

	/** Finds the foil gradients again (after the art is drawn) and applies the current tilt. */
	refresh() {
		this.#gradients = Array.from(this.#root.querySelectorAll<SVGLinearGradientElement>('linearGradient[data-foil]'));
		this.#apply();
	}

	update(opts: TiltOptions) {
		const was = this.#opts;
		this.#opts = opts;
		if (opts.sway && !was.sway) this.#t0 = performance.now();
		if (opts.sway && !reduced()) this.#kick();
		if (opts.pose) {
			this.#tx = opts.pose.x;
			this.#ty = opts.pose.y;
			this.#kick();
		} else if (was.pose && !this.#hover) {
			this.#tx = 0;
			this.#ty = 0;
			this.#kick();
		}
	}

	move = (event: PointerEvent) => {
		if (!this.#opts.interactive || this.#opts.pose) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		this.#hover = true;
		this.#tx = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1);
		this.#ty = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1);
		this.#kick();
	};

	leave = () => {
		if (!this.#opts.interactive || this.#opts.pose) return;
		this.#hover = false;
		this.#tx = 0;
		this.#ty = 0;
		this.#t0 = performance.now() - 2600;
		this.#kick();
	};

	destroy() {
		document.removeEventListener('visibilitychange', this.#onVisibility);
		if (this.#raf) cancelAnimationFrame(this.#raf);
		this.#raf = 0;
	}

	#apply() {
		const s = this.#root.style;
		const x = this.#x;
		const y = this.#y;
		s.setProperty('--rx', `${(-y * MAX_TILT).toFixed(2)}deg`);
		s.setProperty('--ry', `${(x * MAX_TILT).toFixed(2)}deg`);
		s.setProperty('--px', x.toFixed(3));
		s.setProperty('--py', y.toFixed(3));
		s.setProperty('--gx', `${(50 + x * 42).toFixed(1)}%`);
		s.setProperty('--gy', `${(50 + y * 42).toFixed(1)}%`);
		s.setProperty('--hyp', Math.min(1, Math.hypot(x, y)).toFixed(3));
		for (const gradient of this.#gradients) {
			const [w, h, k] = (gradient.dataset.foil ?? '0 0 0').split(' ').map(Number);
			gradient.setAttribute('gradientTransform', `translate(${(x * w * k).toFixed(1)} ${(y * h * k).toFixed(1)})`);
		}
	}

	#kick() {
		if (!this.#raf) this.#raf = requestAnimationFrame(this.#step);
	}

	#step = (now: number) => {
		const sway = this.#opts.sway && !this.#opts.pose;
		if (sway && !this.#hover) {
			const t = (now - this.#t0) / 1000;
			this.#tx = Math.sin(t * 0.55) * 0.5;
			this.#ty = Math.sin(t * 0.38 + 1.2) * 0.34;
		}
		// A spring with a little bounce: follows the hand, settles without shaking.
		const k = 0.08;
		const damping = 0.78;
		this.#vx = (this.#vx + (this.#tx - this.#x) * k) * damping;
		this.#vy = (this.#vy + (this.#ty - this.#y) * k) * damping;
		this.#x += this.#vx;
		this.#y += this.#vy;
		this.#apply();
		const settled =
			Math.abs(this.#tx - this.#x) < 0.001 && Math.abs(this.#ty - this.#y) < 0.001 && Math.abs(this.#vx) < 0.001 && Math.abs(this.#vy) < 0.001;
		if (settled && !(sway && !this.#hover)) {
			this.#raf = 0;
			return;
		}
		this.#raf = requestAnimationFrame(this.#step);
	};
}
