<script lang="ts">
	// 赛博鸡蛋 · 交易市场: the hall (cards put up, what each wants), the swaps sent to this user and by it,
	// and a card of one's own to put up. Only cards move; tokens never go with a card.
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import { untrack } from 'svelte';
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import Modal from '$lib/ui/Modal.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import Card3D from './Card3D.svelte';
	import { TIERS, cardById, packOf, type Tier as CardTier } from './art';
	import { egg } from './store.svelte';
	import { account } from '$lib/accountSession.svelte';
	import { eggApi, eggErrorText, type EggListing, type EggTrade } from './api';

	let tab = $state<'hall' | 'requests'>(untrack(() => (egg.waiting ? 'requests' : 'hall')));
	let listings = $state<EggListing[] | null>(null);
	let busy = $state<string | null>(null);
	/** Taking a listing: which of this user's cards to give. */
	let taking = $state<EggListing | null>(null);
	/** Putting a card up. */
	let listing = $state(false);
	let listCard = $state<string | null>(null);
	let listTier = $state<CardTier | null>(null);

	const loadHall = () =>
		eggApi.market().then(
			(answer) => (listings = answer.listings),
			(error) => toast.error(eggErrorText(error))
		);
	$effect(() =>
		untrack(() => {
			void loadHall();
			void egg.loadTrades();
		})
	);

	/** The swaps: sent to this user, sent by it, then those done (sent by it when it is their `from`). */
	const swaps = $derived<Array<EggTrade & { mine: boolean }>>(
		egg.trades
			? [
					...egg.trades.incoming.map((x) => ({ ...x, mine: false })),
					...egg.trades.outgoing.map((x) => ({ ...x, mine: true })),
					...egg.trades.done.map((x) => ({ ...x, mine: x.from === account.user?.username }))
				]
			: []
	);
	const waiting = $derived(egg.waiting);
	const name = (id: string) => cardById(id)?.name ?? id;
	const tierName = (tier: CardTier) => t(`egg.tier.${tier}`);
	const wants = (l: EggListing) =>
		l.want_card_id ? name(l.want_card_id) : l.want_tier ? t('egg.market.anyTier', { tier: tierName(l.want_tier) }) : t('egg.market.anyCard');
	/** Cards this user may give: not in a 典藏, not held back after a swap. */
	const tradable = $derived(egg.cards.filter((c) => !c.locked && !(c.relist_after && c.relist_after > Date.now())));
	const fits = (l: EggListing) => tradable.filter((c) => (l.want_card_id ? c.card_id === l.want_card_id : l.want_tier ? c.tier === l.want_tier : true));
	const ago = (at: number) => {
		const minutes = Math.max(1, Math.round((Date.now() - at) / 60_000));
		return minutes < 60 ? t('egg.market.minutesAgo', { n: minutes }) : minutes < 1440 ? t('egg.market.hoursAgo', { n: Math.round(minutes / 60) }) : t('egg.market.daysAgo', { n: Math.round(minutes / 1440) });
	};

	async function act(id: string, run: () => Promise<unknown>, done: string) {
		busy = id;
		try {
			await run();
			toast.success(done);
			void loadHall();
			void egg.loadTrades();
			void egg.refresh();
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			busy = null;
		}
	}
</script>

<div class="market">
	<header class="head">
		<h1>{t('egg.nav.market')}</h1>
		<span class="ctx">{t('egg.market.summary')}</span>
		<Button size="sm" onclick={() => ((listing = true), (listCard = null), (listTier = null))}><PlusIcon size={14} />{t('egg.market.list')}</Button>
	</header>
	<div class="tabs" role="tablist">
		<button class="tab" class:on={tab === 'hall'} role="tab" aria-selected={tab === 'hall'} onclick={() => (tab = 'hall')}>{t('egg.market.hall')}</button>
		<button class="tab" class:on={tab === 'requests'} role="tab" aria-selected={tab === 'requests'} onclick={() => (tab = 'requests')}>
			{t('egg.market.requests')}{#if waiting}<span class="n">{waiting}</span>{/if}
		</button>
	</div>

	{#if tab === 'hall' && !listings}
		<p class="none">{t('egg.loading')}</p>
	{:else if tab === 'hall' && listings}
		{#if listings.length}
			<div class="list">
				{#each listings as l (l.id)}
					{@const def = cardById(l.give.card_id)}
					<div class="row">
						<div class="thumb">{#if def}<Card3D card={def} period={def.period} packName={packOf(def.period)?.name ?? ''} live={false} interactive={false} />{/if}</div>
						<div class="txt">
							<p class="title">{def?.name}<span class="tier">{tierName(l.give.tier)}</span></p>
							<p class="desc">{t('egg.market.wants', { what: wants(l) })} · {l.mine ? t('egg.market.yours') : l.owner} · {ago(l.at)}</p>
						</div>
						{#if l.mine}
							<Button size="sm" variant="ghost" disabled={busy === l.id} onclick={() => act(l.id, () => eggApi.unlist(l.id), t('egg.market.withdrawn'))}>{t('egg.market.withdraw')}</Button>
						{:else}
							<Button size="sm" disabled={!fits(l).length || busy === l.id} title={fits(l).length ? undefined : t('egg.market.noFit')} onclick={() => (taking = l)}>{t('egg.market.take')}</Button>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="none">{t('egg.market.emptyHall')}</p>
		{/if}
	{:else if !egg.trades}
		<p class="none">{t('egg.loading')}</p>
	{:else if swaps.length}
		<div class="list">
			{#each swaps as x (x.id)}
				{@const theirs = x.mine ? x.want : x.give}
				{@const ours = x.mine ? x.give : x.want}
				<div class="row">
					<div class="swap" aria-hidden="true">
						{@render thumb(theirs[0]?.card_id)}
						<ArrowsLeftRightIcon size={14} />
						{@render thumb(ours[0]?.card_id)}
					</div>
					<div class="txt">
						<p class="title">
							{x.mine
								? t('egg.market.sent', { who: x.to, give: ours.map((c) => name(c.card_id)).join('、'), get: theirs.map((c) => name(c.card_id)).join('、') })
								: t('egg.market.received', { who: x.from, give: theirs.map((c) => name(c.card_id)).join('、'), get: ours.map((c) => name(c.card_id)).join('、') })}
						</p>
						<p class="desc">{x.state === 'open' ? ago(x.at) : t(`egg.market.state.${x.state}`)}</p>
					</div>
					{#if x.state === 'open' && !x.mine}
						<div class="btns">
							<Button size="sm" variant="primary" disabled={busy === x.id} onclick={() => act(x.id, () => eggApi.answer(x.id, 'accept'), t('egg.market.accepted'))}>{t('egg.market.accept')}</Button>
							<Button size="sm" variant="ghost" disabled={busy === x.id} onclick={() => act(x.id, () => eggApi.answer(x.id, 'decline'), t('egg.market.declined'))}>{t('egg.market.decline')}</Button>
						</div>
					{:else if x.state === 'open'}
						<Button size="sm" variant="ghost" disabled={busy === x.id} onclick={() => act(x.id, () => eggApi.answer(x.id, 'cancel'), t('egg.market.withdrawn'))}>{t('egg.market.withdraw')}</Button>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="none">{t('egg.market.emptyRequests')}</p>
	{/if}
</div>

{#snippet thumb(id: string | undefined)}
	{@const def = id ? cardById(id) : undefined}
	<div class="thumb">{#if def}<Card3D card={def} period={def.period} packName={packOf(def.period)?.name ?? ''} live={false} interactive={false} />{/if}</div>
{/snippet}

{#if taking}
	{@const l = taking}
	<Modal title={t('egg.market.takeTitle', { name: name(l.give.card_id) })} width={560} onClose={() => (taking = null)}>
		<p class="lead">{t('egg.market.takeLead', { what: wants(l) })}</p>
		<div class="pick">
			{#each fits(l) as c (c.id)}
				{@const def = cardById(c.card_id)}
				<button class="choice" disabled={busy === l.id} onclick={() => act(l.id, () => eggApi.take(l.id, c.id), t('egg.market.swapped')).then(() => (taking = null))}>
					{#if def}<Card3D card={def} period={def.period} packName={packOf(def.period)?.name ?? ''} serial={c.serial} live={false} interactive={false} />{/if}
					<span>{def?.name}</span>
				</button>
			{/each}
		</div>
	</Modal>
{/if}

{#if listing}
	<Modal title={t('egg.market.list')} width={600} onClose={() => (listing = false)}>
		<p class="lead">{t('egg.market.listLead')}</p>
		<div class="pick">
			{#each tradable as c (c.id)}
				{@const def = cardById(c.card_id)}
				<button class="choice" class:on={listCard === c.id} onclick={() => (listCard = c.id)}>
					{#if def}<Card3D card={def} period={def.period} packName={packOf(def.period)?.name ?? ''} serial={c.serial} live={false} interactive={false} />{/if}
					<span>{def?.name}</span>
				</button>
			{/each}
		</div>
		<p class="lead">{t('egg.market.listWant')}</p>
		<div class="tiers">
			<button class="tab" class:on={listTier === null} onclick={() => (listTier = null)}>{t('egg.market.anyCard')}</button>
			{#each TIERS as tier (tier)}
				<button class="tab" class:on={listTier === tier} onclick={() => (listTier = tier)}>{tierName(tier)}</button>
			{/each}
		</div>
		{#snippet footer()}
			<Button variant="ghost" onclick={() => (listing = false)}>{t('egg.cancel')}</Button>
			<Button
				variant="primary"
				disabled={!listCard || busy === 'list'}
				onclick={() => listCard && act('list', () => eggApi.list(listCard as string, { tier: listTier }), t('egg.market.listed')).then(() => (listing = false))}
			>
				{t('egg.market.listConfirm')}
			</Button>
		{/snippet}
	</Modal>
{/if}

<style>
	.market {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 24px 48px 48px;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 12px;
		max-width: 760px;
	}
	h1 {
		margin: 0;
		font-size: var(--fs-xl);
		font-weight: 600;
		color: var(--text);
	}
	.ctx {
		flex: 1;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.tabs,
	.tiers {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin: 18px 0 14px;
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
	}
	.tab:hover {
		background: var(--surface2);
	}
	.tab.on {
		background: var(--surface2);
		color: var(--text);
	}
	.tab .n {
		min-width: 18px;
		padding: 0 5px;
		border-radius: var(--r-full);
		background: var(--accent);
		color: var(--on-accent);
		font-family: var(--font-mono);
		font-size: var(--fs-2xs);
		line-height: 18px;
		text-align: center;
	}
	.list {
		max-width: 760px;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--panel);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 18px;
	}
	.row + .row {
		border-top: 1px solid var(--hairline);
	}
	.thumb {
		width: 44px;
		flex: none;
	}
	.swap {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: none;
		color: var(--dim2);
	}
	.swap .thumb {
		width: 36px;
	}
	.txt {
		flex: 1;
		min-width: 0;
	}
	.txt p {
		margin: 0;
	}
	.title {
		font-size: var(--fs-sm);
		color: var(--text);
	}
	.title .tier {
		margin-left: 8px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.desc {
		margin-top: 3px !important;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.btns {
		display: flex;
		gap: 6px;
	}
	.none {
		margin: 8px 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.lead {
		margin: 0 0 12px;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.pick {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 12px;
		max-height: 320px;
		overflow-y: auto;
		padding: 4px;
		margin-bottom: 16px;
	}
	.choice {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px;
		border: 1px solid transparent;
		border-radius: var(--r-md);
		background: none;
		color: var(--text);
		font: inherit;
		font-size: var(--fs-xs);
		cursor: pointer;
	}
	.choice:hover {
		background: var(--surface2);
	}
	.choice.on {
		background: var(--surface2);
		border-color: var(--border-strong);
	}
</style>
