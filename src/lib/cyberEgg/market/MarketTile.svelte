<script lang="ts">
	// CE-X4: one card of the market grid: how many put it up and how many want it, and whether I have it. The
	// website's MarketTile markup, so its tile rules (card.web.css, `.ce-market-tile > span:nth-child(…)`) lay it out.
	import { t } from '$lib/i18n';
	import { TIER_LOOK, type ArtCard } from '../art';
	import Thumb from './Thumb.svelte';

	let { def, offers, wants, mine, onOpen }: { def: ArtCard; offers: number; wants: number; mine: number; onOpen: () => void } = $props();
</script>

<button type="button" class="ce-market-tile tile" onclick={onOpen} aria-label={t('eggMarket.market.openCard', { name: def.name })}>
	<span class="face">
		<Thumb {def} />
		{#if mine > 0}<span class="ce-count">×{mine}</span>{:else}<span class="ce-new">{t('eggMarket.hall.missing')}</span>{/if}
	</span>
	<span class="name-row">
		<span class="name">{def.name}</span>
		<span class="code">{TIER_LOOK[def.tier].code}</span>
	</span>
	<span class="counts">
		<span class="count" class:on={offers > 0}>{t('eggMarket.market.offers', { count: offers })}</span>
		<span class="count" class:on={wants > 0}>{t('eggMarket.market.wants', { count: wants })}</span>
	</span>
</button>

<style>
	.tile {
		min-width: 0;
		text-align: left;
		color: var(--text);
	}
	.face {
		position: relative;
		display: block;
	}
	.name-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		margin-top: 12px;
	}
	.name {
		min-width: 0;
		font-size: var(--fs-sm);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.code {
		flex: none;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.counts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		margin-top: 6px;
		font-size: var(--fs-xs);
		font-variant-numeric: tabular-nums;
	}
	.count {
		padding: 4px 8px;
		border-radius: var(--r-sm);
		color: var(--dim);
	}
	.count.on {
		background: var(--surface2);
		color: var(--text);
	}
</style>
