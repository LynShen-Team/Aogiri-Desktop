<script lang="ts">
	// 赛博鸡蛋 · 卡册 (CE-C5, CE-C7, CE-S1..S5), as the website's album (gateway `pages/cyber-egg/album.tsx`, the wide
	// layout) on the website's own rules for it (card.web.css: .ce-album2, .ce-tabs, .ce-spread, .ce-pocket, …). A
	// row of pill tabs, one per pack (Roman numeral, name, how many of it are collected) and places for the packs to
	// come; the binder: an open spread of two 3×3 pages between rings, turned by the arrows, ←/→ or a drag. A card owned
	// shows still (×N, 「新」 when drawn today); one not owned is its real face blurred, with a small 「未获得」 lock, and
	// opens sharp in the viewer (CardViewer, flying out of its pocket and back). Below, the 集齐 strip; its panel opens
	// on demand. Claiming turns the 典藏 card over (ClaimReveal). Cash-out stays on the website (it takes the web's
	// step-up; gateway CE-API-8 leaves it out), so its buttons open the web album.
	import { untrack } from 'svelte';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import LockSimpleIcon from 'phosphor-svelte/lib/LockSimpleIcon';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon';
	import { t } from '$lib/i18n';
	import Modal from '$lib/ui/Modal.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import Card3D from './Card3D.svelte';
	import CardViewer from './CardViewer.svelte';
	import { PACKS, ROMAN, cardById, packCards, type ArtCard, type ArtPack } from './art';
	import { eggApi, eggErrorText, type EggMe, type EggOwnedCard, type EggSet } from './api';
	import { egg } from './store.svelte';
	import { yuan } from './eligibility';
	import { playReveal } from './card/sound';
	import { openWebEgg } from './web';

	let {
		me,
		onTrade,
		onFindMissing
	}: {
		me: EggMe;
		/** 「发布至交易大厅」 from the viewer: the market, 挂出 with this copy. */
		onTrade?: (copy: EggOwnedCard) => void;
		/** 「去市场寻找」: the market on this pack, 「我缺的」 on. */
		onFindMissing?: (period: number) => void;
	} = $props();

	/** Places kept on the shelf for the packs to come (the website's FUTURE_SLOTS). */
	const FUTURE_SLOTS = 7;
	/** A page holds 3×3; the binder shows two. */
	const PER_PAGE = 9;

	let period = $state(untrack(() => me.pack.period));
	let at = $state(0);
	let turn = $state<0 | 1 | -1>(0);
	let panel = $state(false);
	let claiming = $state(false);
	let revealed = $state<{ pack: ArtPack; set: EggSet } | null>(null);
	let open = $state<{ def: ArtCard; from: HTMLElement | null } | null>(null);
	/** The pocket last pressed (its card opens from there). */
	let picked: HTMLElement | null = null;

	const byCard = $derived.by(() => {
		const map = new Map<string, EggOwnedCard[]>();
		for (const card of me.collection) map.set(card.card_id, [...(map.get(card.card_id) ?? []), card]);
		return map;
	});
	// CE-H3: every card drawn today is new, the extra chances' too.
	const todayIds = $derived(new Set([...(me.today ? [me.today] : []), ...(me.today_bonus ?? [])].map((draw) => draw.card.id)));
	const shelf = $derived([...me.packs].sort((a, b) => a.period - b.period));
	const openPacks = $derived(PACKS.filter((p) => shelf.some((entry) => entry.period === p.period && entry.state !== 'upcoming')));
	const last = $derived(Math.max(0, ...shelf.map((entry) => entry.period)));
	const tabs = $derived([...shelf.map((entry) => entry.period), ...Array.from({ length: FUTURE_SLOTS }, (_, k) => last + 1 + k)]);
	const kinds = $derived(openPacks.reduce((sum, p) => sum + p.cards.filter((id) => byCard.has(id)).length, 0));
	const allKinds = $derived(openPacks.reduce((sum, p) => sum + p.cards.length, 0));
	const pack = $derived(openPacks.find((p) => p.period === period) ?? null);
	const cards = $derived<Array<ArtCard | null>>(pack ? packCards(pack.period) : Array.from({ length: 10 }, () => null));
	const pages = $derived(Array.from({ length: Math.max(1, Math.ceil(cards.length / PER_PAGE)) }, (_, k) => cards.slice(k * PER_PAGE, (k + 1) * PER_PAGE)));
	const spreads = $derived(Math.ceil(pages.length / 2));
	const shown = $derived(Math.min(at, spreads - 1));
	const set = $derived(pack ? (me.sets?.find((s) => s.period === pack.period) ?? null) : null);
	const setCard = $derived(pack?.set ? (cardById(pack.set) ?? null) : null);
	const missing = $derived(pack ? packCards(pack.period).filter((card) => !byCard.has(card.id)) : []);
	const owned = $derived(pack ? pack.cards.length - missing.length : 0);
	const setState = $derived(set?.claimed ? 'claimed' : missing.length === 0 ? 'ready' : 'collecting');
	const banned = $derived(!!me.banned);

	function named(n: number) {
		const item = PACKS.find((p) => p.period === n);
		const entry = shelf.find((e) => e.period === n);
		return item && entry && (item.ready || entry.state !== 'upcoming') ? item : null;
	}

	function go(step: 1 | -1) {
		const next = Math.max(0, Math.min(spreads - 1, shown + step));
		if (next === shown) return;
		turn = step;
		at = next;
	}

	// Keys turn the pages too (not while a dialog is open).
	function onKey(event: KeyboardEvent) {
		if (spreads < 2 || document.querySelector('[role="dialog"]')) return;
		if (event.key === 'ArrowRight') go(1);
		if (event.key === 'ArrowLeft') go(-1);
	}
	let swipe: { x: number; y: number } | null = null;

	async function claim() {
		if (!pack) return;
		const target = pack;
		claiming = true;
		try {
			const answer = await eggApi.claimSet(target.period);
			egg.me = answer.me;
			panel = false;
			revealed = { pack: target, set: answer.set };
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			claiming = false;
		}
	}

	// ClaimReveal: the 典藏 card turns over in its light a moment after the dialog opens.
	let lit = $state(false);
	$effect(() => {
		if (!revealed) return;
		lit = false;
		const id = setTimeout(() => {
			lit = true;
			playReveal('ssr');
		}, 650);
		return () => clearTimeout(id);
	});

	const day = (when: number | null) => (when ? `${new Date(when).getMonth() + 1}/${new Date(when).getDate()}` : '');
</script>

<svelte:window onkeydown={onKey} />

{#snippet pocket(def: ArtCard | null, key: string)}
	{#if !def}
		<div class="ce-pocket" data-key={key}>
			<div class="ce-slot-empty"><span class="ce-slot-no">?</span></div>
		</div>
	{:else}
		{@const copies = byCard.get(def.id) ?? []}
		<div class="ce-pocket">
			<!-- The pocket the card is opened from: it flies out of it and back (CardViewer). -->
			<div class="slot" onclickcapture={(event) => (picked = event.currentTarget)} onkeydowncapture={(event) => (picked = event.currentTarget)}>
				{#if copies.length === 0}
					<Card3D
						card={def}
						period={def.period}
						packName=""
						live={false}
						interactive={false}
						class="ce-album-card ce-card-unowned"
						label={t('egg.album.missingOpen', { no: def.no, name: def.name })}
						onclick={() => (open = { def, from: picked })}
					/>
					<span class="ce-lock-tag"><LockSimpleIcon size={12} />{t('egg.album.notOwnedShort')}</span>
				{:else}
					<Card3D card={def} period={def.period} packName="" live={false} class="ce-album-card" label={t('egg.album.open', { name: def.name })} onclick={() => (open = { def, from: picked })} />
					{#if copies.length > 1}<span class="ce-count">×{copies.length}</span>{/if}
					{#if copies.some((copy) => todayIds.has(copy.id))}<span class="ce-new">{t('egg.album.new')}</span>{/if}
				{/if}
			</div>
		</div>
	{/if}
{/snippet}

{#snippet page(items: Array<ArtCard | null>, index: number)}
	<div class="ce-page" data-cols="3">
		<div class="ce-page-grid">
			{#each items as def, k (`${index}-${k}`)}
				{@render pocket(def, `${index}-${k}`)}
			{/each}
			{#each Array.from({ length: PER_PAGE - items.length }) as _, k (`bare-${k}`)}
				<div class="ce-pocket ce-pocket-bare" aria-hidden="true"></div>
			{/each}
		</div>
		<span class="ce-page-no" aria-hidden="true">{index + 1}</span>
	</div>
{/snippet}

{#snippet setPanel(target: ArtPack, s: EggSet)}
	<aside class="ce-set-panel" data-state={setState} aria-label={t('egg.set.title')}>
		{#if setCard}
			<div class="ce-set-card">
				<Card3D
					card={setCard}
					period={target.period}
					packName={target.name}
					serial={s.claimed?.serial ?? null}
					live={setState !== 'collecting'}
					sway={setState === 'ready'}
					class={setState === 'collecting' ? 'ce-card-locked' : ''}
				/>
			</div>
		{/if}
		<div class="set-head">
			<p class="set-title">{t('egg.set.title')}</p>
			<p class="set-gives">{t('egg.set.gives', { count: target.cards.length, cash: yuan(s.bonus_cash_fen), gift: yuan(s.bonus_gift_fen) })}</p>
		</div>
		{#if setState === 'collecting'}
			<div class="set-block">
				<p class="set-strong">{t('egg.set.left', { count: missing.length })}</p>
				<ul class="missing">
					{#each missing as def (def.id)}
						<li><span class="ce-tier-dot" data-tier={def.tier} aria-hidden="true"></span>{def.name}</li>
					{/each}
				</ul>
				<Button
					size="sm"
					disabled={!onFindMissing}
					onclick={() => {
						panel = false;
						onFindMissing?.(target.period);
					}}><MagnifyingGlassIcon size={14} />{t('egg.set.find', { count: missing.length })}</Button
				>
			</div>
		{:else if setState === 'ready'}
			<div class="set-block">
				<p class="set-strong">{t('egg.set.ready', { count: target.cards.length })}</p>
				<Button variant="primary" disabled={claiming || banned || s.left <= 0} onclick={claim}>{t(s.left > 0 ? 'egg.set.claim' : 'egg.set.soldOut')}</Button>
				<p class="set-note">{t('egg.set.lockNote')}</p>
			</div>
		{:else if s.claimed}
			<div class="set-block">
				<div>
					<p class="set-strong medium">{t('egg.set.rank', { rank: s.claimed.rank })}</p>
					<p class="set-gives">{t('egg.set.giftIn', { gift: yuan(s.claimed.gift_fen) })}</p>
				</div>
				<div class="cash" data-state={s.claimed.cash?.state ?? 'held'}>
					<p class="cash-row"><span>{t('egg.set.cash')}</span><span class="cash-fig">¥{yuan(s.claimed.cash_fen)}</span></p>
					{#if !s.claimed.cash || s.claimed.cash.state === 'held'}
						<Button size="sm" disabled={banned} onclick={() => openWebEgg('/album')}><ArrowSquareOutIcon size={14} />{t('egg.cash.onWeb')}</Button>
					{:else}
						<p class="set-note">{t(`egg.cash.${s.claimed.cash.state}`, { date: day(s.claimed.cash.at) })}</p>
					{/if}
				</div>
			</div>
		{/if}
		<p class="set-foot">{s.left > 0 ? t('egg.set.rewardsLeft', { count: s.left }) : t('egg.set.none')} · {t('egg.set.completed', { count: s.completed })}</p>
	</aside>
{/snippet}

<div class="ce-album2">
	{#if banned}<p class="banned" role="status">{t('egg.album.banned')}</p>{/if}
	<div class="ce-album2-bar">
		<div class="ce-tabs" role="tablist">
			{#each tabs as n (n)}
				{@const item = named(n)}
				<button
					class="ce-tab"
					role="tab"
					aria-selected={period === n}
					onclick={() => {
						period = n;
						at = 0;
						turn = 0;
					}}
				>
					<span class="ce-tab-numeral">{ROMAN[n] ?? n}</span>
					<span class="ce-tab-name">{item ? item.name : t('egg.album.unannounced')}</span>
					{#if item}<span class="ce-tab-count">{item.cards.filter((id) => byCard.has(id)).length}/{item.cards.length}</span>{/if}
				</button>
			{/each}
		</div>
		<p class="ce-album2-total">{t('egg.album.total', { cards: me.collection.length, kinds, all: allKinds })}</p>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="ce-book"
		onpointerdown={(event) => (swipe = { x: event.clientX, y: event.clientY })}
		onpointerup={(event) => {
			const from = swipe;
			swipe = null;
			if (from && Math.abs(event.clientX - from.x) > 60 && Math.abs(event.clientX - from.x) > Math.abs(event.clientY - from.y)) go(event.clientX < from.x ? 1 : -1);
		}}
	>
		{#if spreads > 1}
			<button class="ce-book-arrow" data-side="left" onclick={() => go(-1)} disabled={shown === 0} aria-label={t('egg.album.prev')}><CaretLeftIcon size={20} /></button>
		{/if}
		{#key `${period}-${shown}`}
			<div class="ce-spread" data-turn={turn === 0 ? undefined : turn > 0 ? 'next' : 'prev'}>
				{@render page(pages[shown * 2] ?? [], shown * 2)}
				<span class="ce-spread-rings" aria-hidden="true"></span>
				{@render page(pages[shown * 2 + 1] ?? [], shown * 2 + 1)}
			</div>
		{/key}
		{#if spreads > 1}
			<button class="ce-book-arrow" data-side="right" onclick={() => go(1)} disabled={shown >= spreads - 1} aria-label={t('egg.album.next')}><CaretRightIcon size={20} /></button>
		{/if}
	</div>

	{#if pack && set}
		<div class="ce-set-strip" data-state={setState}>
			<div class="strip-text">
				<p class="strip-line">
					{set.claimed
						? t('egg.set.stripClaimed', { rank: set.claimed.rank })
						: missing.length === 0
							? t('egg.set.stripReady', { count: pack.cards.length })
							: t('egg.set.stripLeft', { count: missing.length, owned, total: pack.cards.length })}
				</p>
				<p class="strip-sub">{set.left > 0 ? t('egg.set.rewardsLeft', { count: set.left }) : t('egg.set.none')}</p>
			</div>
			{#if !set.claimed && missing.length === 0}
				<Button size="sm" variant="primary" disabled={claiming || set.left <= 0 || banned} onclick={claim}>{t(set.left > 0 ? 'egg.set.claim' : 'egg.set.soldOut')}</Button>
			{/if}
			<Button size="sm" onclick={() => (panel = true)}>{t('egg.set.title')}</Button>
		</div>
	{:else if !pack}
		<div class="ce-set-strip">
			<p class="strip-sub future">{t('egg.album.futureBody')}</p>
		</div>
	{/if}
</div>

{#if panel && pack && set}
	<Modal label={t('egg.set.title')} width={420} padded={false} onClose={() => (panel = false)}>
		<div class="ce-set-dialog">{@render setPanel(pack, set)}</div>
	</Modal>
{/if}

{#if open}
	{@const def = open.def}
	<CardViewer
		items={[{ def, copies: byCard.get(def.id) ?? [] }]}
		from={() => open?.from ?? null}
		onTrade={banned || !onTrade
			? null
			: (copy) => {
					open = null;
					onTrade?.(copy);
				}}
		onClose={() => (open = null)}
	/>
{/if}

{#if revealed?.set.claimed}
	{@const r = revealed}
	{@const card = r.pack.set ? cardById(r.pack.set) : null}
	<Modal title={t('egg.set.claimedTitle', { name: r.pack.name })} width={448} onClose={() => (revealed = null)}>
		<p class="reveal-desc">{t('egg.set.rank', { rank: r.set.claimed?.rank ?? 0 })}</p>
		{#if card}
			<div class="ce-claim-stage ce-view-stage" data-on={lit ? '' : undefined} style:--ce-view-max="210px">
				<span class="ce-claim-aura" aria-hidden="true"></span>
				<div class="ce-view-card reveal-card">
					<Card3D {card} period={r.pack.period} packName={r.pack.name} serial={r.set.claimed?.serial ?? null} flipped={!lit} sway />
				</div>
			</div>
		{/if}
		<dl class="gains">
			<div>
				<dt>{t('egg.set.cash')}</dt>
				<dd class="fig">+¥{yuan(r.set.claimed?.cash_fen ?? 0)}</dd>
				<dd class="note">{t('egg.set.cashNote')}</dd>
			</div>
			<div>
				<dt>{t('egg.set.gift')}</dt>
				<dd class="fig">+¥{yuan(r.set.claimed?.gift_fen ?? 0)}</dd>
				<dd class="note">{t('egg.set.giftNote')}</dd>
			</div>
		</dl>
		{#snippet footer()}
			<Button variant="primary" full onclick={() => (revealed = null)}>{t('egg.set.done')}</Button>
		{/snippet}
	</Modal>
{/if}

<style>
	/* The web's own album rules (card.web.css) lay out the tabs, the binder, the pockets and the strip; these are what
	   the web writes as utility classes. */
	.banned {
		flex: none;
		margin: 0;
		padding: 8px 14px;
		border: 1px solid color-mix(in oklab, var(--warning, #c99a3e) 45%, transparent);
		border-radius: var(--r-lg);
		background: color-mix(in oklab, var(--warning, #c99a3e) 10%, transparent);
		font-size: 13px;
		color: var(--text);
	}
	.ce-album2 :global(.ce-tab) {
		border: none;
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}
	.ce-album2 :global(.ce-tab:not([aria-selected='true'])) {
		background: none;
	}
	.ce-album2 :global(.ce-tab-name) {
		white-space: nowrap;
	}
	.ce-album2 :global(.ce-album2-total) {
		margin: 0;
	}
	.ce-album2 :global(.ce-book-arrow) {
		border: none;
		color: var(--text);
		cursor: pointer;
	}
	.ce-album2 :global(.ce-book-arrow:disabled) {
		cursor: default;
	}
	.slot {
		position: relative;
	}
	.slot :global(.ce-lock-tag > svg) {
		flex: none;
	}
	.strip-text {
		flex: 1;
		min-width: 0;
	}
	.strip-text p {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.strip-line {
		font-size: var(--fs-sm);
		font-weight: 500;
		color: var(--text);
	}
	.strip-sub {
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.strip-sub.future {
		flex: 1;
		min-width: 0;
		margin: 0;
		font-size: var(--fs-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* The 集齐 panel in its dialog. */
	.ce-set-dialog {
		padding: 22px 22px 18px;
		overflow-y: auto;
	}
	.ce-set-dialog :global(.ce-set-card) {
		margin: 0 auto;
	}
	.set-head,
	.set-block {
		display: grid;
		gap: 10px;
	}
	.set-head {
		gap: 6px;
	}
	.set-head p,
	.set-block p {
		margin: 0;
	}
	.set-title {
		font-size: var(--fs-sm);
		font-weight: 600;
		color: var(--text);
	}
	.set-gives {
		font-size: 13px;
		line-height: 20px;
		color: var(--dim);
	}
	.set-strong {
		font-size: var(--fs-sm);
		color: var(--text);
	}
	.set-strong.medium {
		font-weight: 500;
	}
	.set-note {
		font-size: var(--fs-xs);
		line-height: 20px;
		color: var(--dim);
	}
	.missing {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.missing li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid var(--border);
		border-radius: var(--r-full);
		font-size: var(--fs-xs);
		color: var(--text);
	}
	.cash {
		display: grid;
		gap: 8px;
		padding: 12px 14px;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
	}
	.cash-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		font-size: 13px;
		color: var(--dim);
	}
	.cash-fig {
		font-size: var(--fs-lg);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}
	.set-foot {
		margin: 0;
		padding-top: 12px;
		border-top: 1px solid var(--border);
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	/* ClaimReveal. */
	.reveal-desc {
		margin: -6px 0 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.reveal-card {
		position: relative;
	}
	.gains {
		display: grid;
		flex: none;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		margin: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--border);
		text-align: center;
	}
	.gains > div {
		padding: 12px;
		background: var(--panel);
	}
	.gains dt {
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.gains dd {
		margin: 0;
	}
	.gains .fig {
		margin-top: 4px;
		font-size: 24px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}
	.gains .note {
		margin-top: 2px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
</style>
