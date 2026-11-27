<script lang="ts">
	// CE-X4: the latest swaps in the market. A card beside the grid on a wide window; bare inside the side panel.
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import { t } from '$lib/i18n';
	import type { EggTradeEvent } from '../api';
	import { cardById } from '../art';
	import { yuan } from '../eligibility';
	import Thumb from './Thumb.svelte';
	import { ago } from './shared';

	let { items, now, bare = false }: { items: EggTradeEvent[]; now: number; bare?: boolean } = $props();

	/** A direct swap of several cards names the first and how many in all. */
	const named = (id: string, count: number | undefined) => (cardById(id)?.name ?? '') + ((count ?? 1) > 1 ? t('eggMarket.market.andMore', { count: count ?? 1 }) : '');
</script>

<div class="recent" class:bare>
	{#if !bare}<h2>{t('eggMarket.market.recent')}</h2>{/if}
	{#if items.length === 0}
		<p class="none">{t('eggMarket.market.noRecent')}</p>
	{:else}
		<ul>
			{#each items as item (item.id)}
				{@const gave = cardById(item.gave)}
				{@const got = cardById(item.got)}
				<li>
					<span class="pair">
						<span class="mini">{#if gave}<Thumb def={gave} />{/if}</span>
						<ArrowsLeftRightIcon size={12} aria-hidden="true" />
						<span class="mini">{#if got}<Thumb def={got} />{/if}</span>
					</span>
					<span class="txt">
						<span class="line">
							{t('eggMarket.market.recentLine', { who: item.who, gave: named(item.gave, item.gave_count), got: named(item.got, item.got_count) })}{#if item.topup_fen}{t(item.topup_fen > 0 ? 'eggMarket.topup.recentPaid' : 'eggMarket.topup.recentGot', { amount: yuan(Math.abs(item.topup_fen)) })}{/if}
						</span>
						<span class="when">{ago(item.at, now)}</span>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.recent {
		min-width: 0;
		padding: 20px;
		border: 1px solid var(--border);
		border-radius: var(--r-xl);
		background: var(--panel);
	}
	.recent.bare {
		padding: 0;
		border: 0;
		border-radius: 0;
		background: none;
	}
	h2 {
		margin: 0;
		font-size: var(--fs-sm);
		font-weight: 600;
		color: var(--text);
	}
	ul {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
	}
	.bare ul {
		margin-top: 0;
	}
	li {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.pair {
		display: flex;
		flex: none;
		align-items: center;
		gap: 4px;
		color: var(--dim);
	}
	.mini {
		width: 28px;
	}
	.txt {
		min-width: 0;
		font-size: var(--fs-sm);
		line-height: 20px;
	}
	.line {
		display: block;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.when {
		display: block;
		font-size: var(--fs-xs);
		line-height: 16px;
		color: var(--dim);
	}
	.none {
		margin: 12px 0 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.bare .none {
		margin-top: 0;
	}
</style>
