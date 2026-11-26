<script lang="ts">
	// The market's dialogs, laid out as the website's are: the title and its one-line description, a row that stays
	// (the direct trade's search), then the choices, which scroll on their own; the buttons stay below them
	// (owner 2026-11-26 「相同都要检查一下」).
	import type { Snippet } from 'svelte';
	import Modal from '$lib/ui/Modal.svelte';

	let {
		title,
		description = '',
		width = 512,
		busy = false,
		onClose,
		top,
		children,
		footer
	}: {
		title: string;
		description?: string;
		/** The website's max-w-lg (512) or max-w-2xl (672). */
		width?: number;
		/** A request in flight: Escape and the scrim do nothing. */
		busy?: boolean;
		onClose: () => void;
		top?: Snippet;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<Modal {title} {width} dismissible={!busy} padded={false} {onClose} {footer}>
	<div class="dlg">
		{#if description}<p class="desc">{description}</p>{/if}
		{#if top}<div class="top">{@render top()}</div>{/if}
		<div class="scroll">{@render children()}</div>
	</div>
</Modal>

<style>
	.dlg {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		gap: 16px;
		min-height: 0;
		padding: 2px 22px 20px;
	}
	.desc {
		flex: none;
		margin: 0;
		font-size: var(--fs-sm);
		line-height: 20px;
		color: var(--dim);
	}
	.top {
		flex: none;
	}
	.scroll {
		display: grid;
		flex: 1 1 auto;
		grid-auto-rows: max-content;
		align-content: start;
		gap: 16px;
		min-height: 0;
		margin: 0 -4px;
		padding: 2px 4px 4px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
</style>
