<script lang="ts" module>
	import type { ArtCard } from './art';
	import type { EggOwnedCard } from './api';

	/** One card the viewer shows: the card, this user's copies of it (newest first), and what its draw gave. */
	export interface ViewerItem {
		def: ArtCard;
		copies: EggOwnedCard[];
		/** CE-C8: this card is the one drawn (its serial and tokens). */
		drawn?: { serial: number; tokens: number } | null;
	}
</script>

<script lang="ts">
	// CE-C6: a card large, as the website's viewer (gateway `pages/cyber-egg/card-view.tsx`): it turns under the
	// pointer and sways, flips, and lists every copy with where it came from. CE-C7: a card not owned opens too, says
	// so and comes into focus as it lands. CE-C8: a set (the five of a draw, today's cards) goes through with arrows,
	// ←/→ and dots. Opened from a card on the page it flies here and back (card/flight.ts). G100: it fits the window
	// and never scrolls as a whole; the card shrinks with the height left, only the text column scrolls.
	import { onMount, untrack } from 'svelte';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import ArrowCounterClockwiseIcon from 'phosphor-svelte/lib/ArrowCounterClockwiseIcon';
	import ArrowsLeftRightIcon from 'phosphor-svelte/lib/ArrowsLeftRightIcon';
	import LockSimpleIcon from 'phosphor-svelte/lib/LockSimpleIcon';
	import { getLocale, t } from '$lib/i18n';
	import Modal from '$lib/ui/Modal.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card3D from './Card3D.svelte';
	import { TIER_LOOK, packOf } from './art';
	import { egg } from './store.svelte';
	import { cardRate, percent } from './odds';
	import { dayText, tokensText } from './format';
	import { CLOSE_MS, OPEN_MS, easeInOut, easeOut, ghostTransform, glide, placeOf, reducedMotion } from './card/flight';

	let {
		items,
		start = 0,
		inDraw = false,
		today = false,
		from,
		onTrade = null,
		onClose
	}: {
		items: ViewerItem[];
		/** The card shown first. */
		start?: number;
		/** CE-C8: the five of a draw (the others say 「未抽中」). */
		inDraw?: boolean;
		/** CE-H3: today's cards (the 调用 page): 「今日抽中」 instead of 「本次抽中」. */
		today?: boolean;
		/** CE-C6: the element card `index` sits in on the page: it flies from there and back. */
		from?: (index: number) => HTMLElement | null | undefined;
		/** 「发布至交易大厅」 for a copy (null: not offered — banned, the odds list, a draw). */
		onTrade?: ((copy: EggOwnedCard) => void) | null;
		onClose: () => void;
	} = $props();

	let index = $state(untrack(() => Math.max(0, Math.min(start, items.length - 1))));
	let flipped = $state(false);
	const item = $derived(items[index] ?? items[0]);
	const def = $derived(item.def);
	const copies = $derived(item.copies);
	const owned = $derived(copies.length > 0);
	const drawn = $derived(item.drawn ?? null);
	const drawnAt = $derived(items.findIndex((other) => other.drawn));
	const packName = $derived(packOf(def.period)?.name ?? '');
	const rate = $derived(egg.me ? cardRate(egg.me, def) : null);
	const locale = $derived(getLocale());
	const serial = $derived(drawn ? drawn.serial : inDraw ? null : (copies[0]?.serial ?? null));
	const tag = $derived(
		drawn
			? t(today ? 'egg.view.today' : 'egg.view.drawn')
			: inDraw
				? owned
					? t('egg.view.otherOwned', { count: copies.length })
					: t('egg.view.otherNotOwned')
				: owned
					? null
					: t('egg.view.notOwned')
	);
	const code = $derived(def.special === 'set' ? t('egg.album.setCode') : TIER_LOOK[def.tier].code);
	const blurred = $derived(!owned && !drawn);

	function go(step: number) {
		const next = index + step;
		if (next >= 0 && next < items.length) {
			index = next;
			flipped = false;
		}
	}

	// ── The flight (card/flight.ts) ──
	const moving = untrack(() => !!from) && !reducedMotion();
	let phase = $state<'in' | 'open' | 'out'>(moving ? 'in' : 'open');
	let cardBox = $state<HTMLDivElement>();
	let ghost = $state<HTMLDivElement>();
	let width = 0;
	let running: ReturnType<typeof glide> | null = null;
	const source = () => from?.(index) ?? null;

	/** The ghost takes the viewer card's own width once the dialog is there. */
	function sizeGhost(): number {
		if (!width && cardBox && cardBox.offsetWidth > 0 && ghost) {
			width = cardBox.offsetWidth;
			ghost.style.width = `${width}px`;
		}
		return width;
	}

	// The card's place on the page stays empty while it is out (the one shown now, as the set moves on).
	$effect(() => {
		if (!moving) return;
		const place = from?.(index);
		place?.style.setProperty('visibility', 'hidden');
		return () => place?.style.removeProperty('visibility');
	});

	onMount(() => {
		if (!moving) return;
		let raf = 0;
		let tries = 0;
		const begin = () => {
			const begin0 = placeOf(source());
			const size = sizeGhost();
			if (!ghost || !begin0 || !size) {
				tries += 1;
				if (tries < 30 && begin0) raf = requestAnimationFrame(begin);
				else phase = 'open';
				return;
			}
			ghost.style.transform = ghostTransform(begin0, size);
			ghost.style.visibility = 'visible';
			const out = glide(ghost, size, () => placeOf(source()), () => placeOf(cardBox), OPEN_MS, easeOut);
			running = out;
			void out.done.then((landed) => {
				if (landed && phase === 'in') phase = 'open';
			});
		};
		raf = requestAnimationFrame(begin);
		return () => {
			cancelAnimationFrame(raf);
			running?.stop();
		};
	});

	// Landed: the real card shows in the same frame the ghost goes.
	$effect(() => {
		if (phase === 'open' && ghost) ghost.style.visibility = 'hidden';
	});

	function close() {
		if (!moving) return onClose();
		if (phase === 'out') return;
		const was = running?.stop() ?? null;
		const begin = (phase === 'in' ? was : null) ?? placeOf(cardBox);
		const size = sizeGhost();
		if (!ghost || !begin || !size || !source()) return onClose();
		ghost.style.transform = ghostTransform(begin, size);
		ghost.style.visibility = 'visible';
		phase = 'out';
		const back = glide(ghost, size, () => begin, () => placeOf(source()), CLOSE_MS, easeInOut);
		running = back;
		void back.done.then((landed) => {
			if (landed) onClose();
		});
	}

	function onKey(event: KeyboardEvent) {
		if (items.length < 2 || phase !== 'open') return;
		if (event.key === 'ArrowLeft') go(-1);
		else if (event.key === 'ArrowRight') go(1);
	}

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}
</script>

<svelte:window onkeydown={onKey} />

{#if moving}
	<div class="ghost" bind:this={ghost} use:portal aria-hidden="true">
		<Card3D card={def} period={def.period} {packName} {serial} {flipped} interactive={false} live={false} class={blurred ? 'ce-card-unowned' : ''} />
	</div>
{/if}

{#if phase !== 'out'}
	<Modal label={def.name} width={768} padded={false} onClose={close}>
		<div class="viewer">
			<header class="head">
				<div class="titles">
					<h2>
						<span class="ce-tier-dot" data-tier={def.tier} aria-hidden="true"></span>
						<span class="name">{def.name}</span>
						{#if tag}<span class="tag" class:on={!!drawn}>{tag}</span>{/if}
					</h2>
					<p>{t(`egg.tier.${def.tier}`)} · {code} · {packName} {String(def.no).padStart(2, '0')}/{def.of}</p>
				</div>
				<button class="x" aria-label={t('common.close')} onclick={close}><XIcon size={18} /></button>
			</header>
			<div class="body">
				<div class="side">
					<div class="ce-view-stage">
						<div bind:this={cardBox} class="ce-view-card" class:ce-come-clear={blurred && phase === 'open'} style:visibility={phase === 'open' ? undefined : 'hidden'}>
							{#key index}
								<Card3D card={def} period={def.period} {packName} {serial} {flipped} sway />
							{/key}
						</div>
					</div>
					{#if items.length > 1}
						<div class="nav">
							<button class="step" disabled={index === 0} onclick={() => go(-1)} aria-label={t('egg.view.prev')}><CaretLeftIcon size={16} /></button>
							<div class="dots" role="tablist" aria-label={t(today ? 'egg.view.todaySet' : 'egg.view.set')}>
								{#each items as _, k (k)}
									<button
										class="dot"
										class:drawn={k === drawnAt}
										role="tab"
										aria-selected={k === index}
										aria-label={k === drawnAt ? t('egg.view.dotDrawn', { n: k + 1 }) : t('egg.view.dot', { n: k + 1 })}
										onclick={() => {
											index = k;
											flipped = false;
										}}><i></i></button
									>
								{/each}
							</div>
							<button class="step" disabled={index === items.length - 1} onclick={() => go(1)} aria-label={t('egg.view.next')}><CaretRightIcon size={16} /></button>
						</div>
					{/if}
					<div class="actions">
						<Button size="sm" onclick={() => (flipped = !flipped)}><ArrowCounterClockwiseIcon size={14} />{t('egg.view.flip')}</Button>
					</div>
				</div>
				<div class="info">
					<p class="line">{def.line}</p>
					{#if drawn}<p class="fact">{t('egg.view.drawnTokens', { tokens: tokensText(drawn.tokens, locale) })}</p>{/if}
					{#if rate !== null}
						<p class="fact"><span class="dim">{t('egg.view.rate')}</span><span class="pct">{percent(rate, locale === 'zh' ? 'zh-CN' : 'en-US')}</span></p>
					{/if}
					<p class="count">{t('egg.view.copies', { count: copies.length })}</p>
					{#if owned}
						<ul class="copies">
							{#each copies as copy (copy.id)}
								<li>
									<span class="what">
										<span class="no">№ {String(copy.serial).padStart(6, '0')}</span>
										<span class="dim">
											{copy.from === 'trade'
												? t('egg.view.fromTrade', { date: dayText(copy.at, locale) })
												: t('egg.view.fromDraw', { date: dayText(copy.at, locale), tokens: tokensText(copy.tokens, locale) })}
										</span>
									</span>
									{#if copy.locked}
										<span class="locked"><LockSimpleIcon size={12} />{t('egg.set.lockedCopy')}</span>
									{:else if onTrade}
										<Button size="sm" variant="ghost" onclick={() => onTrade(copy)}><ArrowsLeftRightIcon size={14} />{t('egg.view.offer')}</Button>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="none">{t('egg.view.notOwnedBody')}</p>
					{/if}
					<p class="later">{t('egg.view.later')}</p>
				</div>
			</div>
		</div>
	</Modal>
{/if}

<style>
	/* The flying copy, above the dialog (the Modal's scrim is z-index 100). */
	.ghost {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 130;
		width: 300px;
		visibility: hidden;
		pointer-events: none;
		transform-origin: center;
	}
	.viewer {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		gap: 16px;
		min-height: 0;
		padding: 20px 22px 24px;
		overflow: hidden;
	}
	.head {
		display: flex;
		flex: none;
		align-items: flex-start;
		gap: 12px;
	}
	.titles {
		flex: 1;
		min-width: 0;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: var(--fs-lg);
		font-weight: 600;
		line-height: 24px;
		color: var(--text);
	}
	.name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tag {
		flex: none;
		padding: 2px 8px;
		border: 1px solid var(--border);
		border-radius: var(--r-full);
		font-size: var(--fs-xs);
		font-weight: 400;
		line-height: 16px;
		color: var(--dim);
	}
	.tag.on {
		border-color: color-mix(in oklab, var(--text) 30%, transparent);
		color: var(--text);
	}
	.titles p {
		margin: 4px 0 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.x {
		display: inline-flex;
		flex: none;
		padding: 4px;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim);
		cursor: pointer;
	}
	.x:hover {
		background: var(--surface2);
		color: var(--text);
	}
	.body {
		display: flex;
		flex: 1 1 auto;
		gap: 32px;
		min-height: 0;
	}
	.side {
		display: flex;
		flex: none;
		flex-direction: column;
		align-items: center;
		width: 320px;
		min-height: 0;
	}
	.nav {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin-top: 12px;
	}
	.step {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: var(--r-full);
		background: none;
		color: var(--text);
		cursor: pointer;
	}
	.step:hover:not(:disabled) {
		background: var(--surface2);
	}
	.step:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.dots {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.dot {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		padding: 0;
		border: none;
		border-radius: var(--r-full);
		background: none;
		cursor: pointer;
	}
	.dot.drawn {
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--text) 40%, transparent);
	}
	.dot i {
		display: block;
		width: 6px;
		height: 6px;
		border-radius: var(--r-full);
		background: color-mix(in oklab, var(--text) 25%, transparent);
		transition: background var(--t-fast) var(--ease-out);
	}
	.dot[aria-selected='true'] i {
		background: var(--text);
	}
	.actions {
		display: flex;
		flex: none;
		justify-content: center;
		gap: 8px;
		margin-top: 16px;
	}
	/* Only this column scrolls, inside itself, when its text is long. */
	.info {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.info p {
		margin: 0;
	}
	.line {
		font-size: var(--fs-sm);
		line-height: 24px;
		color: var(--text);
	}
	.fact {
		margin-top: 16px !important;
		font-size: var(--fs-sm);
		color: var(--text);
	}
	.dim {
		color: var(--dim);
	}
	.pct {
		margin-left: 8px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.count {
		margin-top: 20px !important;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.copies {
		flex: 0 1 auto;
		min-height: 46px;
		margin: 8px 0 0;
		padding: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		font-size: var(--fs-sm);
	}
	.copies li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 44px;
		padding: 6px 8px 6px 16px;
	}
	.copies li + li {
		border-top: 1px solid var(--border);
	}
	/* № on the first line, where it came from under it (the column is narrow beside the card). */
	.what {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.what .dim {
		font-size: var(--fs-xs);
	}
	.no {
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}
	.locked {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 4px;
		padding-right: 8px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.none {
		margin-top: 8px !important;
		padding: 12px 16px;
		border: 1px dashed var(--border-strong);
		border-radius: var(--r-lg);
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.later {
		margin-top: 16px !important;
		font-size: 13px;
		line-height: 20px;
		color: var(--dim);
	}
</style>
