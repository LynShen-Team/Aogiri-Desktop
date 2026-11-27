<script lang="ts">
	// One card to choose in a dialog's grid (take, list, direct trade): its face, a caption under it, and whether it
	// is chosen (a ring, as the website draws it).
	import type { ArtCard } from '../art';
	import Thumb from './Thumb.svelte';

	let {
		def,
		on,
		caption,
		dim = false,
		badge = null,
		numeric = false,
		onclick
	}: {
		def: ArtCard;
		on: boolean;
		caption: string;
		dim?: boolean;
		/** A mark at the corner (「缺」). */
		badge?: string | null;
		numeric?: boolean;
		onclick: () => void;
	} = $props();
</script>

<button type="button" class="pick" aria-pressed={on} {onclick}>
	<Thumb {def} {dim} />
	<span class="cap" class:numeric>{caption}</span>
	{#if badge}<span class="ce-new">{badge}</span>{/if}
</button>

<style>
	.pick {
		position: relative;
		display: block;
		min-width: 0;
		margin: 0;
		padding: 4px;
		border: 0;
		border-radius: var(--r-md);
		background: none;
		color: var(--text);
		font: inherit;
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			box-shadow var(--t-fast) var(--ease-out);
	}
	.pick:hover {
		background: var(--surface2);
	}
	.pick[aria-pressed='true'] {
		background: color-mix(in oklab, var(--text) 10%, transparent);
		box-shadow: 0 0 0 2px var(--text);
	}
	.cap {
		display: block;
		margin-top: 4px;
		font-size: var(--fs-xs);
		line-height: 16px;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.numeric {
		font-variant-numeric: tabular-nums;
	}
</style>
