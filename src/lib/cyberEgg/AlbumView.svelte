<script lang="ts">
	// 赛博鸡蛋 · 卡册: one tab per pack, its cards in order. A card owned shows itself (still; it moves
	// when opened), its name and how many copies; one not owned is an empty pocket with its number.
	import { untrack } from 'svelte';
	import { t } from '$lib/i18n';
	import Modal from '$lib/ui/Modal.svelte';
	import Card3D from './Card3D.svelte';
	import { PACKS, TIER_LOOK, packCards, packOf, type ArtCard } from './art';
	import { egg } from './store.svelte';
	import { wan } from './format';
	import type { EggMe, EggOwnedCard } from './api';

	let { me }: { me: EggMe } = $props();

	let period = $state(untrack(() => me.pack.period));
	let open = $state<{ def: ArtCard; copies: EggOwnedCard[] } | null>(null);

	/** The packs to show: open ones and those announced, in order. */
	const shelf = $derived(PACKS.filter((p) => p.period === me.pack.period || me.packs.some((x) => x.period === p.period)));
	const byCard = $derived.by(() => {
		const map = new Map<string, EggOwnedCard[]>();
		for (const card of egg.cards) map.set(card.card_id, [...(map.get(card.card_id) ?? []), card]);
		return map;
	});
	const total = $derived(egg.cards.length);
	const spare = $derived([...byCard.values()].reduce((sum, copies) => sum + Math.max(0, copies.filter((c) => !c.locked).length - 1), 0));
	const shown = $derived(packOf(period));
	const shownCards = $derived(packCards(period));
	const count = (p: number) => packCards(p).filter((c) => byCard.has(c.id)).length;
</script>

<div class="album">
	<header class="head">
		<h1>{t('egg.nav.album')}</h1>
		<span class="ctx">{t('egg.album.summary', { n: total, spare })}</span>
	</header>
	<div class="tabs" role="tablist">
		{#each shelf as p (p.period)}
			<button class="tab" class:on={period === p.period} role="tab" aria-selected={period === p.period} onclick={() => (period = p.period)}>
				{t('egg.album.tab', { n: p.period, name: p.name })}
				<span class="n">{count(p.period)}/{packCards(p.period).length}</span>
			</button>
		{/each}
	</div>
	{#if shown}
		<div class="grid">
			{#each shownCards as def (def.id)}
				{@const copies = byCard.get(def.id) ?? []}
				<div class="slot">
					{#if copies.length}
						<Card3D
							card={def}
							period={def.period}
							packName={shown.name}
							serial={copies[0].serial}
							live={false}
							onclick={() => (open = { def, copies })}
							label={def.name}
						/>
						<p class="cap"><span>{def.name}</span>{#if copies.length > 1}<span class="x">×{copies.length}</span>{/if}</p>
					{:else}
						<div class="pocket"><span>{String(def.no).padStart(2, '0')}</span></div>
						<p class="cap missing">{t('egg.album.missing')}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if open}
	{@const look = TIER_LOOK[open.def.tier]}
	<Modal title={open.def.name} width={640} onClose={() => (open = null)}>
		<div class="detail">
			<div class="big">
				<Card3D card={open.def} period={open.def.period} packName={packOf(open.def.period)?.name ?? ''} serial={open.copies[0].serial} sway />
			</div>
			<div class="facts">
				<p class="tier">{t(`egg.tier.${open.def.tier}`)} · {look.code}</p>
				<p class="line">{open.def.line}</p>
				<ul>
					{#each open.copies as copy (copy.id)}
						<li>
							<span class="mono">№ {String(copy.serial).padStart(6, '0')}</span>
							<span>{copy.from === 'trade' ? t('egg.album.fromTrade') : t('egg.album.fromDraw', { n: wan(copy.tokens) })}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</Modal>
{/if}

<style>
	.album {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 24px 48px 40px;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	h1 {
		margin: 0;
		font-size: var(--fs-xl);
		font-weight: 600;
		color: var(--text);
	}
	.ctx {
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 18px 0 20px;
	}
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 12px;
		border: none;
		border-radius: var(--r-md);
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-sm);
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}
	.tab:hover {
		background: var(--surface2);
	}
	.tab.on {
		background: var(--surface2);
		color: var(--text);
	}
	.tab .n {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-variant-numeric: tabular-nums;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 22px 20px;
		max-width: 1120px;
	}
	.slot {
		min-width: 0;
	}
	.pocket {
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 5 / 7;
		border: 1px dashed var(--border-strong);
		border-radius: var(--r-lg);
		color: var(--dim2);
		font-family: var(--font-mono);
		font-size: var(--fs-lg);
	}
	.cap {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin: 10px 0 0;
		font-size: var(--fs-sm);
		color: var(--text);
		white-space: nowrap;
	}
	.cap.missing {
		color: var(--dim);
	}
	.cap .x {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.detail {
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: 28px;
		align-items: center;
	}
	.big {
		padding: 8px;
	}
	.facts p {
		margin: 0;
	}
	.tier {
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.line {
		margin-top: 10px !important;
		font-size: var(--fs-md);
		color: var(--text);
	}
	ul {
		margin: 18px 0 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-top: 1px solid var(--hairline);
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.mono {
		font-family: var(--font-mono);
		color: var(--text);
	}
</style>
