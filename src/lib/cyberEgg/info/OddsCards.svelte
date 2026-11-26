<script lang="ts">
	// CE-C7 (the website's `pages/cyber-egg/odds-cards.tsx`): under the odds, every card of the round's pack, owned or
	// not. Each opens the card viewer (turn, flip, tier, drop rate). Cards not owned carry 「尚未获得」 and stay a little
	// grey (the web's `.ce-odds-cards` rules, card.web.css).
	import { t } from '$lib/i18n';
	import Card3D from '../Card3D.svelte';
	import CardViewer, { type ViewerItem } from '../CardViewer.svelte';
	import { packCards, packOf } from '../art';
	import type { EggMe, EggOwnedCard } from '../api';

	let { me }: { me: EggMe } = $props();

	const pack = $derived(packOf(me.pack.period));
	const cards = $derived(packCards(me.pack.period));
	const copies = $derived.by(() => {
		const map = new Map<string, EggOwnedCard[]>();
		for (const copy of me.collection ?? []) map.set(copy.card_id, [...(map.get(copy.card_id) ?? []), copy]);
		return map;
	});
	const owned = $derived(cards.filter((card) => (copies.get(card.id)?.length ?? 0) > 0).length);

	let open = $state<ViewerItem | null>(null);
</script>

{#if pack && cards.length}
	<section class="odds-cards">
		<p class="head">
			<span class="name">{t('eggInfo.odds.cards', { name: pack.name })}</span>
			<span class="owned">{t('eggInfo.odds.cardsOwned', { owned, total: cards.length })}</span>
		</p>
		<ul class="ce-odds-cards">
			{#each cards as card (card.id)}
				{@const count = copies.get(card.id)?.length ?? 0}
				<li data-owned={count > 0 ? '' : undefined}>
					<Card3D
						{card}
						period={card.period}
						packName={pack.name}
						live={false}
						interactive={false}
						class={count > 0 ? 'ce-odds-card' : 'ce-odds-card ce-card-unowned'}
						label={t('eggInfo.odds.open', { name: card.name })}
						onclick={() => (open = { def: card, copies: copies.get(card.id) ?? [], drawn: null })}
					/>
					{#if count > 1}
						<span class="ce-count">×{count}</span>
					{:else if count === 0}
						<span class="ce-unowned">{t('eggInfo.odds.notOwned')}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if open}
	<CardViewer items={[open]} start={0} onTrade={null} onClose={() => (open = null)} />
{/if}

<style>
	.odds-cards {
		display: grid;
		gap: 12px;
		padding-top: 16px;
		border-top: 1px solid var(--hairline);
	}
	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--text);
	}
	.name {
		font-weight: 500;
	}
	.owned {
		font-size: var(--fs-xs);
		color: var(--dim);
		font-variant-numeric: tabular-nums;
	}
	/* The web's own grid and its 8px foot (room for the 「尚未获得」 pills) come from `.ce-odds-cards`. */
	ul {
		margin: 0;
		padding: 0 0 8px;
		list-style: none;
	}
	li {
		position: relative;
	}
</style>
