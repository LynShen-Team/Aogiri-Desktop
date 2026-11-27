<script lang="ts">
	// 赛博鸡蛋 · 交易市场, as the website's market page lays it out on a wide screen (gateway trade.tsx, cyber-egg.spec.md
	// CE-X3..X6): the figures, the two tabs and the three actions; then every card of a pack as a tile with how many
	// put it up and how many want it, paged sideways so the page itself never scrolls, beside the latest swaps (behind
	// a button below 1400px). A tile opens the card's market in a side panel; taking a listing, putting a card up and a
	// direct swap are dialogs; a swap done shows the card coming in. 我的交易 holds my listings and the direct swaps.
	// Only cards move (and, where the round allows, money on top from the paid balance); tokens never go with a card.
	import ClockCounterClockwiseIcon from 'phosphor-svelte/lib/ClockCounterClockwiseIcon';
	import PaperPlaneTiltIcon from 'phosphor-svelte/lib/PaperPlaneTiltIcon';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import { untrack } from 'svelte';
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import Select from '$lib/ui/Select.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { PACKS, TIERS, TIER_LOOK, packCards, type ArtCard, type Tier } from './art';
	import { eggApi, eggErrorText, type EggListing, type EggOwnedCard, type EggTradeEvent } from './api';
	import { egg } from './store.svelte';
	import './market/market.css';
	import CardPanel from './market/CardPanel.svelte';
	import ListDialog from './market/ListDialog.svelte';
	import MarketTile from './market/MarketTile.svelte';
	import MyTrades from './market/MyTrades.svelte';
	import OfferDialog from './market/OfferDialog.svelte';
	import PageStrip from './market/PageStrip.svelte';
	import Recent from './market/Recent.svelte';
	import SidePanel from './market/SidePanel.svelte';
	import TakeDialog from './market/TakeDialog.svelte';
	import TradeReveal from './market/TradeReveal.svelte';
	import { NO_TOPUP, matches, tradable, type Deal } from './market/shared';

	let {
		intent = null,
		onAlbum,
		onIntentDone
	}: {
		/** From the album: put this copy up (`list`), or show this pack's cards I am missing (`missing`). */
		intent?: { list?: string; missing?: number } | null;
		/** The reveal's 「查看卡册」. */
		onAlbum?: () => void;
		/** The intent was taken up. */
		onIntentDone?: () => void;
	} = $props();

	type Only = 'all' | 'missing' | 'can';
	type Sort = 'hot' | 'rare' | 'new';
	type Tile = { def: ArtCard; offers: number; wants: number; mine: number; newest: number };

	const me = $derived(egg.me);
	const rules = $derived(me?.market_rules ?? NO_TOPUP);
	const balance = $derived(me?.balance_fen ?? 0);
	const banned = $derived(!!me?.banned);

	let market = $state<{ listings: EggListing[]; recent: EggTradeEvent[]; stats: { listings: number; today_trades: number } | null } | null>(null);
	const loadMarket = () =>
		eggApi.market().then(
			(answer) => (market = { listings: answer.listings, recent: answer.recent ?? [], stats: answer.stats ?? null }),
			(error) => toast.error(eggErrorText(error))
		);
	$effect(() =>
		untrack(() => {
			void loadMarket();
			void egg.loadTrades();
		})
	);

	let view = $state<'market' | 'mine'>('market');
	let period = $state(untrack(() => me?.pack.period ?? PACKS[0]?.period ?? 1));
	let tier = $state<Tier | 'all'>('all');
	let only = $state<Only>('all');
	let sort = $state<Sort>('hot');
	/** The card whose market the side panel shows. */
	let opened = $state<ArtCard | null>(null);
	let taking = $state<EggListing | null>(null);
	let listing = $state<{ initial: EggOwnedCard | null; want: string | null } | null>(null);
	let offering = $state(false);
	let recentOpen = $state(false);
	let deal = $state<Deal | null>(null);

	// The latest swaps sit beside the cards where the window is wide enough (the website's 1400px), else behind a button.
	let roomy = $state(false);
	$effect(() => {
		const media = window.matchMedia('(min-width: 1400px)');
		const update = () => (roomy = media.matches);
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});
	$effect(() => {
		if (roomy) recentOpen = false;
	});

	// From the album: 「发布至交易大厅」 opens 挂出 with that copy; 「去市场寻找」 shows that pack's missing cards.
	$effect(() => {
		const next = intent;
		if (!next) return;
		untrack(() => {
			if (next.missing) {
				view = 'market';
				period = next.missing;
				tier = 'all';
				only = 'missing';
			}
			if (next.list) listing = { initial: egg.cards.find((card) => card.id === next.list) ?? null, want: null };
			onIntentDone?.();
		});
	});

	const listings = $derived(market?.listings ?? []);
	const mine = $derived(tradable(egg.cards, egg.now));
	const owned = $derived.by(() => {
		const count = new Map<string, number>();
		for (const card of egg.cards) count.set(card.card_id, (count.get(card.card_id) ?? 0) + 1);
		return count;
	});
	/** The packs that can be traded: open ones (and reruns), not those announced. */
	const packs = $derived.by(() => {
		const open = PACKS.filter((pack) => me?.packs.some((entry) => entry.period === pack.period && entry.state !== 'upcoming'));
		return open.length ? open : PACKS.filter((pack) => pack.period === period);
	});
	const packOptions = $derived(packs.map((pack) => ({ value: String(pack.period), label: t('eggMarket.pack', { n: pack.period, name: pack.name }) })));
	const sortOptions = $derived((['hot', 'rare', 'new'] as const).map((key) => ({ value: key, label: t(`eggMarket.market.sort${key === 'hot' ? 'Hot' : key === 'rare' ? 'Rare' : 'New'}`) })));
	const rank = (of: Tier) => TIERS.indexOf(of);
	const tiles = $derived.by((): Tile[] => {
		const shown = PACKS.some((pack) => pack.period === period) ? period : (PACKS[0]?.period ?? 1);
		return packCards(shown)
			.map((def) => {
				const offers = listings.filter((item) => item.give.card_id === def.id && !item.mine).length;
				const wants = listings.filter((item) => !item.mine && (item.want_card_id === def.id || (item.want_card_id === null && item.want_tier === def.tier))).length;
				const newest = Math.max(0, ...listings.filter((item) => item.give.card_id === def.id || item.want_card_id === def.id).map((item) => item.at));
				return { def, offers, wants, mine: owned.get(def.id) ?? 0, newest };
			})
			.filter((tile) => tier === 'all' || tile.def.tier === tier)
			.filter((tile) =>
				only === 'missing'
					? tile.mine === 0
					: only === 'can'
						? listings.some((item) => !item.mine && item.give.card_id === tile.def.id && matches(item, mine).length > 0)
						: true
			)
			.sort((a, b) => (sort === 'hot' ? b.offers + b.wants - (a.offers + a.wants) : sort === 'rare' ? rank(b.def.tier) - rank(a.def.tier) : b.newest - a.newest));
	});
	const canTake = $derived(listings.filter((item) => !item.mine && matches(item, mine).length > 0).length);
	const incoming = $derived(egg.trades?.incoming.length ?? 0);
	const figures = $derived<Array<[string, number]>>([
		[t('eggMarket.market.statListings'), market?.stats?.listings ?? listings.length],
		[t('eggMarket.market.statToday'), market?.stats?.today_trades ?? 0],
		[t('eggMarket.market.statCan'), canTake],
		[t('eggMarket.market.statRequests'), incoming]
	]);

	/** A swap done: show it, and read the album again. */
	function received(next: Deal) {
		deal = next;
		void egg.refresh();
	}

	async function unlist(item: EggListing) {
		try {
			await eggApi.unlist(item.id);
			toast.success(t('eggMarket.hall.unlisted'));
			void loadMarket();
			void egg.refresh();
		} catch (error) {
			toast.error(eggErrorText(error));
		}
	}
</script>

<div class="market">
	{#if banned}
		<p class="banned" role="status">{t('eggMarket.ban')}</p>
	{/if}

	<dl class="figures">
		{#each figures as [label, value] (label)}
			<div class="figure">
				<dt>{label}</dt>
				<dd>{value}</dd>
			</div>
		{/each}
	</dl>

	<div class="bar">
		<div class="tabs" role="tablist" aria-label={t('eggMarket.market.tabs')}>
			{#each ['market', 'mine'] as const as key (key)}
				<button type="button" role="tab" class="tab" aria-selected={view === key} onclick={() => (view = key)}>
					{key === 'market' ? t('eggMarket.market.tabMarket') : t('eggMarket.market.tabMine')}
					{#if key === 'mine' && incoming > 0}<span class="badge">{incoming}</span>{/if}
				</button>
			{/each}
		</div>
		<div class="actions">
			{#if !roomy && view === 'market'}
				<Button onclick={() => (recentOpen = true)}><ClockCounterClockwiseIcon size={16} />{t('eggMarket.market.recent')}</Button>
			{/if}
			<Button onclick={() => (offering = true)} disabled={banned}><PaperPlaneTiltIcon size={16} />{t('eggMarket.trade.new')}</Button>
			<Button variant="primary" onclick={() => (listing = { initial: null, want: null })} disabled={egg.cards.length === 0 || banned}>
				<PlusIcon size={16} />{t('eggMarket.hall.list')}
			</Button>
		</div>
	</div>

	{#if view === 'market'}
		<div class="hall" class:roomy>
			<div class="col">
				<div class="filters">
					<span class="pill-select">
						<Select value={String(period)} options={packOptions} onChange={(value) => (period = Number(value))} />
					</span>
					<div class="tiers">
						{#each ['all', ...TIERS] as const as key (key)}
							<button type="button" class="tier" aria-pressed={tier === key} onclick={() => (tier = key)}>
								{#if key === 'all'}
									{t('eggMarket.market.allTiers')}
								{:else}
									<span class="ce-tier-dot" data-tier={key} aria-hidden="true"></span>{TIER_LOOK[key].code}
								{/if}
							</button>
						{/each}
					</div>
					<div class="end">
						{#each ['missing', 'can'] as const as key (key)}
							<button type="button" class="toggle" aria-pressed={only === key} onclick={() => (only = only === key ? 'all' : key)}>
								{key === 'missing' ? t('eggMarket.hall.filterMissing') : t('eggMarket.hall.filterCan')}
							</button>
						{/each}
						<span class="pill-select at-end">
							<Select value={sort} options={sortOptions} onChange={(value) => (sort = value as Sort)} />
						</span>
					</div>
				</div>
				<PageStrip items={tiles} key={(tile) => tile.def.id} cols={5} rows="auto" kind="tile" arrows>
					{#snippet item(tile)}
						<MarketTile def={tile.def} offers={tile.offers} wants={tile.wants} mine={tile.mine} onOpen={() => (opened = tile.def)} />
					{/snippet}
					{#snippet empty()}
						<p class="none">{t('eggMarket.hall.empty')}</p>
					{/snippet}
				</PageStrip>
				<p class="rules" title={t('eggMarket.hall.rules')}>{t('eggMarket.hall.rules')}</p>
			</div>
			{#if roomy}
				<div class="side">
					<Recent items={market?.recent ?? []} now={egg.now} />
				</div>
			{/if}
		</div>
	{:else}
		<div class="pane">
			<MyTrades
				{listings}
				trades={egg.trades}
				{rules}
				now={egg.now}
				onUnlist={(item) => void unlist(item)}
				onAnswered={() => {
					void egg.loadTrades();
					void loadMarket();
				}}
				onReceived={received}
			/>
		</div>
	{/if}
</div>

{#if recentOpen}
	<SidePanel width={340} label={t('eggMarket.market.recent')} onClose={() => (recentOpen = false)}>
		{#snippet head()}
			<h2 class="panel-title">{t('eggMarket.market.recent')}</h2>
		{/snippet}
		<div class="panel-scroll">
			<Recent items={market?.recent ?? []} now={egg.now} bare />
		</div>
	</SidePanel>
{/if}

{#if opened}
	<CardPanel
		def={opened}
		{listings}
		{mine}
		owned={egg.cards.length}
		{banned}
		now={egg.now}
		onClose={() => (opened = null)}
		onTake={(item) => (taking = item)}
		onList={(give, want) => (listing = { initial: give, want })}
	/>
{/if}

{#if taking}
	<TakeDialog
		listing={taking}
		{mine}
		cards={egg.cards}
		{rules}
		{balance}
		onClose={() => (taking = null)}
		onDone={(next) => {
			taking = null;
			opened = null;
			void loadMarket();
			received(next);
		}}
	/>
{/if}

{#if listing}
	<ListDialog
		{mine}
		cards={egg.cards}
		period={me?.pack.period ?? period}
		{rules}
		{balance}
		initial={listing.initial}
		initialWant={listing.want}
		onClose={() => (listing = null)}
		onDone={() => {
			listing = null;
			void loadMarket();
			void egg.refresh();
		}}
	/>
{/if}

{#if offering}
	<OfferDialog
		{mine}
		{rules}
		{balance}
		onClose={() => (offering = false)}
		onSent={() => {
			offering = false;
			void egg.loadTrades();
		}}
	/>
{/if}

{#if deal}
	<TradeReveal
		{deal}
		onClose={() => (deal = null)}
		onAlbum={() => {
			deal = null;
			onAlbum?.();
		}}
	/>
{/if}

<style>
	.market {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
		min-height: 0;
	}
	.banned {
		flex: none;
		margin: 0;
		padding: 8px 14px;
		border: 1px solid color-mix(in oklab, var(--warn) 40%, transparent);
		border-radius: var(--r-lg);
		background: color-mix(in oklab, var(--warn) 10%, transparent);
		font-size: var(--fs-sm);
		color: var(--warn);
	}

	/* 当前挂单 · 今日成交 · 可直接换 · 待处理请求 */
	.figures {
		display: grid;
		flex: none;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1px;
		margin: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--r-xl);
		background: var(--border);
	}
	.figure {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		min-width: 0;
		padding: 10px 20px;
		background: var(--panel);
	}
	.figure dt {
		min-width: 0;
		font-size: var(--fs-sm);
		color: var(--dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.figure dd {
		margin: 0;
		font-size: var(--fs-xl);
		font-weight: 600;
		line-height: 28px;
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}

	/* 交易市场 | 我的交易 · 最近成交 · 定向交换 · 挂出卡牌 */
	.bar {
		display: flex;
		flex: none;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.tabs {
		display: inline-flex;
		padding: 4px;
		border-radius: var(--r-full);
		background: var(--surface2);
	}
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 16px;
		border: 0;
		border-radius: var(--r-full);
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-sm);
		font-weight: 500;
		line-height: 18px;
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out),
			box-shadow var(--t-fast) var(--ease-out);
	}
	.tab:hover {
		color: var(--text);
	}
	.tab[aria-selected='true'] {
		background: var(--panel);
		color: var(--text);
		box-shadow: 0 0 0 1px var(--border);
	}
	.badge {
		padding: 0 6px;
		border-radius: var(--r-full);
		background: var(--text);
		color: var(--bg);
		font-size: var(--fs-2xs);
		line-height: 16px;
		font-variant-numeric: tabular-nums;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	/* The cards (and the latest swaps beside them on a wide window). */
	.hall {
		display: grid;
		flex: 1 1 auto;
		gap: 20px;
		min-width: 0;
		min-height: 0;
	}
	.hall.roomy {
		grid-template-columns: minmax(0, 1fr) 280px;
	}
	.col {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		min-height: 0;
	}
	.side {
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		border-radius: var(--r-xl);
	}
	.filters {
		display: flex;
		flex: none;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.tiers {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.tier,
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: var(--r-full);
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-sm);
		line-height: 18px;
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			border-color var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}
	.tier:hover,
	.toggle:hover {
		color: var(--text);
	}
	.tier[aria-pressed='true'] {
		border-color: var(--text);
		background: var(--text);
		color: var(--bg);
	}
	.toggle[aria-pressed='true'] {
		border-color: var(--text);
		background: color-mix(in oklab, var(--text) 10%, transparent);
		color: var(--text);
	}
	.end {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}
	/* The pack and the order: chips with a menu, as the tier chips beside them. */
	.pill-select {
		display: inline-block;
		flex: none;
	}
	.pill-select :global(.trigger) {
		min-height: 32px;
		padding: 0 12px 0 14px;
		border-radius: var(--r-full);
		background: none;
	}
	.pill-select :global(.menu) {
		right: auto;
		width: max-content;
		min-width: 100%;
	}
	.pill-select.at-end :global(.menu) {
		left: auto;
		right: 0;
	}
	.none {
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.rules {
		flex: none;
		margin: 0;
		font-size: var(--fs-xs);
		color: var(--dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* 我的交易: the one part of the page that scrolls. */
	.pane {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.panel-title {
		margin: 0;
		padding: 20px 56px 12px 24px;
		font-size: var(--fs-lg);
		font-weight: 600;
		line-height: 24px;
		color: var(--text);
	}
	.panel-scroll {
		flex: 1 1 auto;
		min-height: 0;
		padding: 4px 24px 24px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
</style>
