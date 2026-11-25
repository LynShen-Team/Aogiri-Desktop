// cyber-egg.spec.md CE-R6: the sounds of opening a pack, made in the browser (Web Audio), no audio files:
// the rustle of the wrapper, the crackle of foil tearing, the flick of a card turning, a soft chime for
// the higher tiers. Quiet by design; one switch turns them off and is remembered on this device.
import type { CardTier } from "./tiers";

const KEY = "cyberEgg.sound";
let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Private mode: the switch lasts for this page only.
  }
}

function audio(): AudioContext | null {
  if (!soundOn()) return null;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && !context) return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume();
    if (!noise) {
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let k = 0; k < data.length; k += 1) data[k] = Math.random() * 2 - 1;
    }
    return context;
  } catch {
    return null;
  }
}

/** A burst of filtered noise. */
function burst(ctx: AudioContext, at: number, duration: number, gain: number, filter: BiquadFilterType, frequency: number, q = 1, sweepTo?: number) {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.playbackRate.value = 0.8 + Math.random() * 0.4;
  const band = ctx.createBiquadFilter();
  band.type = filter;
  band.frequency.setValueAtTime(frequency, at);
  if (sweepTo) band.frequency.exponentialRampToValueAtTime(sweepTo, at + duration);
  band.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(gain, at + Math.min(0.012, duration / 4));
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(band).connect(amp).connect(ctx.destination);
  source.start(at, Math.random() * 0.5, duration + 0.05);
}

/** The wrapper shaken or picked up. */
export function playRustle() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let k = 0; k < 7; k += 1) burst(ctx, now + k * 0.045 + Math.random() * 0.02, 0.06 + Math.random() * 0.05, 0.05, "bandpass", 3200 + Math.random() * 2400, 0.9);
}

/** Foil tearing a little further: a few dry crackles. `amount` 0..1 is how far the hand moved. */
export function playCrackle(amount: number) {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const count = 1 + Math.round(amount * 5);
  for (let k = 0; k < count; k += 1) burst(ctx, now + Math.random() * 0.05, 0.008 + Math.random() * 0.016, 0.1 + Math.random() * 0.08, "highpass", 2600 + Math.random() * 3000, 0.7);
}

/** The strip coming off: a short rip. */
export function playRip() {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  burst(ctx, now, 0.22, 0.16, "bandpass", 1800, 0.8, 6200);
  for (let k = 0; k < 10; k += 1) burst(ctx, now + k * 0.02, 0.012, 0.09, "highpass", 3500, 0.7);
}

/** A card turning over. */
export function playFlip(soft = false) {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  burst(ctx, now, 0.14, soft ? 0.03 : 0.07, "bandpass", 900, 0.7, 3200);
  burst(ctx, now + 0.12, 0.02, soft ? 0.04 : 0.09, "highpass", 2200, 0.8);
}

/** Cards fanned out of the pack. */
export function playDeal(index: number) {
  const ctx = audio();
  if (!ctx) return;
  burst(ctx, ctx.currentTime + index * 0.07, 0.08, 0.035, "bandpass", 2400 + index * 200, 0.9);
}

/** The reveal of a tier: nothing for paper, a soft bell from copper up, a shimmer for the hologram. */
export function playReveal(tier: CardTier) {
  const ctx = audio();
  if (!ctx || tier === "n") return;
  const now = ctx.currentTime;
  const chords: Record<Exclude<CardTier, "n">, number[]> = {
    r: [523.25, 783.99],
    sr: [587.33, 880, 1174.66],
    ssr: [523.25, 659.25, 783.99, 1046.5],
    ur: [587.33, 739.99, 880, 1108.73, 1479.98],
  };
  const notes = chords[tier];
  notes.forEach((frequency, index) => {
    const at = now + index * (tier === "ur" ? 0.09 : 0.06);
    for (const [ratio, level] of [[1, 1], [2.01, 0.28], [3.98, 0.08]] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency * ratio * (tier === "ur" ? 1 + (Math.random() - 0.5) * 0.004 : 1);
      const amp = ctx.createGain();
      const peak = 0.045 * level * (tier === "ur" || tier === "ssr" ? 1 : 0.8);
      amp.gain.setValueAtTime(0, at);
      amp.gain.linearRampToValueAtTime(peak, at + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + (tier === "ur" ? 3.2 : 2.2));
      osc.connect(amp).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 3.4);
    }
  });
  if (tier === "ur" || tier === "ssr") burst(ctx, now, 1.6, 0.02, "highpass", 7000, 0.6);
}
