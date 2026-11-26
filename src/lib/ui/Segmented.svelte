<script lang="ts">
	import { untrack } from 'svelte';

	let {
		value = $bindable(),
		options,
		onChange
	}: { value: string; options: { value: string; label?: string; disabled?: boolean }[]; onChange?: (v: string) => void } = $props();

	function pick(v: string) {
		value = v;
		onChange?.(v);
	}

	// The selected fill is one thumb that slides between the options
	// (transform and its own width only); measured from the buttons, so
	// options of different widths work. Until it is measured, and on a
	// phone-narrow layout, the selected button paints its own fill.
	let track: HTMLDivElement | undefined = $state();
	const buttons: HTMLButtonElement[] = $state([]);
	let thumb = $state<{ x: number; w: number } | null>(null);
	/** False for the first placement, so the thumb does not slide in from 0. */
	let moving = $state(false);

	function measure() {
		const i = options.findIndex((o) => o.value === value);
		const b = buttons[i];
		thumb = b && b.offsetWidth ? { x: b.offsetLeft, w: b.offsetWidth } : null;
	}

	$effect(() => {
		void value;
		void options.length;
		untrack(() => {
			measure();
			if (thumb && !moving) requestAnimationFrame(() => (moving = true));
		});
	});

	$effect(() => {
		if (!track || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => untrack(measure));
		ro.observe(track);
		return () => ro.disconnect();
	});
</script>

<div class="seg" class:thumbed={thumb} bind:this={track}>
	{#if thumb}<span class="thumb" class:moving style:width="{thumb.w}px" style:transform="translateX({thumb.x}px)" aria-hidden="true"></span>{/if}
	{#each options as o, i (o.value)}
		<button class="opt" class:on={o.value === value} aria-pressed={o.value === value} disabled={o.disabled} onclick={() => pick(o.value)} bind:this={buttons[i]}>{o.label ?? o.value}</button>
	{/each}
</div>

<style>
	/* A pill track holding pill segments: concentric, as the 2px gap keeps
	   each segment's ends parallel to the track's (design.md, "Corners"). */
	.seg {
		position: relative;
		isolation: isolate;
		display: inline-flex;
		padding: 2px;
		gap: 2px;
		background: var(--surface2);
		border: 1px solid var(--hairline);
		border-radius: var(--r-full);
	}
	.opt {
		flex: 1;
		padding: 3px 14px;
		border: none;
		background: none;
		color: var(--dim);
		font-size: var(--fs-sm);
		line-height: 18px;
		font-family: var(--font-sans);
		border-radius: var(--r-full);
		cursor: pointer;
		white-space: nowrap;
		transition:
			color var(--t-fast) var(--ease-out),
			background var(--t-fast) var(--ease-out),
			box-shadow var(--t-med) var(--ease-out),
			transform var(--t-fast) var(--ease-spring);
	}
	.opt:hover {
		color: var(--text);
	}
	.opt:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.opt:disabled:hover {
		color: var(--dim);
	}
	.opt:active {
		transform: scale(0.96);
	}
	.opt.on {
		background: var(--panel);
		color: var(--text);
		box-shadow: 0 0 0 1px var(--border);
	}
	/* The sliding thumb: --t-base on --ease-soft, transform and width only. */
	.thumb {
		position: absolute;
		top: 2px;
		bottom: 2px;
		left: 0;
		z-index: -1;
		border-radius: var(--r-full);
		background: var(--panel);
		box-shadow: 0 0 0 1px var(--border);
		pointer-events: none;
	}
	.thumb.moving {
		transition:
			transform var(--t-base) var(--ease-soft),
			width var(--t-base) var(--ease-soft);
	}
	.thumbed .opt.on {
		background: none;
		box-shadow: none;
	}
	/* On a phone the labels can be wider than the control's row (the remote
	   page's new-session dialog: LynShen | Claude Code | Codex in ~300px).
	   The control then keeps to its row: each option sizes from its label
	   and gives way by wrapping between words, never inside one. Without
	   this, the last option ran past the control and the dialog body grew a
	   horizontal scrollbar, which showed as a line above the buttons. Wider
	   windows keep equal-width options (the desktop window is never this
	   narrow). */
	@media (max-width: 640px) {
		.seg {
			max-width: 100%;
		}
		.thumb {
			display: none;
		}
		.thumbed .opt.on {
			background: var(--panel);
			box-shadow: 0 0 0 1px var(--border);
		}
		.opt {
			flex: 1 1 auto;
			padding-inline: 8px;
			white-space: normal;
		}
	}
</style>
