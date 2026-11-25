<script lang="ts" module>
	export type EggSection = 'draw' | 'album' | 'market' | 'usage';
</script>

<script lang="ts">
	// 赛博鸡蛋: a full-panel page like Settings (design.md "Full-panel page"). Its navigation column, at the
	// navigator's width, lists 抽卡 / 卡册 / 交易市场 / 调用 with what each holds today, then today's tokens
	// with a meter and when they lapse. The main column shows the section.
	import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon';
	import EggIcon from 'phosphor-svelte/lib/EggIcon';
	import CardsIcon from 'phosphor-svelte/lib/CardsIcon';
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import KeyIcon from 'phosphor-svelte/lib/KeyIcon';
	import { paneOut } from '$lib/ui/motion';
	import { t } from '$lib/i18n';
	import './card.css';
	import { egg } from './store.svelte';
	import { left, wan } from './format';
	import DrawStage from './DrawStage.svelte';
	import AlbumView from './AlbumView.svelte';
	import MarketView from './MarketView.svelte';
	import UsageView from './UsageView.svelte';
	import RulesModal from './RulesModal.svelte';
	import { packCards } from './art';

	let {
		section = $bindable('draw'),
		navWidth,
		onClose,
		onChat
	}: {
		section?: EggSection;
		navWidth: number;
		onClose: () => void;
		/** Start a conversation on today's tokens. */
		onChat: () => void;
	} = $props();

	let rules = $state(false);
	const me = $derived(egg.me);
	const lapse = $derived(left(egg.resetsAt, egg.now));
	const album = $derived.by(() => {
		const cards = me ? packCards(me.pack.period) : [];
		if (!me || !cards.length) return '';
		const have = new Set(egg.cards.filter((c) => c.period === me.pack.period).map((c) => c.card_id));
		return `${have.size}/${cards.length}`;
	});
	const items = $derived([
		{ id: 'draw' as const, icon: EggIcon, label: t('egg.nav.draw'), meta: !me?.campaign ? '' : egg.canDraw ? t('egg.nav.canDraw') : me.today ? t('egg.nav.drawn') : '' },
		{ id: 'album' as const, icon: CardsIcon, label: t('egg.nav.album'), meta: album },
		{ id: 'market' as const, icon: ArrowsLeftRightIcon, label: t('egg.nav.market'), meta: egg.waiting ? t('egg.nav.requests', { n: egg.waiting }) : '' },
		{ id: 'usage' as const, icon: KeyIcon, label: t('egg.nav.usage'), meta: me?.today ? `${wan(egg.remaining)}${t('egg.wan')}` : '' }
	]);

	$effect(() => {
		void egg.refresh();
		void egg.loadTrades();
	});

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && !rules && !event.defaultPrevented && document.activeElement?.closest('.egg-page')) onClose();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="egg-page" out:paneOut|global>
	<nav class="nav" style:width="{navWidth}px" aria-label={t('egg.title')}>
		<div class="nav-head">
			<button class="back" title={t('egg.back')} aria-label={t('egg.back')} onclick={onClose}>
				<ArrowLeftIcon size={18} />
			</button>
			<h2>{t('egg.title')}</h2>
		</div>
		<div class="nav-list">
			{#each items as item (item.id)}
				{@const on = section === item.id}
				<button class="item" class:on aria-current={on ? 'page' : undefined} onclick={() => (section = item.id)}>
					<item.icon size={18} weight={on ? 'fill' : 'regular'} />
					<span class="label">{item.label}</span>
					{#if item.meta}<span class="meta">{item.meta}</span>{/if}
				</button>
			{/each}
		</div>
		{#if me?.campaign}
			<div class="today">
				<p class="head">{t('egg.today.title')}</p>
				<p class="line"><span>{t('egg.today.left')}</span><span class="num">{wan(egg.remaining)} {t('egg.wan')}</span></p>
				<div class="meter" aria-hidden="true"><i style:width="{egg.granted > 0 ? (egg.remaining / egg.granted) * 100 : 0}%"></i></div>
				<p class="foot">
					<span>{t('egg.today.resets')}</span>
					{#if lapse}<span>{t('egg.today.hoursLeft', { h: lapse.h })}</span>{/if}
				</p>
			</div>
		{/if}
	</nav>

	<div class="main">
		{#if !me}
			<p class="empty">{egg.status === 'error' ? (egg.error ?? t('egg.error.generic')) : t('egg.loading')}</p>
		{:else if !me.campaign}
			<p class="empty">{t('egg.noRound')}</p>
		{:else if section === 'draw'}
			<div class="draw">
				<header class="head">
					<h1>{t('egg.nav.draw')}</h1>
					<span class="ctx">{t('egg.draw.context', { n: me.pack.period, name: me.pack.name })}</span>
					<button class="link" onclick={() => (rules = true)}>{t('egg.rules.open')}</button>
				</header>
				{#key me.campaign.id}
					<DrawStage
						{me}
						now={egg.now}
						onDrawn={(answer) => {
							egg.me = answer.me;
							if (answer.secret) egg.secret = answer.secret;
						}}
						{onChat}
						onAlbum={() => (section = 'album')}
					/>
				{/key}
			</div>
		{:else if section === 'album'}
			<AlbumView {me} />
		{:else if section === 'market'}
			<MarketView />
		{:else}
			<UsageView {me} {onChat} />
		{/if}
	</div>
</div>

{#if rules && me}<RulesModal {me} onClose={() => (rules = false)} />{/if}

<style>
	/* Covers the content panel, as Settings does. */
	.egg-page {
		position: absolute;
		inset: 0;
		z-index: 20;
		display: flex;
		min-width: 0;
		background: var(--bg);
		animation: pane-in var(--t-med) var(--ease-out);
	}
	/* A full-panel page's navigation: a --divider at its edge (design.md, "Window frame"). */
	.nav {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-right: 1px solid var(--divider);
		background: var(--sidebar);
	}
	:global(:root[data-vibrancy='on']) .nav {
		background: var(--vibrancy-tint);
	}
	:global(:root[data-canvas-bg]) .nav {
		background: color-mix(in oklab, var(--sidebar) var(--chrome-tint), transparent);
	}
	.nav-head {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 40px;
		margin: 14px 12px 8px;
	}
	.nav-head h2 {
		margin: 0;
		font-size: var(--fs-lg);
		font-weight: 600;
		color: var(--text);
	}
	.back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: var(--r-md);
		background: none;
		color: var(--dim);
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}
	.back:hover {
		background: var(--surface2);
		color: var(--text);
	}
	.nav-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 0 12px;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-height: 36px;
		padding: 0 12px;
		border: none;
		border-radius: var(--r-md);
		background: none;
		color: var(--text);
		font: inherit;
		font-size: var(--fs-sm);
		text-align: left;
		cursor: pointer;
		transition: background var(--t-fast) var(--ease-out);
	}
	.item > :global(svg) {
		flex-shrink: 0;
		color: var(--dim);
	}
	.item:hover,
	.item.on {
		background: var(--surface2);
	}
	.item.on > :global(svg) {
		color: var(--text);
	}
	.item:focus-visible {
		outline-offset: -2px;
	}
	.label {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		flex: none;
		font-size: var(--fs-xs);
		color: var(--dim);
		font-variant-numeric: tabular-nums;
	}
	.today {
		margin: 20px 24px 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.today p {
		margin: 0;
	}
	.today .head {
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.today .line {
		display: flex;
		justify-content: space-between;
		font-size: var(--fs-sm);
		color: var(--text);
	}
	.today .num {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}
	.meter {
		height: 4px;
		border-radius: var(--r-full);
		background: var(--surface2);
		overflow: hidden;
	}
	.meter i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--text);
		transition: width var(--t-slow) var(--ease-base);
	}
	.today .foot {
		display: flex;
		justify-content: space-between;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.main {
		flex: 1;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.empty {
		margin: 72px auto 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.draw {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 24px 48px 32px;
	}
	.draw .head {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 8px;
	}
	.draw h1 {
		margin: 0;
		font-size: var(--fs-xl);
		font-weight: 600;
		color: var(--text);
	}
	.ctx {
		flex: 1;
		min-width: 0;
		font-size: var(--fs-xs);
		color: var(--dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.link {
		flex: none;
		height: 28px;
		padding: 0 8px;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-xs);
		cursor: pointer;
	}
	.link:hover {
		background: var(--surface2);
		color: var(--text);
	}
</style>
