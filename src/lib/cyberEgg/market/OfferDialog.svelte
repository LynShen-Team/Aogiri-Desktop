<script lang="ts">
	// CE-X3: a direct swap with a named user: find them, pick which of theirs and which of mine, and money on top
	// (CE-X5). A side with no card must be evened out by money the other way.
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import TextField from '$lib/ui/TextField.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { cardById } from '../art';
	import { eggApi, eggErrorText, type EggMarketRules, type EggOwnedCard } from '../api';
	import MarketDialog from './MarketDialog.svelte';
	import PickCard from './PickCard.svelte';
	import TopupPicker from './TopupPicker.svelte';
	import { topupCheck, type TopupDraft } from './shared';

	let {
		mine: tradableMine,
		rules,
		balance,
		onClose,
		onSent
	}: {
		/** My copies that can be offered now. */
		mine: EggOwnedCard[];
		rules: EggMarketRules;
		balance: number;
		onClose: () => void;
		onSent: () => void;
	} = $props();

	let name = $state('');
	let theirs = $state<{ username: string; cards: EggOwnedCard[] } | null>(null);
	let want = $state<string[]>([]);
	let give = $state<string[]>([]);
	let money = $state<TopupDraft>({ side: 'none', amount: '' });
	let busy = $state(false);
	const checked = $derived(topupCheck(money, rules, balance));
	const ready = $derived(
		!!theirs &&
			!(give.length === 0 && want.length === 0) &&
			!(give.length === 0 && money.side !== 'me') &&
			!(want.length === 0 && money.side !== 'them') &&
			checked.problem === null
	);

	async function find() {
		if (!name.trim() || busy) return;
		busy = true;
		try {
			theirs = await eggApi.tradableOf(name.trim());
			want = [];
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			busy = false;
		}
	}

	async function send() {
		if (!theirs) return;
		busy = true;
		try {
			await eggApi.offerTrade(theirs.username, give, want, money.side === 'none' ? null : { fen: checked.fen, by: money.side === 'me' ? 'from' : 'to' });
			toast.success(t('eggMarket.trade.sent', { name: theirs.username }));
			onSent();
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			busy = false;
		}
	}

	const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
</script>

{#snippet pickGrid(cards: EggOwnedCard[], chosen: string[], set: (next: string[]) => void)}
	<div class="grid">
		{#each cards as card (card.id)}
			{@const def = cardById(card.card_id)}
			{#if def}<PickCard {def} on={chosen.includes(card.id)} caption={def.name} onclick={() => set(toggle(chosen, card.id))} />{/if}
		{/each}
	</div>
{/snippet}

<MarketDialog title={t('eggMarket.trade.title')} description={t('eggMarket.trade.body')} width={672} {busy} {onClose}>
	{#snippet top()}
		<form
			class="find"
			onsubmit={(event) => {
				event.preventDefault();
				void find();
			}}
		>
			<TextField bind:value={name} placeholder={t('eggMarket.trade.who')} />
			<Button type="submit" disabled={busy || !name.trim()}>{t('eggMarket.trade.find')}</Button>
		</form>
	{/snippet}
	{#if theirs}
		<section>
			<p class="label">{t('eggMarket.trade.want', { name: theirs.username })}</p>
			{#if theirs.cards.length}
				{@render pickGrid(theirs.cards, want, (next) => (want = next))}
			{:else}
				<p class="none">{t('eggMarket.trade.none')}</p>
			{/if}
		</section>
	{/if}
	<section>
		<p class="label">{t('eggMarket.trade.give')}</p>
		{@render pickGrid(tradableMine, give, (next) => (give = next))}
	</section>
	<TopupPicker {rules} {balance} bind:value={money} />
	<p class="rule">{t('eggMarket.trade.rule')}</p>
	{#snippet footer()}
		<Button onclick={onClose} disabled={busy}>{t('eggMarket.cancel')}</Button>
		<Button variant="primary" onclick={() => void send()} disabled={busy || !ready}>{t('eggMarket.trade.send')}</Button>
	{/snippet}
</MarketDialog>

<style>
	.find {
		display: flex;
		gap: 8px;
		margin: 0;
	}
	section {
		display: grid;
		gap: 8px;
	}
	.label {
		margin: 0;
		font-size: var(--fs-sm);
		font-weight: 500;
		color: var(--text);
	}
	.none {
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 12px;
	}
	.rule {
		margin: 0;
		font-size: var(--fs-sm);
		line-height: 20px;
		color: var(--dim);
	}
</style>
