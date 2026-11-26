<script lang="ts">
	// CE-X3, CE-X4: everything of mine: my listings (withdraw), the direct swaps sent to me (decline / accept) and by
	// me (withdraw), and the swaps that are over.
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { TIER_LOOK, cardById } from '../art';
	import { eggApi, eggErrorText, type EggListing, type EggMarketRules, type EggOwnedCard, type EggTrade, type EggTrades } from '../api';
	import Card3D from '../Card3D.svelte';
	import Thumb from './Thumb.svelte';
	import TopupNote from './TopupNote.svelte';
	import { ago, anyOf, moneyLine, serialNo, type Deal } from './shared';

	let {
		listings,
		trades,
		rules,
		now,
		onUnlist,
		onAnswered,
		onReceived
	}: {
		listings: EggListing[];
		trades: EggTrades | null;
		rules: EggMarketRules;
		now: number;
		onUnlist: (item: EggListing) => void;
		/** A request answered: read the swaps again. */
		onAnswered: () => void;
		onReceived: (deal: Deal) => void;
	} = $props();

	let busy = $state<string | null>(null);

	async function answer(trade: EggTrade, value: 'accept' | 'decline' | 'cancel') {
		busy = trade.id;
		try {
			await eggApi.answer(trade.id, value);
			// I am the one it was sent to: I get what they give.
			if (value === 'accept') onReceived({ got: trade.give, gave: trade.want, from: trade.from, money: moneyLine(trade.topup, trade.topup?.by === 'to', rules) });
			else toast.success(t(`eggMarket.trade.done.${value}`));
			onAnswered();
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			busy = null;
		}
	}

	const mine = $derived(listings.filter((item) => item.mine));
	const incoming = $derived(trades?.incoming ?? []);
	const outgoing = $derived(trades?.outgoing ?? []);
	const done = $derived(trades?.done ?? []);
</script>

{#snippet mini(card: EggOwnedCard)}
	{@const def = cardById(card.card_id)}
	{#if def}
		<span class="mini">
			<span class="mini-card"><Card3D card={def} period={def.period} packName="" interactive={false} live={false} /></span>
			<span class="mini-txt">
				<span class="mini-name">{def.name}</span>
				<span class="mini-sub">{TIER_LOOK[def.tier].code} · № {serialNo(card.serial)}</span>
			</span>
		</span>
	{/if}
{/snippet}

{#snippet request(trade: EggTrade, sent: boolean, open: boolean)}
	<li class="req">
		<div class="req-main">
			<span class="req-who">{sent ? t('eggMarket.trade.toLine', { name: trade.to }) : t('eggMarket.trade.fromLine', { name: trade.from })}</span>
			<span class="minis">{#each trade.give as card (card.id)}{@render mini(card)}{/each}</span>
			<span class="swap"><ArrowsLeftRightIcon size={16} /></span>
			<span class="minis">{#each trade.want as card (card.id)}{@render mini(card)}{/each}</span>
			<TopupNote topup={trade.topup} iPay={sent ? trade.topup?.by === 'from' : trade.topup?.by === 'to'} />
		</div>
		{#if open}
			<div class="req-act">
				{#if sent}
					<Button size="sm" disabled={busy === trade.id} onclick={() => void answer(trade, 'cancel')}>{t('eggMarket.trade.cancel')}</Button>
				{:else}
					<Button size="sm" disabled={busy === trade.id} onclick={() => void answer(trade, 'decline')}>{t('eggMarket.trade.decline')}</Button>
					<Button size="sm" variant="primary" disabled={busy === trade.id} onclick={() => void answer(trade, 'accept')}>{t('eggMarket.trade.accept')}</Button>
				{/if}
			</div>
		{:else}
			<span class="state">{t(`eggMarket.trade.state.${trade.state}`)}</span>
		{/if}
	</li>
{/snippet}

<div class="mine">
	<section>
		<h2>{t('eggMarket.market.myListings')}</h2>
		{#if mine.length === 0}
			<p class="none">{t('eggMarket.market.noMine')}</p>
		{:else}
			<ul class="card">
				{#each mine as item (item.id)}
					{@const give = cardById(item.give.card_id)}
					{@const want = item.want_card_id ? cardById(item.want_card_id) : null}
					<li class="listing">
						<span class="pair">
							<span class="pair-card">{#if give}<Thumb def={give} />{/if}</span>
							<ArrowsLeftRightIcon size={16} />
							<span class="pair-card">{#if want}<Thumb def={want} />{:else}<span class="ce-slot-empty ce-slot-any any"></span>{/if}</span>
						</span>
						<span class="listing-txt">
							<span class="listing-line">
								<span class="text">{t('eggMarket.market.myLine', { give: give?.name ?? '', want: want?.name ?? anyOf(item.want_tier) })}</span>
								<TopupNote topup={item.topup} iPay={item.topup?.by === 'owner'} />
							</span>
							<span class="when">{ago(item.at, now)}</span>
						</span>
						<Button size="sm" onclick={() => onUnlist(item)}>{t('eggMarket.hall.unlist')}</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
	<section>
		<h2>{t('eggMarket.hall.requests')}</h2>
		{#if incoming.length + outgoing.length === 0}
			<p class="none">{t('eggMarket.trade.empty')}</p>
		{:else}
			<ul class="card">
				{#each incoming as trade (trade.id)}{@render request(trade, false, true)}{/each}
				{#each outgoing as trade (trade.id)}{@render request(trade, true, true)}{/each}
			</ul>
		{/if}
	</section>
	{#if done.length}
		<section>
			<h2>{t('eggMarket.hall.history')}</h2>
			<ul class="card">
				<!-- As the website lists them: every one under the name of the side that sent it. -->
				{#each done as trade (trade.id)}{@render request(trade, false, false)}{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.mine {
		display: flex;
		flex-direction: column;
		gap: 24px;
		min-width: 0;
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2 {
		margin: 0;
		font-size: var(--fs-md);
		font-weight: 600;
		color: var(--text);
	}
	.none {
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.card {
		margin: 0;
		padding: 0;
		list-style: none;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--r-xl);
		background: var(--panel);
	}
	.card > li + li {
		border-top: 1px solid var(--hairline);
	}
	.listing {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 12px 20px;
	}
	.pair {
		display: flex;
		flex: none;
		align-items: center;
		gap: 8px;
		color: var(--dim);
	}
	.pair-card {
		width: 36px;
	}
	.any {
		display: block;
	}
	.listing-txt {
		flex: 1;
		min-width: 0;
		font-size: var(--fs-sm);
	}
	.listing-line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
		min-width: 0;
		color: var(--text);
	}
	.text {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.when {
		display: block;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.req {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 20px;
	}
	.req-main {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		min-width: 0;
	}
	.req-who {
		width: 112px;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.minis {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	.swap {
		display: inline-flex;
		flex: none;
		color: var(--dim);
	}
	.req-act {
		display: flex;
		flex: none;
		gap: 8px;
	}
	.state {
		flex: none;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.mini {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.mini-card {
		flex: none;
		width: 36px;
	}
	.mini-txt {
		min-width: 0;
		font-size: var(--fs-sm);
	}
	.mini-name {
		display: block;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mini-sub {
		display: block;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
</style>
