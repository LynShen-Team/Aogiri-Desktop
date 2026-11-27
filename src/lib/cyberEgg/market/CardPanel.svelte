<script lang="ts">
	// CE-X4: one card's market, in the side panel (the website's CardMarket): the card, who puts it up and for what,
	// who wants it and offers what, and the two ways to join in (put mine up, ask for it).
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import Card3D from '../Card3D.svelte';
	import { TIER_LOOK, cardById, packOf, type ArtCard } from '../art';
	import type { EggListing, EggOwnedCard } from '../api';
	import SidePanel from './SidePanel.svelte';
	import Thumb from './Thumb.svelte';
	import TopupNote from './TopupNote.svelte';
	import { ago, anyOf, matches, tierName } from './shared';

	let {
		def,
		listings,
		mine: tradableMine,
		owned,
		banned,
		now,
		onClose,
		onTake,
		onList
	}: {
		def: ArtCard;
		listings: EggListing[];
		/** My copies that can be offered now. */
		mine: EggOwnedCard[];
		/** How many copies I have of anything (none: nothing to ask with). */
		owned: number;
		banned: boolean;
		now: number;
		onClose: () => void;
		onTake: (listing: EggListing) => void;
		onList: (give: EggOwnedCard | null, want: string | null) => void;
	} = $props();

	const offers = $derived(listings.filter((item) => item.give.card_id === def.id));
	const wants = $derived(
		listings.filter((item) => item.want_card_id === def.id || (item.want_card_id === null && item.want_tier === def.tier && item.give.card_id !== def.id))
	);
	const copies = $derived(tradableMine.filter((card) => card.card_id === def.id));
	const wantLabel = (item: EggListing) => {
		const wanted = item.want_card_id ? cardById(item.want_card_id) : null;
		return wanted ? t('eggMarket.market.forCard', { name: wanted.name }) : t('eggMarket.market.forAny', { what: anyOf(item.want_tier) });
	};
	const who = (item: EggListing) => (item.mine ? t('eggMarket.hall.mine') : item.owner);
	const iPay = (item: EggListing) => (item.mine ? item.topup?.by === 'owner' : item.topup?.by === 'taker');
</script>

<SidePanel label={def.name} {onClose}>
	{#snippet head()}
		<div class="head">
			<h2><span class="ce-tier-dot" data-tier={def.tier} aria-hidden="true"></span>{def.name}</h2>
			<p class="sub">
				{tierName(def.tier)} · {TIER_LOOK[def.tier].code} · {t('eggMarket.period', { n: def.period })}
				{String(def.no).padStart(2, '0')}/{def.of}
			</p>
		</div>
	{/snippet}
	<div class="scroll">
		<div class="card">
			<Card3D card={def} period={def.period} packName={packOf(def.period)?.name ?? ''} sway />
		</div>
		<dl class="stats">
			<div><dt>{t('eggMarket.market.statOffers')}</dt><dd>{offers.length}</dd></div>
			<div><dt>{t('eggMarket.market.statWants')}</dt><dd>{wants.length}</dd></div>
			<div><dt>{t('eggMarket.market.statMine')}</dt><dd>{copies.length}</dd></div>
		</dl>
		<section>
			<h3>{t('eggMarket.market.offersTitle')}</h3>
			{#if offers.length === 0}
				<p class="none">{t('eggMarket.market.noOffers')}</p>
			{:else}
				<ul>
					{#each offers as item (item.id)}
						{@const wanted = item.want_card_id ? cardById(item.want_card_id) : null}
						{@const can = matches(item, tradableMine).length > 0}
						<li>
							<span class="mini">{#if wanted}<Thumb def={wanted} />{/if}</span>
							<span class="txt">
								<span class="label"><span class="text">{wantLabel(item)}</span><TopupNote topup={item.topup} iPay={iPay(item)} /></span>
								<span class="by">{who(item)} · {ago(item.at, now)}</span>
							</span>
							{#if !item.mine}
								<span class="act">
									<Button size="sm" variant="primary" disabled={!can || banned} onclick={() => onTake(item)}>
										{can ? t('eggMarket.hall.take') : t('eggMarket.market.cannotShort')}
									</Button>
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
		<section>
			<h3>{t('eggMarket.market.wantsTitle')}</h3>
			{#if wants.length === 0}
				<p class="none">{t('eggMarket.market.noWants')}</p>
			{:else}
				<ul>
					{#each wants as item (item.id)}
						{@const given = cardById(item.give.card_id)}
						<li>
							<span class="mini">{#if given}<Thumb def={given} />{/if}</span>
							<span class="txt">
								<span class="label"><span class="text">{t('eggMarket.market.offering', { name: given?.name ?? '' })}</span><TopupNote topup={item.topup} iPay={iPay(item)} /></span>
								<span class="by">{who(item)} · {ago(item.at, now)}</span>
							</span>
							{#if !item.mine}
								<span class="act">
									<Button size="sm" disabled={copies.length === 0 || banned} onclick={() => onTake(item)}>
										{copies.length ? t('eggMarket.market.sell') : t('eggMarket.market.cannotShort')}
									</Button>
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
	{#snippet footer()}
		<div class="foot">
			<Button full disabled={copies.length === 0 || banned} onclick={() => onList(copies[0] ?? null, null)}>{t('eggMarket.market.listThis')}</Button>
			<Button full variant="primary" disabled={owned === 0 || banned} onclick={() => onList(null, def.id)}>{t('eggMarket.market.wantThis')}</Button>
		</div>
	{/snippet}
</SidePanel>

<style>
	.head {
		padding: 20px 56px 20px 24px;
		border-bottom: 1px solid var(--border);
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
	.sub {
		margin: 6px 0 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.scroll {
		display: grid;
		flex: 1 1 auto;
		grid-auto-rows: max-content;
		align-content: start;
		gap: 24px;
		min-height: 0;
		padding: 24px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.card {
		width: min(200px, 56vw);
		margin: 0 auto;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		margin: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--border);
		text-align: center;
	}
	.stats > div {
		padding: 12px 8px;
		background: var(--panel);
	}
	dt {
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	dd {
		margin: 4px 0 0;
		font-size: var(--fs-lg);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}
	h3 {
		margin: 0;
		font-size: var(--fs-sm);
		font-weight: 600;
		color: var(--text);
	}
	.none {
		margin: 8px 0 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
	}
	li + li {
		border-top: 1px solid var(--hairline);
	}
	.mini {
		flex: none;
		width: 40px;
	}
	.txt {
		flex: 1;
		min-width: 0;
	}
	.label {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
		min-width: 0;
		font-size: var(--fs-sm);
		color: var(--text);
	}
	.text {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.by {
		display: block;
		margin-top: 2px;
		font-size: var(--fs-xs);
		color: var(--dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.act {
		flex: none;
	}
	.foot {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		padding: 16px 24px;
		border-top: 1px solid var(--border);
	}
</style>
