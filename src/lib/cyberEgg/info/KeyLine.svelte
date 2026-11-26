<script lang="ts">
	// One line of the key card (the website's `usage.tsx` Line): a label, the value in mono, and its buttons at the end.
	// `strong`: the key in full, framed and wrapping whole.
	import type { Snippet } from 'svelte';

	let { label, value, strong = false, actions }: { label: string; value: string; strong?: boolean; actions?: Snippet } = $props();
</script>

<div class="line" class:strong>
	<span class="label">{label}</span>
	<code class="value">{value}</code>
	{#if actions}<span class="actions">{@render actions()}</span>{/if}
</div>

<style>
	.line {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		min-height: 44px;
		padding: 6px 6px 6px 12px;
		border: 1px solid transparent;
		border-radius: var(--r-md);
		background: var(--surface2);
	}
	.line.strong {
		border-color: color-mix(in oklab, var(--text) 25%, transparent);
		background: var(--panel);
	}
	/* One width for every line's label, so the values line up (the card sets it for the language). */
	.label {
		flex: none;
		width: var(--key-label, 64px);
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.value {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		color: var(--text);
	}
	.strong .value {
		overflow: visible;
		white-space: normal;
		word-break: break-all;
	}
	.actions {
		display: inline-flex;
		flex: none;
		gap: 2px;
	}
	/* The line's icon buttons: 28px, the app's ghost look. */
	.actions :global(button) {
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim);
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}
	.actions :global(button:hover:not(:disabled)) {
		background: color-mix(in oklab, var(--text) 8%, transparent);
		color: var(--text);
	}
	.actions :global(button:disabled) {
		opacity: 0.45;
		cursor: default;
	}
</style>
