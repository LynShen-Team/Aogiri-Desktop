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
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import { untrack } from 'svelte';
	import { paneOut } from '$lib/ui/motion';
	import { getLocale, t } from '$lib/i18n';
	import './card.web.css';
	import './card.css';
	import { egg } from './store.svelte';
	import { left, tokensText } from './format';
	import DrawStage from './DrawStage.svelte';
	import AlbumView from './AlbumView.svelte';
	import MarketView from './MarketView.svelte';
	import UsageView from './UsageView.svelte';
	import RulesModal from './RulesModal.svelte';
	import { packCards } from './art';
	import { extraChance } from './eligibility';

	let {
		section = $bindable('draw'),
		navWidth,
		onClose,
		onChat,
		onTopUp
	}: {
		section?: EggSection;
		navWidth: number;
		onClose: () => void;
		/** Start a conversation on today's tokens. */
		onChat: () => void;
		/** The app's store (a balance below the round's minimum). */
		onTopUp?: () => void;
	} = $props();

	let rules = $state(false);
	/** What the market opens on when the album sends the user there (挂出 a copy, or a pack's missing cards). */
	let marketIntent = $state<{ list?: string; missing?: number } | null>(null);
	/** Extra packs opened this visit (CE-H2): each one is a fresh stage. */
	let bonusRound = $state(0);
	const me = $derived(egg.me);
	const lapse = $derived(left(egg.resetsAt, egg.now));
	const album = $derived.by(() => {
		const cards = me ? packCards(me.pack.period) : [];
		if (!me || !cards.length) return '';
		const have = new Set(egg.cards.filter((c) => c.period === me.pack.period).map((c) => c.card_id));
		return `${have.size}/${cards.length}`;
	});
	const items = $derived([
		{
			id: 'draw' as const,
			icon: EggIcon,
			label: t('egg.nav.draw'),
			meta: !me?.campaign
				? ''
				: egg.canDraw
					? t('egg.nav.canDraw')
					: me.today && extraChance(me).kind === 'open'
						? t('egg.result.chancesLeft', { n: me.chances?.available ?? 0 })
						: me.today
							? t('egg.nav.drawn')
							: ''
		},
		{ id: 'album' as const, icon: CardsIcon, label: t('egg.nav.album'), meta: album },
		{ id: 'market' as const, icon: ArrowsLeftRightIcon, label: t('egg.nav.market'), meta: egg.waiting ? t('egg.nav.requests', { n: egg.waiting }) : '' },
		{ id: 'usage' as const, icon: KeyIcon, label: t('egg.nav.usage'), meta: me?.today ? tokensText(egg.remaining, getLocale()) : '' }
	]);

	// Once, on opening: the store's methods read its own state, which must not re-run this (AGENTS.md).
	$effect(() =>
		untrack(() => {
			void egg.refresh();
			void egg.loadTrades();
			return egg.watchLive();
		})
	);

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
				<p class="line"><span>{t('egg.today.left')}</span><span class="num">{tokensText(egg.remaining, getLocale())}</span></p>
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
		{:else}
			<!-- Every section under one header, as the website's PageHeader: the title, and 「规则与概率」 at the right. -->
			<div class="section" data-section={section}>
				<header class="head">
					<h1>{items.find((item) => item.id === section)?.label}</h1>
					{#if section === 'draw'}<span class="ctx">{t('egg.draw.context', { n: me.pack.period, name: me.pack.name })}</span>{/if}
					<button class="link" onclick={() => (rules = true)}>{t('egg.rules.open')}<CaretRightIcon size={12} /></button>
				</header>
				<div class="content">
					{#if section === 'draw'}
						{#key `${me.campaign.id}:${bonusRound}`}
							<DrawStage
								{me}
								now={egg.now}
								bonus={bonusRound > 0}
								onBonus={() => (bonusRound += 1)}
								onDrawn={(answer) => {
									egg.me = answer.me;
									if (answer.secret) egg.secret = answer.secret;
								}}
								{onChat}
								{onTopUp}
							/>
						{/key}
					{:else if section === 'album'}
						<AlbumView
							{me}
							onTrade={(copy) => {
								marketIntent = { list: copy.id };
								section = 'market';
							}}
							onFindMissing={(period) => {
								marketIntent = { missing: period };
								section = 'market';
							}}
						/>
					{:else if section === 'market'}
						<MarketView intent={marketIntent} onAlbum={() => (section = 'album')} onIntentDone={() => (marketIntent = null)} />
					{:else}
						<UsageView {me} {onChat} {onTopUp} onDraw={() => (section = 'draw')} />
					{/if}
				</div>
			</div>
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
	/* A section: its header, then its content filling the rest (only what the section chooses scrolls). */
	.section {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		padding: 22px 40px 24px;
	}
	.section[data-section='draw'] {
		padding-bottom: 32px;
	}
	.section .head {
		display: flex;
		flex: none;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 14px;
	}
	.section h1 {
		margin: 0;
		font-size: var(--fs-xl);
		font-weight: 600;
		color: var(--text);
	}
	.ctx {
		min-width: 0;
		font-size: var(--fs-xs);
		color: var(--dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.content {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.link {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		flex: none;
		margin-left: auto;
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
