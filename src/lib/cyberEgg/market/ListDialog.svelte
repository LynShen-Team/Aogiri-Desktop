<script lang="ts">
	// CE-X4: put one of mine up: which card, what I want for it (a card of the round's pack, or any of a tier), and
	// money on top (CE-X5).
	import { untrack } from 'svelte';
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { TIERS, cardById, packCards, PACKS, type Tier } from '../art';
	import { eggApi, eggErrorText, type EggMarketRules, type EggOwnedCard } from '../api';
	import MarketDialog from './MarketDialog.svelte';
	import PickCard from './PickCard.svelte';
	import TopupPicker from './TopupPicker.svelte';
	import { tierName, topupCheck, type TopupDraft } from './shared';

	let {
		mine: tradableMine,
		cards,
		period,
		rules,
		balance,
		initial,
		initialWant = null,
		onClose,
		onDone
	}: {
		/** My copies that can be offered now. */
		mine: EggOwnedCard[];
		/** All my copies (which cards I have). */
		cards: EggOwnedCard[];
		/** The round's pack: what can be asked for. */
		period: number;
		rules: EggMarketRules;
		balance: number;
		initial: EggOwnedCard | null;
		initialWant?: string | null;
		onClose: () => void;
		onDone: () => void;
	} = $props();

	// Duplicates first: those are the ones people swap.
	const choices = $derived.by(() => {
		const count = new Map<string, number>();
		for (const card of cards) count.set(card.card_id, (count.get(card.card_id) ?? 0) + 1);
		return [...tradableMine].sort((a, b) => (count.get(b.card_id) ?? 0) - (count.get(a.card_id) ?? 0));
	});
	let give = $state(untrack(() => initial?.id ?? choices[0]?.id ?? ''));
	let want = $state<{ card_id: string | null; tier: Tier | null }>(untrack(() => ({ card_id: initialWant ?? null, tier: null })));
	let money = $state<TopupDraft>({ side: 'none', amount: '' });
	let busy = $state(false);
	const checked = $derived(topupCheck(money, rules, balance));
	const owned = $derived(new Set(cards.map((card) => card.card_id)));
	const wanted = $derived(packCards(PACKS.some((pack) => pack.period === period) ? period : (PACKS[0]?.period ?? 1)));

	async function list() {
		busy = true;
		try {
			await eggApi.list(give, want, money.side === 'none' ? null : { fen: checked.fen, by: money.side === 'me' ? 'owner' : 'taker' });
			toast.success(t('eggMarket.hall.listed'));
			onDone();
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			busy = false;
		}
	}
</script>

<MarketDialog title={t('eggMarket.hall.listTitle')} description={t('eggMarket.hall.listBody')} width={672} {busy} {onClose}>
	<section>
		<p class="label">{t('eggMarket.hall.listGive')}</p>
		<div class="grid six">
			{#each choices as card (card.id)}
				{@const def = cardById(card.card_id)}
				{#if def}<PickCard {def} on={give === card.id} caption={def.name} onclick={() => (give = card.id)} />{/if}
			{/each}
		</div>
	</section>
	<section>
		<p class="label">{t('eggMarket.hall.listWant')}</p>
		<div class="grid five">
			{#each wanted as def (def.id)}
				<PickCard
					{def}
					on={want.card_id === def.id}
					caption={def.name}
					dim={owned.has(def.id)}
					badge={owned.has(def.id) ? null : t('eggMarket.hall.missing')}
					onclick={() => (want = { card_id: def.id, tier: null })}
				/>
			{/each}
		</div>
		<div class="chips">
			{#each TIERS as tier (tier)}
				<button type="button" class="chip" aria-pressed={want.card_id === null && want.tier === tier} onclick={() => (want = { card_id: null, tier })}>
					<span class="ce-tier-dot" data-tier={tier} aria-hidden="true"></span>
					{t('eggMarket.hall.anyOf', { tier: tierName(tier) })}
				</button>
			{/each}
		</div>
	</section>
	<TopupPicker {rules} {balance} bind:value={money} />
	<p class="rule">{t('eggMarket.trade.rule')}</p>
	{#snippet footer()}
		<Button onclick={onClose} disabled={busy}>{t('eggMarket.cancel')}</Button>
		<Button variant="primary" onclick={() => void list()} disabled={busy || !give || (want.card_id === null && want.tier === null) || checked.problem !== null}>
			{t('eggMarket.hall.listConfirm')}
		</Button>
	{/snippet}
</MarketDialog>

<style>
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
	.grid {
		display: grid;
		gap: 12px;
	}
	.six {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
	.five {
		grid-template-columns: repeat(5, minmax(0, 1fr));
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 4px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border: 1px solid var(--border);
		border-radius: var(--r-full);
		background: none;
		color: var(--text);
		font: inherit;
		font-size: var(--fs-sm);
		line-height: 18px;
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			border-color var(--t-fast) var(--ease-out);
	}
	.chip:hover {
		background: var(--surface2);
	}
	.chip[aria-pressed='true'] {
		border-color: var(--text);
		background: color-mix(in oklab, var(--text) 10%, transparent);
	}
	.rule {
		margin: 0;
		font-size: var(--fs-sm);
		line-height: 20px;
		color: var(--dim);
	}
</style>
