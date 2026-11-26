// The app's sounds, synthesized rather than shipped as files: a small bar of
// wood (梧桐, the parasol tree the app is named for) struck with a soft
// mallet. A strike rings the bar's three modes, tuned as a marimba bar's are
// (about 1 : 4 : 10), the upper ones quieter and shorter, and a small room
// follows. One timbre, a short motif for each event:
//   done        three notes rising to the tonic (C♯5 E5 A5)
//   attention   a falling minor third, the interval of calling someone (B5 G♯5)
//   error       two low notes falling, muted (F4 C4)
//   message     a quick grace note up to a light high one (A5 E6)
//   background  two softer notes rising, the end of `done` (E5 A5)
//   sent        one light, short strike (C♯6)
//   copied      the lightest tick, highest and shortest (A6)
//   connected   an octave rising, low and soft (A4 A5)
//   disconnected the same octave falling, muted (A5 A4)
// Pure and deterministic: the app, the tests and the preview page render the
// same samples. Only erasable TypeScript, so Node can run it as it is.

export type SoundKind = 'done' | 'attention' | 'error' | 'message' | 'background' | 'sent' | 'copied' | 'connected' | 'disconnected';
export const SOUND_KINDS: readonly SoundKind[] = ['done', 'attention', 'error', 'message', 'background', 'sent', 'copied', 'connected', 'disconnected'];

/** A strike: MIDI note, onset (s), level. */
type Strike = [number, number, number];

interface Motif {
	strikes: Strike[];
	/** Seconds, room tail included. */
	length: number;
	/** Peak level of the rendered sound (before the volume). */
	peak: number;
	/** How long the notes ring, against the bar's own decay. */
	decay: number;
	/** How much of the upper modes the mallet brings out (a harder mallet is brighter). */
	bright: number;
}

const MOTIFS: Record<SoundKind, Motif> = {
	done: {
		strikes: [
			[73, 0, 0.72],
			[76, 0.085, 0.82],
			[81, 0.17, 1]
		],
		length: 0.58,
		peak: 0.8,
		decay: 1,
		bright: 0.9
	},
	attention: {
		strikes: [
			[83, 0, 1],
			[80, 0.16, 0.92]
		],
		length: 0.52,
		peak: 0.74,
		decay: 0.95,
		bright: 1
	},
	error: {
		strikes: [
			[65, 0, 1],
			[60, 0.1, 0.95]
		],
		length: 0.42,
		peak: 0.76,
		decay: 0.6,
		bright: 0.6
	},
	message: {
		strikes: [
			[81, 0, 0.5],
			[88, 0.055, 1]
		],
		length: 0.36,
		peak: 0.6,
		decay: 0.7,
		bright: 0.8
	},
	background: {
		strikes: [
			[76, 0, 0.85],
			[81, 0.1, 1]
		],
		length: 0.48,
		peak: 0.56,
		decay: 0.85,
		bright: 0.75
	},
	sent: {
		strikes: [[85, 0, 1]],
		length: 0.22,
		peak: 0.4,
		decay: 0.5,
		bright: 0.6
	},
	copied: {
		strikes: [[93, 0, 1]],
		length: 0.14,
		peak: 0.3,
		decay: 0.35,
		bright: 0.5
	},
	connected: {
		strikes: [
			[69, 0, 0.8],
			[81, 0.11, 1]
		],
		length: 0.5,
		peak: 0.55,
		decay: 0.85,
		bright: 0.7
	},
	disconnected: {
		strikes: [
			[81, 0, 0.85],
			[69, 0.13, 1]
		],
		length: 0.46,
		peak: 0.55,
		decay: 0.6,
		bright: 0.5
	}
};

/** The bar's modes: frequency ratio, level, decay against the fundamental's. */
const MODES: [number, number, number][] = [
	[1, 1, 1],
	[3.96, 0.3, 0.32],
	[9.7, 0.09, 0.12]
];
/** The fundamental's decay time constant (s) at 660 Hz; lower notes ring longer. */
const DECAY = 0.12;
/** The mallet's contact: the attack's time constant (s). */
const ATTACK = 0.0007;
/** Room: the reverb's mix against the bar, its decay to -60 dB (s), its damping (0–1). */
const ROOM_MIX = 0.18;
const ROOM_TIME = 0.32;
const ROOM_DAMP = 0.4;
/** The last stretch fades out, so a tail never stops on a click. */
const FADE = 0.04;

export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Seconds `kind` lasts. */
export function soundLength(kind: SoundKind): number {
	return MOTIFS[kind].length;
}

/** Adds one strike of the bar at `f` Hz into `out`, starting at sample `start`. */
function strike(out: Float32Array, rate: number, f: number, start: number, level: number, decay: number, bright: number) {
	const tau1 = DECAY * Math.sqrt(660 / f) * decay;
	for (const [ratio, modeLevel, modeDecay] of MODES) {
		const fm = f * ratio;
		if (fm >= rate * 0.45) continue;
		const amp = level * modeLevel * (ratio === 1 ? 1 : bright);
		const tau = tau1 * modeDecay;
		const w = (2 * Math.PI * fm) / rate;
		const fall = Math.exp(-1 / (tau * rate));
		const rise = Math.exp(-1 / (ATTACK * rate));
		let env = amp;
		let attack = 1;
		for (let n = start; n < out.length; n++) {
			out[n] += env * (1 - attack) * Math.sin(w * (n - start));
			env *= fall;
			attack *= rise;
			if (env < 1e-5) break;
		}
	}
}

/** A small room: four damped feedback combs in parallel, then two allpasses
 *  (the classic Schroeder layout), about a third of a second long. */
function room(dry: Float32Array, rate: number): Float32Array {
	const wet = new Float32Array(dry.length);
	for (const d of [0.0253, 0.0291, 0.0337, 0.0389]) {
		const size = Math.round(d * rate);
		const gain = 10 ** ((-3 * d) / ROOM_TIME);
		const line = new Float32Array(size);
		let lp = 0;
		for (let n = 0, i = 0; n < dry.length; n++, i = (i + 1) % size) {
			const y = line[i];
			lp = y * (1 - ROOM_DAMP) + lp * ROOM_DAMP;
			line[i] = dry[n] + lp * gain;
			wet[n] += y / 4;
		}
	}
	for (const [d, g] of [
		[0.0051, 0.6],
		[0.0017, 0.6]
	]) {
		const size = Math.round(d * rate);
		const line = new Float32Array(size);
		for (let n = 0, i = 0; n < wet.length; n++, i = (i + 1) % size) {
			const delayed = line[i];
			const x = wet[n];
			const v = x + g * delayed;
			line[i] = v;
			wet[n] = delayed - g * v;
		}
	}
	return wet;
}

/** The mono samples of `kind` at `rate`. */
export function renderSound(kind: SoundKind, rate: number): Float32Array<ArrayBuffer> {
	const motif = MOTIFS[kind];
	const length = Math.ceil(motif.length * rate);
	const dry = new Float32Array(length);
	for (const [note, at, level] of motif.strikes) strike(dry, rate, hz(note), Math.round(at * rate), level, motif.decay, motif.bright);
	const wet = room(dry, rate);
	const out = new Float32Array(length);
	let peak = 0;
	for (let n = 0; n < length; n++) {
		out[n] = dry[n] + wet[n] * ROOM_MIX;
		peak = Math.max(peak, Math.abs(out[n]));
	}
	const gain = motif.peak / (peak || 1);
	const fade = Math.round(FADE * rate);
	for (let n = 0; n < length; n++) {
		const left = length - 1 - n;
		const tail = left < fade ? 0.5 - 0.5 * Math.cos((Math.PI * left) / fade) : 1;
		out[n] *= gain * tail;
	}
	return out;
}
