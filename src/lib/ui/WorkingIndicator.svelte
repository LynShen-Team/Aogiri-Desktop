<script lang="ts">
	// While something works: the dot glyph (DotGlyph.svelte) moving as the
	// work does (`mode`), 工作中 with a light that sweeps it on the running
	// titles' clock (shimmer.ts), and the time since `startedAt` (working.ts),
	// ticking each second while the page shows. Reduced motion: the mode's
	// still glyph and still words; the time still ticks. It sits on --bg
	// unless the parent sets --row-bg (the veil's colour, as RunLight's).
	import { t } from '$lib/i18n';
	import { visibleInterval } from '$lib/visibleInterval';
	import DotGlyph from './DotGlyph.svelte';
	import type { GlyphMode } from './dotGlyph';
	import { shimmer } from './shimmer';
	import { workingElapsed } from './working';

	let {
		startedAt = 0,
		size = 16,
		mode = 'think',
		label,
		elapsedTitle
	}: {
		/** When the work began (ms since the epoch); 0: no time shown. */
		startedAt?: number;
		/** The glyph's size in px. */
		size?: number;
		/** What the work is doing, for the glyph's motion (dotGlyph.ts). */
		mode?: GlyphMode;
		/** The words (default 工作中 / Working). */
		label?: string;
		/** A tooltip for the time. */
		elapsedTitle?: string;
	} = $props();

	let now = $state(Date.now());
	$effect(() => {
		if (!startedAt) return;
		now = Date.now();
		return visibleInterval(() => (now = Date.now()), 500);
	});
</script>

<span class="working">
	<DotGlyph {size} {mode} />
	<span class="label">{label ?? t('chat.working.label')}<i class="veil" aria-hidden="true" use:shimmer={'canvas'}></i></span>
	{#if startedAt > 0}<span class="elapsed" title={elapsedTitle}>{workingElapsed(now - startedAt)}</span>{/if}
</span>

<style>
	/* The glyph's dots in --text: their own opacity gives the depth. */
	.working {
		color: var(--text);
		display: inline-flex;
		align-items: center;
		gap: 7px;
		flex-shrink: 0;
		min-width: 0;
		white-space: nowrap;
	}
	/* The words in --text under a veil in the colour beneath them, so they
	   read muted, with a clear window that crosses them (shimmer.ts): one
	   word or character at full colour at a time. */
	.label {
		position: relative;
		overflow: hidden;
		color: var(--text);
	}
	.veil {
		--veil: 38%;
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 300%;
		pointer-events: none;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--row-bg, var(--bg)) var(--veil), transparent) 0%,
			color-mix(in srgb, var(--row-bg, var(--bg)) var(--veil), transparent) 41%,
			transparent 50%,
			color-mix(in srgb, var(--row-bg, var(--bg)) var(--veil), transparent) 59%,
			color-mix(in srgb, var(--row-bg, var(--bg)) var(--veil), transparent) 100%
		);
		transform: translateX(-60%);
	}
	:global([data-theme='light']) .veil {
		--veil: 32%;
	}
	.elapsed {
		flex-shrink: 0;
		color: var(--dim2);
		font-variant-numeric: tabular-nums;
	}
	/* A background image under the canvas: the veil cannot match it, so
	   the words are plain --dim. Reduced motion: the same, still. */
	:global(:root[data-canvas-bg]) .label {
		color: var(--dim);
	}
	:global(:root[data-canvas-bg]) .veil {
		display: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.label {
			color: var(--dim);
		}
		.veil {
			display: none;
		}
	}
</style>
