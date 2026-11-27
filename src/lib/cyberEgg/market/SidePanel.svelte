<script lang="ts">
	// A panel that slides in from the right over the 赛博鸡蛋 page (the website's right Sheet): a card's market, the
	// latest swaps. A scrim behind it; Escape, the scrim and its × close it; focus stays inside while it is open and
	// goes back to what opened it. It sits in the page (under the title bar, over the page's navigation and main
	// column), or over the window when there is no page around it.
	import type { Snippet } from 'svelte';
	import type { TransitionConfig } from 'svelte/transition';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import { focusTrap } from '$lib/focusTrap';
	import { t } from '$lib/i18n';
	import { EASE_EXIT, EASE_SOFT, motionMs, scrim } from '$lib/ui/motion';
	import { scrimClick } from '$lib/ui/scrimClick';

	let {
		width = 460,
		label,
		onClose,
		head,
		children,
		footer
	}: {
		width?: number;
		/** The panel's accessible name. */
		label: string;
		onClose: () => void;
		head?: Snippet;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	let host = $state<'page' | 'window'>('page');

	/** Into the 赛博鸡蛋 page, out of the market's own layout (and its scroll and clip). */
	function portal(node: HTMLElement) {
		// The sheet's focusTrap has already focused its first control; moving the node blurs it (as in ui/Modal).
		const focused = document.activeElement;
		const page = node.parentElement?.closest<HTMLElement>('.egg-page');
		host = page ? 'page' : 'window';
		(page ?? document.body).appendChild(node);
		if (focused instanceof HTMLElement && focused !== document.activeElement && node.contains(focused)) focused.focus();
		return { destroy: () => node.remove() };
	}

	/** In from the right on the drawer curve; out faster. Transform only. */
	function slide(_node: Element, _params = {}, { direction }: { direction?: 'in' | 'out' | 'both' } = {}): TransitionConfig {
		const out = direction === 'out';
		return {
			duration: motionMs(out ? 200 : 320),
			easing: out ? EASE_EXIT : EASE_SOFT,
			css: (_t, u) => `transform: translateX(${(u * 100).toFixed(3)}%)`
		};
	}

	const away = scrimClick(() => onClose());

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		// The page closes itself on an Escape that reaches the window.
		event.preventDefault();
		event.stopPropagation();
		onClose();
	}
</script>

<div class="panel-root">
	<div
		use:portal
		class="scrim"
		data-host={host}
		role="presentation"
		in:scrim|global
		out:scrim|global
		onpointerdown={away.onpointerdown}
		onpointerup={away.onpointerup}
		onclick={away.onclick}
		{onkeydown}
	>
		<div class="sheet" role="dialog" aria-modal="true" aria-label={label} tabindex="-1" style:width="min({width}px, 100%)" in:slide|global out:slide|global use:focusTrap>
			<!-- First, so it takes the focus when the panel opens (not the first row's action). -->
			<button type="button" class="x" aria-label={t('eggMarket.close')} onclick={onClose}><XIcon size={18} /></button>
			{#if head}<div class="head">{@render head()}</div>{/if}
			<div class="body">{@render children()}</div>
			{#if footer}<div class="foot">{@render footer()}</div>{/if}
		</div>
	</div>
</div>

<style>
	.panel-root {
		display: contents;
	}
	.scrim {
		position: absolute;
		inset: 0;
		z-index: 40;
		overflow: hidden;
	}
	.scrim[data-host='window'] {
		position: fixed;
		z-index: 90;
	}
	.scrim::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--scrim);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
		pointer-events: none;
	}
	.sheet {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-left: 1px solid var(--divider);
		background: var(--bg);
		box-shadow: var(--shadow-modal);
		outline: none;
	}
	.head {
		flex: none;
	}
	.body {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-height: 0;
	}
	.foot {
		flex: none;
	}
	.x {
		position: absolute;
		top: 14px;
		right: 14px;
		display: inline-flex;
		padding: 6px;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim);
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}
	.x:hover {
		background: var(--surface2);
		color: var(--text);
	}
</style>
