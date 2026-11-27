<script lang="ts">
	// CE-D3, CE-H3 (the website's `pages/cyber-egg/usage.tsx` Today): today's tokens: the card they came from (or, with
	// bonus draws, a small pile of today's cards, the best on top), what is left of them, until midnight. CE-C6: the card
	// (or the pile) opens in the viewer, flying out of its place; the arrows go through today's cards.
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import Card3D from '../Card3D.svelte';
	import CardViewer from '../CardViewer.svelte';
	import { TIER_LOOK, cardById, packOf } from '../art';
	import type { EggMe } from '../api';
	import { egg } from '../store.svelte';
	import { stackOrder, todayDraws, todayItems, todayTokens } from './today';
	import { leftText, tokenParts, tokens } from './text';

	let { me, onDraw }: { me: EggMe; onDraw?: () => void } = $props();

	const draws = $derived(todayDraws(me));
	const first = $derived(draws[0]);
	const many = $derived(draws.length > 1);
	const card = $derived(first ? cardById(first.card.card_id) : undefined);
	const sum = $derived(todayTokens(me));
	const left = $derived(leftText(first?.expires_at ?? me.next_draw_at, egg.now));
	const figure = $derived(tokenParts(sum.left));
	const share = $derived(sum.total > 0 ? Math.max(0, Math.min(1, sum.used / sum.total)) : 0);

	// Each card lower in the pile sits STEP % of the pile's width up and to the left, turned a little.
	const STEP = 7;
	const pile = $derived(
		stackOrder(draws)
			.slice(-3)
			.flatMap((draw) => {
				const def = cardById(draw.card.card_id);
				return def ? [{ draw, def }] : [];
			})
	);
	const names = $derived(
		draws
			.map((draw) => cardById(draw.card.card_id)?.name)
			.filter(Boolean)
			.join(t('eggInfo.listSeparator'))
	);

	let trigger = $state<HTMLButtonElement>();
	let viewing = $state(false);
	const items = $derived(todayItems(me));

	/** The element of one of today's cards on the page (or the top of the pile when that card is not in it). */
	function placeOf(index: number): HTMLElement | null {
		const id = items[index]?.draw.card.id;
		const nodes = [...(trigger?.querySelectorAll<HTMLElement>('[data-today-card]') ?? [])];
		return nodes.find((node) => node.dataset.todayCard === id) ?? nodes[nodes.length - 1] ?? null;
	}

	function close() {
		viewing = false;
		// Closing gives the focus back to the card.
		requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
	}
</script>

{#if !first}
	<section class="card today empty">
		<p class="kicker">{t('eggInfo.usage.todayTitle')}</p>
		<p class="big">{t('eggInfo.usage.notDrawn')}</p>
		{#if onDraw}<Button variant="primary" onclick={onDraw}>{t('eggInfo.usage.goDraw')}</Button>{/if}
	</section>
{:else}
	<section class="card today">
		{#if many}
			<button bind:this={trigger} type="button" class="pile" onclick={() => (viewing = true)} aria-label={t('eggInfo.usage.open', { name: names })}>
				{#each pile as { draw, def }, index (draw.card.id)}
					{@const top = pile.length - 1}
					<span
						class="pile-card"
						class:top={index === top}
						data-today-card={draw.card.id}
						style:width="{100 - top * STEP}%"
						style:margin-left="{index * STEP}%"
						style:margin-top="{index * STEP}%"
						style:transform={index === top ? undefined : `rotate(${(index - top) * 2.5}deg)`}
					>
						<Card3D card={def} period={def.period} packName={packOf(def.period)?.name ?? ''} serial={draw.card.serial} interactive={false} live={false} />
					</span>
				{/each}
			</button>
		{:else if card}
			<button bind:this={trigger} type="button" class="pile" onclick={() => (viewing = true)} aria-label={t('eggInfo.usage.open', { name: card.name })}>
				<span class="pile-card top" data-today-card={first.card.id}>
					<Card3D {card} period={card.period} packName={packOf(card.period)?.name ?? ''} serial={first.card.serial} interactive={false} live={false} />
				</span>
			</button>
		{:else}
			<span></span>
		{/if}

		<div class="info">
			<div>
				<p class="from">
					{#if many}
						<span class="dots" aria-hidden="true">
							{#each draws as draw (draw.card.id)}<span class="ce-tier-dot" data-tier={draw.card.tier}></span>{/each}
						</span>
						{t('eggInfo.usage.fromMany', { n: draws.length })}
					{:else}
						<span class="ce-tier-dot" data-tier={first.card.tier} aria-hidden="true"></span>
						{t('eggInfo.usage.from', { tier: t(`eggInfo.tier.${first.card.tier}`), code: TIER_LOOK[first.card.tier].code, name: card?.name ?? '' })}
					{/if}
				</p>
				<p class="label">{t('eggInfo.usage.leftToday')}</p>
				<p class="figure">
					<span class="n">{figure.number}</span>{#if figure.unit}<span class="u">{figure.unit}</span>{/if}<span class="s">tokens</span>
				</p>
			</div>
			<div>
				<span class="bar" aria-hidden="true"><span style:width="{share * 100}%"></span></span>
				<div class="foot">
					<span class="num">{t('eggInfo.usage.used', { used: tokens(sum.used), total: tokens(sum.total) })}</span>
					<span>{t('eggInfo.usage.lapse', { left })}</span>
				</div>
			</div>
		</div>
	</section>
{/if}

{#if viewing && items.length}
	<CardViewer items={items.map((entry) => entry.item)} start={0} today from={placeOf} onTrade={null} onClose={close} />
{/if}

<style>
	.card {
		min-width: 0;
		border: 1px solid var(--border);
		border-radius: var(--r-xl);
		background: var(--panel);
	}
	.today {
		display: grid;
		grid-template-columns: 132px minmax(0, 1fr);
		align-items: center;
		gap: 24px;
		padding: 28px;
	}
	.today.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		gap: 16px;
		padding: 32px;
	}
	.kicker,
	.big,
	.from,
	.label,
	.figure {
		margin: 0;
	}
	.kicker {
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.big {
		font-size: var(--fs-xl);
		font-weight: 600;
		color: var(--text);
	}

	/* The card, or the pile: the top card in flow, the ones under it up and to the left. */
	.pile {
		position: relative;
		display: block;
		width: 132px;
		margin: 0 auto;
		padding: 0;
		border: none;
		border-radius: var(--r-md);
		background: none;
		cursor: pointer;
	}
	.pile:focus-visible {
		outline: 2px solid var(--border-strong);
		outline-offset: 2px;
	}
	.pile-card {
		position: absolute;
		top: 0;
		left: 0;
		display: block;
	}
	.pile-card.top {
		position: relative;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
		/* The figure keeps to the column (a narrow window). */
		container-type: inline-size;
	}
	.from {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.dots {
		display: inline-flex;
		gap: 4px;
	}
	.label {
		margin-top: 12px;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.figure {
		display: flex;
		align-items: baseline;
		margin-top: 6px;
		white-space: nowrap;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.figure .n {
		font-size: min(calc(var(--fs-2xl) * 2), 24cqw);
		font-weight: 600;
		line-height: 1;
		letter-spacing: -0.025em;
	}
	.figure .u {
		margin-left: 6px;
		font-size: min(var(--fs-2xl), 12cqw);
		font-weight: 600;
		line-height: 1;
	}
	.figure .s {
		margin-left: 8px;
		font-size: var(--fs-md);
		line-height: 1;
		color: var(--dim);
	}
	.bar {
		display: block;
		height: 8px;
		overflow: hidden;
		border-radius: var(--r-full);
		background: var(--surface2);
	}
	/* The website's --egg-bar: a warm grey, not the accent. */
	.bar > span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: hsl(40 14% 76%);
		transition: width var(--t-slow) var(--ease-base);
	}
	:global([data-theme='light']) .bar > span {
		background: hsl(30 8% 32%);
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 4px 16px;
		margin-top: 8px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.num {
		font-variant-numeric: tabular-nums;
	}
</style>
