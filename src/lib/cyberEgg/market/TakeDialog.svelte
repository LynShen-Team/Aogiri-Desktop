<script lang="ts">
	// CE-X4: take a listing: pick which of my matching copies to give; the money on top, if any (CE-X5).
	import { untrack } from 'svelte';
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { cardById } from '../art';
	import { eggApi, eggErrorText, type EggListing, type EggMarketRules, type EggOwnedCard } from '../api';
	import { yuan } from '../eligibility';
	import MarketDialog from './MarketDialog.svelte';
	import PickCard from './PickCard.svelte';
	import { matches, moneyLine, serialNo, topupNet, type Deal } from './shared';

	let {
		listing,
		mine,
		cards,
		rules,
		balance,
		onClose,
		onDone
	}: {
		listing: EggListing;
		/** My copies that can be offered now. */
		mine: EggOwnedCard[];
		/** All my copies (what I gave, for the reveal). */
		cards: EggOwnedCard[];
		rules: EggMarketRules;
		balance: number;
		onClose: () => void;
		onDone: (deal: Deal) => void;
	} = $props();

	const can = $derived(matches(listing, mine));
	let give = $state(untrack(() => can[0]?.id ?? ''));
	let busy = $state(false);
	const def = $derived(cardById(listing.give.card_id));
	const topup = $derived(listing.topup && listing.topup.fen > 0 ? listing.topup : null);
	const iPay = $derived(topup?.by === 'taker');
	const short = $derived(iPay && topup ? topup.fen > balance : false);

	async function take() {
		busy = true;
		try {
			const result = await eggApi.take(listing.id, give);
			const gave = cards.find((card) => card.id === give);
			onDone({ got: [result.received], gave: gave ? [gave] : [], from: listing.owner, money: moneyLine(topup, iPay, rules) });
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			busy = false;
		}
	}
</script>

<MarketDialog title={t('eggMarket.hall.takeTitle', { name: def?.name ?? '' })} description={t('eggMarket.hall.takeBody', { owner: listing.owner })} {busy} {onClose}>
	<div class="grid">
		{#each can as card (card.id)}
			{@const mineDef = cardById(card.card_id)}
			{#if mineDef}
				<PickCard def={mineDef} on={give === card.id} caption="№ {serialNo(card.serial)}" numeric onclick={() => (give = card.id)} />
			{/if}
		{/each}
	</div>
	{#if topup}
		<p class="money" class:short>
			{iPay
				? short
					? t('eggMarket.topup.takeShort', { amount: yuan(topup.fen), balance: yuan(balance) })
					: t('eggMarket.topup.takePay', { amount: yuan(topup.fen), balance: yuan(balance) })
				: t('eggMarket.topup.takeGet', { amount: yuan(topup.fen), net: yuan(topupNet(topup.fen, rules)) })}
		</p>
	{/if}
	<p class="rule">{t('eggMarket.trade.rule')}</p>
	{#snippet footer()}
		<Button onclick={onClose} disabled={busy}>{t('eggMarket.cancel')}</Button>
		<Button variant="primary" onclick={() => void take()} disabled={busy || !give || short}>{t('eggMarket.hall.takeConfirm')}</Button>
	{/snippet}
</MarketDialog>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}
	.money {
		margin: 0;
		padding: 12px 16px;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		font-size: var(--fs-sm);
		line-height: 22px;
		color: var(--text);
	}
	.money.short {
		border-color: color-mix(in oklab, var(--err) 50%, transparent);
		color: var(--err);
	}
	.rule {
		margin: 0;
		font-size: var(--fs-sm);
		line-height: 20px;
		color: var(--dim);
	}
</style>
