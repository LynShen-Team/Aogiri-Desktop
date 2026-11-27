<script lang="ts" generics="T">
	// Items in pages of `cols × rows`, side by side; a page turns with the arrows, a swipe or the dots (the website's
	// PageStrip, phone.tsx, wide). Rows "auto": two when the strip is tall enough for two rows of readable cards,
	// else one. The page itself never scrolls; only the strip does, sideways, a page at a time.
	import type { Snippet } from 'svelte';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import { t } from '$lib/i18n';

	let {
		items,
		key,
		cols,
		rows,
		kind,
		arrows = false,
		item,
		empty
	}: {
		items: T[];
		key: (item: T) => string;
		cols: number;
		rows: number | 'auto';
		/** Sizing of a cell: a card pocket, or a market tile (a card with two lines under it). */
		kind: 'pocket' | 'tile';
		arrows?: boolean;
		item: Snippet<[T]>;
		empty?: Snippet;
	} = $props();

	let strip = $state<HTMLDivElement>();
	let height = $state(0);
	let at = $state(0);

	$effect(() => {
		const node = strip;
		if (!node || rows !== 'auto') return;
		const observer = new ResizeObserver(() => (height = node.clientHeight));
		observer.observe(node);
		height = node.clientHeight;
		return () => observer.disconnect();
	});

	const rowCount = $derived(rows === 'auto' ? (height >= 540 ? 2 : 1) : rows);
	const per = $derived(cols * rowCount);
	const pages = $derived(Array.from({ length: Math.max(1, Math.ceil(items.length / per)) }, (_, k) => items.slice(k * per, (k + 1) * per)));
	const shown = $derived(Math.min(at, pages.length - 1));

	// A new list starts at its first page.
	$effect(() => {
		void items.length;
		strip?.scrollTo({ left: 0 });
	});

	const go = (index: number) => strip?.scrollTo({ left: index * strip.clientWidth, behavior: 'smooth' });
</script>

{#if items.length === 0 && empty}
	<div class="none">{@render empty()}</div>
{:else}
	<div class="wrap">
		<div class="frame">
			<div bind:this={strip} class="ce-pages-strip" onscroll={(event) => (at = Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))}>
				{#each pages as page, index (index)}
					<div class="ce-page" data-cols={cols} data-rows={rowCount} data-kind={kind} style:--cols={cols} style:--rows={rowCount}>
						<div class="ce-page-grid">
							{#each page as entry (key(entry))}{@render item(entry)}{/each}
						</div>
					</div>
				{/each}
			</div>
			{#if arrows && pages.length > 1}
				<button type="button" class="ce-book-arrow" data-side="left" disabled={shown <= 0} onclick={() => go(shown - 1)} aria-label={t('eggMarket.prev')}>
					<CaretLeftIcon size={20} />
				</button>
				<button type="button" class="ce-book-arrow" data-side="right" disabled={shown >= pages.length - 1} onclick={() => go(shown + 1)} aria-label={t('eggMarket.next')}>
					<CaretRightIcon size={20} />
				</button>
			{/if}
		</div>
		{#if pages.length > 1}
			<div class="ce-dots" role="tablist" aria-label={t('eggMarket.pages')}>
				{#each pages as _, index (index)}
					<button type="button" role="tab" class="ce-dot" aria-selected={index === shown} aria-label={t('eggMarket.page', { n: index + 1 })} onclick={() => go(index)}></button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.wrap {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-height: 0;
		padding: 0 20px;
	}
	.frame {
		position: relative;
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-height: 0;
	}
	.none {
		display: flex;
		flex: 1 1 auto;
		align-items: center;
		justify-content: center;
		min-height: 0;
		padding: 0 20px;
	}
</style>
