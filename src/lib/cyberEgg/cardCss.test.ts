import { describe, expect, it } from 'vitest';
import { extractCardCss } from './cardCss';

const WEB = `
@import url("x.css");
/* the card */
.ce-card { position: relative; }
.dark .ce-shadow { background: rgb(0 0 0 / 0.7); }
.ce-card:focus-visible .ce-skin, .ce-card:focus-visible .ce-back { box-shadow: 0 0 0 2px hsl(var(--ring)); }
.ce-scene[data-look="studio"] .ce-aura, .ce-aura { --aura: var(--aura-glow); }
.ce-binder { display: grid; }
.ce-pocket .ce-card { width: 100%; }
.ce-card-unowned .ce-depth { filter: blur(3px) grayscale(1); }
.ce-lock-tag { color: hsl(var(--muted-foreground)); background: hsl(var(--background) / 0.8); }
.ce-spin { animation: ce-spin 40s linear infinite; }
.ce-paused .ce-card :is(.ce-spin, .ce-anim) { animation-play-state: paused; }
.ce-card:not([data-live]) :is(.ce-spin, .ce-anim) { animation-play-state: paused; }
@keyframes ce-spin { to { transform: rotate(360deg); } }
@keyframes ce-scene-cloud { to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .ce-spin { animation: none; }
  .ce-scene-cloud { animation: none; }
}
@media (min-width: 768px) { .ce-scene-fit { gap: 8px; } }
.ce-scene[data-look="studio"] .ce-pocket { box-shadow: none; }
`;

describe('the web card CSS the desktop takes', () => {
	const out = extractCardCss(WEB);
	it('keeps the card, its states and the pictures’ motion', () => {
		expect(out).toContain('.ce-card {');
		expect(out).toContain('.ce-card-unowned .ce-depth {');
		expect(out).toContain('.ce-spin {');
		expect(out).toContain('.ce-card:not([data-live]) :is(.ce-spin, .ce-anim)');
	});
	it('keeps the shared pages’ layout (album pockets) and leaves out the web’s own scene, also inside a list or a media query', () => {
		expect(out).toContain('.ce-pocket .ce-card {');
		expect(out).not.toContain('ce-binder');
		expect(out).not.toContain('ce-scene');
		expect(out).not.toContain('ce-paused');
		expect(out).not.toContain('@import');
		expect(out).toContain('.ce-aura {');
	});
	it('keeps a media query for the card rules inside it, and only the keyframes a kept rule uses', () => {
		expect(out).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n\t\.ce-spin \{/);
		expect(out).not.toContain('min-width: 768px');
		expect(out).toContain('@keyframes ce-spin');
		expect(out).not.toContain('@keyframes ce-scene-cloud');
	});
	it('names the theme and the colours the desktop’s way', () => {
		// The attribute weighs what the web's `.dark` class does: the web's own specificity, rule for rule.
		expect(out).toContain("[data-theme='dark'] .ce-shadow {");
		expect(out).not.toContain(':root[data-theme');
		expect(out).toContain('0 0 0 2px var(--brand-bright)');
		expect(out).toContain('color: var(--dim)');
		expect(out).toContain('color-mix(in oklab, var(--bg) 80%, transparent)');
		expect(out).not.toContain('hsl(var(');
	});
});
