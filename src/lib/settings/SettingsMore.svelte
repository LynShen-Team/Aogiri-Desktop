<script lang="ts">
	// 更多设置: the rarely changed rows of a settings page, folded under one
	// quiet line at the page's foot. The rows stay in the DOM while folded
	// (hidden), so the search can find a row here and open the fold
	// (SettingsPage dispatches `settings-more-open` on it).
	import type { Snippet } from 'svelte';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import { t } from '$lib/i18n';

	let {
		label,
		open = $bindable(false),
		children
	}: {
		/** Defaults to 更多设置. */
		label?: string;
		open?: boolean;
		children: Snippet;
	} = $props();

	let el = $state<HTMLDivElement>();
	$effect(() => {
		const node = el;
		if (!node) return;
		const show = () => (open = true);
		node.addEventListener('settings-more-open', show);
		return () => node.removeEventListener('settings-more-open', show);
	});
</script>

<div class="more" data-settings-more bind:this={el}>
	<button class="head" aria-expanded={open} onclick={() => (open = !open)}>
		<span class="chev" class:open><CaretRightIcon size={12} /></span>
		{label ?? t('settings.page.more')}
	</button>
	<div class="body" hidden={!open}>
		{@render children()}
	</div>
</div>

<style>
	.more {
		margin-top: 28px;
	}
	.head {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 8px 0 4px;
		margin-left: -4px;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-sm);
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}
	.head:hover {
		background: var(--surface2);
		color: var(--text);
	}
	.chev {
		display: inline-flex;
		transition: transform var(--t-med) var(--ease-spring);
	}
	.chev.open {
		transform: rotate(90deg);
	}
	/* The folded sections sit a little closer than the page's own. */
	.body > :global(.sec:first-child) {
		margin-top: 8px;
	}
</style>
