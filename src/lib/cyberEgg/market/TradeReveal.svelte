<script lang="ts">
	// CE-X6 (owner 2026-11-24 「交易的时候也要有动画哈，获得动画」): a swap that is done is shown the way a draw is. What I
	// gave slides away; what I got comes in face down, turns over in its tier's light, and says where it came from and
	// what money went with it (the website's trade-reveal.tsx).
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import Modal from '$lib/ui/Modal.svelte';
	import Card3D from '../Card3D.svelte';
	import { TIER_LOOK, TIERS, cardById, packOf, type Tier } from '../art';
	import { playDeal, playFlip, playReveal } from '../card/sound';
	import { serialNo, tierName, type Deal } from './shared';

	let { deal, onClose, onAlbum }: { deal: Deal; onClose: () => void; onAlbum: () => void } = $props();

	let phase = $state<'swap' | 'turn' | 'done'>('swap');
	const best = $derived(deal.got.reduce<Tier>((top, card) => (TIERS.indexOf(card.tier) > TIERS.indexOf(top) ? card.tier : top), 'n'));

	$effect(() => {
		const tier = best;
		playDeal(0);
		const turn = window.setTimeout(() => {
			phase = 'turn';
			playFlip();
		}, 950);
		const done = window.setTimeout(() => {
			phase = 'done';
			playReveal(tier);
		}, 1550);
		return () => {
			window.clearTimeout(turn);
			window.clearTimeout(done);
		};
	});

	const names = $derived(deal.got.map((card) => cardById(card.card_id)?.name ?? '').filter(Boolean));
	const first = $derived(deal.got[0]);
	const title = $derived(names.length > 1 ? t('eggMarket.get.titleMany', { count: names.length }) : t('eggMarket.get.title', { name: names[0] ?? '' }));
</script>

<Modal {title} width={512} {onClose}>
	<p class="desc">{t('eggMarket.get.from', { name: deal.from })}</p>
	<div class="ce-get-stage" data-phase={phase} style:--aura={TIER_LOOK[best].glow}>
		<span class="ce-get-aura" aria-hidden="true"></span>
		<div class="ce-get-gave" aria-hidden="true">
			{#each deal.gave as card (card.id)}
				{@const def = cardById(card.card_id)}
				{#if def}
					<div class="gave">
						<Card3D card={def} period={def.period} packName={packOf(def.period)?.name ?? ''} interactive={false} live={false} />
					</div>
				{/if}
			{/each}
		</div>
		<div class="ce-get-got">
			{#each deal.got as card, index (card.id)}
				{@const def = cardById(card.card_id)}
				{#if def}
					<div class="got" class:many={deal.got.length > 1} style:--i={index}>
						<Card3D card={def} period={def.period} packName={packOf(def.period)?.name ?? ''} serial={card.serial} flipped={phase === 'swap'} sway={phase === 'done'} />
					</div>
				{/if}
			{/each}
		</div>
	</div>
	{#if first}
		<p class="line">
			{deal.got.length > 1
				? names.join(t('eggMarket.listSeparator'))
				: t('eggMarket.get.line', { tier: tierName(first.tier), code: TIER_LOOK[first.tier].code, serial: serialNo(first.serial) })}
		</p>
	{/if}
	{#if deal.money}<p class="money">{deal.money}</p>{/if}
	{#snippet footer()}
		<Button onclick={onAlbum}>{t('eggMarket.get.album')}</Button>
		<Button variant="primary" onclick={onClose}>{t('eggMarket.get.done')}</Button>
	{/snippet}
</Modal>

<style>
	.desc {
		margin: -6px 0 0;
		font-size: var(--fs-sm);
		line-height: 20px;
		color: var(--dim);
	}
	.gave {
		width: 84px;
	}
	.got {
		width: 190px;
	}
	.got.many {
		width: 150px;
	}
	.line {
		margin: 0;
		text-align: center;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.money {
		margin: 0;
		text-align: center;
		font-size: var(--fs-sm);
		color: var(--text);
	}
</style>
