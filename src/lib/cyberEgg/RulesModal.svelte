<script lang="ts">
	// 赛博鸡蛋 · 规则与概率 (CE-UI-6, CE-D2, CE-D6), as the website's dialog (gateway `pages/cyber-egg/index.tsx`
	// RulesDialog): three short tabs instead of one long scroll (owner 2026-11-24). 概率: each tier's tokens, its base
	// chance, its long-run chance with the guarantees and one card's share, then every card of the round's pack. 保底:
	// the guarantees in bullets and how far the player is from them. 规则: every rule with the round's numbers. The
	// tabs stay put; only the tab's page scrolls.
	import { t } from '$lib/i18n';
	import Modal from '$lib/ui/Modal.svelte';
	import { TIER_LOOK, packCards } from './art';
	import type { EggMe } from './api';
	import { DEFAULT_PITY, baseRates, percent, roundRates } from './odds';
	import { yuan } from './eligibility';
	import OddsCards from './info/OddsCards.svelte';
	import PityLine from './info/PityLine.svelte';
	import { campaignDate, intlLocale, tn, tokens } from './info/text';

	let { me, onClose }: { me: EggMe; onClose: () => void } = $props();

	/** Past this many models a list names the first three and 「等 N 个模型」 (the website's MANY_MODELS). */
	const MANY_MODELS = 6;
	const TABS = ['odds', 'pity', 'rules'] as const;
	let tab = $state<(typeof TABS)[number]>('odds');

	const pity = $derived(me.pity ?? DEFAULT_PITY);
	const base = $derived(baseRates(me.tiers));
	// CE-D6: the long-run chance with the guarantees counted, and that chance on each card of the tier.
	const rates = $derived(roundRates(me));
	const cards = $derived(packCards(me.pack.period));
	const pct = (value: number) => percent(value, intlLocale());
	const perCard = (tier: EggMe['tiers'][number]['tier']) => (rates[tier] ?? 0) / Math.max(1, cards.filter((card) => card.tier === tier).length);

	/** The average tokens of a draw, without and with the guarantees, to the nearest 万. */
	const ev = $derived(me.tiers.reduce((sum, rule) => sum + ((rule.min_tokens + rule.max_tokens) / 2) * (base[rule.tier] ?? 0), 0));
	const evPity = $derived(me.tiers.reduce((sum, rule) => sum + ((rule.min_tokens + rule.max_tokens) / 2) * (rates[rule.tier] ?? 0), 0));
	const near = (value: number) => tokens(Math.round(value / 10_000) * 10_000);

	const pityItems = $derived.by(() => {
		const items: string[] = [];
		for (const tier of ['sr', 'ssr', 'ur'] as const) {
			const at = pity[`${tier}_at`];
			if (!(at > 0)) continue;
			items.push(
				tier === 'sr'
					? tn('eggInfo.pity.rulePersonal', at - 1, { count: at, before: at - 1 })
					: tn('eggInfo.pity.ruleOne', at, { count: at, tier: t(`eggInfo.tier.${tier}`) })
			);
		}
		if (pity.shared_sr_every) items.push(t('eggInfo.pity.ruleServer', { count: pity.shared_sr_every }));
		if (!(pity.ssr_at > 0 && pity.ur_at > 0)) items.push(t(pity.ssr_at > 0 ? 'eggInfo.pity.ruleNoneUr' : 'eggInfo.pity.ruleNone'));
		items.push(t('eggInfo.pity.ruleHow2'), t('eggInfo.pity.ruleCarry'));
		if (pity.dupe_guard) items.push(t('eggInfo.pity.ruleDupe'));
		return items;
	});

	const ruleItems = $derived.by(() => {
		const campaign = me.campaign;
		if (!campaign) return [];
		const funds = me.checks.find((check) => check.key === 'funds');
		const age = me.checks.find((check) => check.key === 'account_age');
		const balance = yuan(funds?.min_balance_fen ?? 0);
		const days = age?.min_account_days ?? 0;
		const sep = t('eggInfo.listSeparator');
		// Hotfix 11-25: past six models, the first three and 「等 N 个模型」, not a list of dozens.
		const models =
			campaign.models.length > MANY_MODELS
				? t('eggInfo.models.andMore', { list: campaign.models.slice(0, 3).join(sep), total: campaign.models.length, rest: campaign.models.length - 3 })
				: campaign.models.join(sep);
		return [
			t('eggInfo.rule.time', { start: campaignDate(campaign.starts_at), end: campaignDate(campaign.ends_at), days: campaign.day.count }),
			funds?.min_plan ? t('eggInfo.rule.join', { balance, plan: funds.min_plan, days }) : t('eggInfo.rule.joinNoPlan', { balance, days }),
			t('eggInfo.rule.daily'),
			t('eggInfo.rule.pick'),
			t('eggInfo.rule.expire', { models }),
			t('eggInfo.rule.meter'),
			t('eggInfo.rule.endpoint', { url: me.api_base_url }),
			t(funds?.min_plan ? 'eggInfo.rule.balance' : 'eggInfo.rule.balanceNoPlan', { balance }),
			// An older gateway may not send the pool; its rule then goes.
			...(campaign.pool_tokens !== undefined ? [t('eggInfo.rule.pool', { pool: tokens(campaign.pool_tokens) })] : []),
			t('eggInfo.rule.cards'),
			t('eggInfo.rule.onePerPerson')
		];
	});

	// A hairline under the tabs while the page under them is scrolled.
	let scrolled = $state(false);
	let pane = $state<HTMLDivElement>();
	$effect(() => {
		void tab;
		if (pane) pane.scrollTop = 0;
		scrolled = false;
	});

	function onTabKey(event: KeyboardEvent) {
		const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
		if (!step) return;
		event.preventDefault();
		const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length];
		tab = next;
		(event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
	}
</script>

<Modal title={t('eggInfo.rules.title')} width={512} padded={false} {onClose}>
	<div class="rules">
		<div class="tabbar" class:scrolled>
			<div class="tabs" role="tablist" aria-label={t('eggInfo.rules.title')}>
				{#each TABS as key (key)}
					<button
						type="button"
						role="tab"
						data-tab={key}
						aria-selected={tab === key}
						tabindex={tab === key ? 0 : -1}
						class:on={tab === key}
						onclick={() => (tab = key)}
						onkeydown={onTabKey}
					>
						{t(`eggInfo.rules.tabs.${key}`)}
					</button>
				{/each}
			</div>
		</div>
		<div class="pane" role="tabpanel" bind:this={pane} onscroll={() => (scrolled = (pane?.scrollTop ?? 0) > 1)}>
			{#if tab === 'odds'}
				<table>
					<thead>
						<tr>
							<th>{t('eggInfo.odds.tier')}</th>
							<th class="r">{t('eggInfo.odds.range')}</th>
							<th class="r">{t('eggInfo.odds.chance')}</th>
							<th class="r">{t('eggInfo.odds.withPity')}</th>
							<th class="r">{t('eggInfo.odds.perCard')}</th>
						</tr>
					</thead>
					<tbody>
						{#each me.tiers as rule (rule.tier)}
							<tr>
								<td>
									<span class="tier">
										<span class="ce-tier-dot" data-tier={rule.tier} aria-hidden="true"></span>
										{t(`eggInfo.tier.${rule.tier}`)}
										<span class="code">{TIER_LOOK[rule.tier].code}</span>
									</span>
								</td>
								<td class="r nowrap">{tokens(rule.min_tokens)} – {tokens(rule.max_tokens)}</td>
								<td class="r">{pct(base[rule.tier] ?? 0)}</td>
								<td class="r">{pct(rates[rule.tier] ?? 0)}</td>
								<td class="r dim">{pct(perCard(rule.tier))}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="note">{t('eggInfo.odds.note', { ev: near(ev), evPity: near(evPity) })}</p>
				<OddsCards {me} />
			{:else if tab === 'pity'}
				<ul class="bullets">
					{#each pityItems as text, index (index)}
						<li><span class="dot" aria-hidden="true"></span><span class="text">{text}</span></li>
					{/each}
				</ul>
				<div class="pity-box">
					<PityLine left={me.pity_left} {pity} />
				</div>
			{:else}
				<ol class="numbered">
					{#each ruleItems as text, index (index)}
						<li><span class="no">{index + 1}</span><span class="text">{text}</span></li>
					{/each}
				</ol>
				<p class="abuse">{t('eggInfo.rule.abuse')}</p>
			{/if}
		</div>
	</div>
</Modal>

<style>
	/* The tabs on top and the tab's page under them, which alone scrolls inside the dialog's height. */
	.rules {
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 14px 0 20px;
	}
	/* A hairline across the dialog under the tabs, once the page under them has moved. */
	.tabbar {
		flex: none;
		padding: 0 22px 12px;
		border-bottom: 1px solid transparent;
		transition: border-color var(--t-fast) var(--ease-out);
	}
	.tabbar.scrolled {
		border-bottom-color: var(--hairline);
	}
	.tabs {
		display: inline-flex;
		gap: 2px;
		padding: 4px;
		border-radius: var(--r-full);
		background: var(--surface2);
	}
	.tabs button {
		padding: 6px 16px;
		border: none;
		border-radius: var(--r-full);
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-sm);
		font-weight: 500;
		line-height: 20px;
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out),
			box-shadow var(--t-fast) var(--ease-out);
	}
	.tabs button:hover {
		color: var(--text);
	}
	.tabs button.on {
		background: var(--panel);
		color: var(--text);
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.08),
			0 0 0 1px var(--hairline);
	}
	.tabs button:focus-visible {
		outline-offset: -2px;
	}
	.pane {
		display: grid;
		flex: 1 1 auto;
		align-content: start;
		grid-auto-rows: max-content;
		gap: 16px;
		min-height: 0;
		padding: 4px 22px 4px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	/* 概率 */
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--fs-sm);
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	th {
		padding: 8px 0;
		border-bottom: 1px solid var(--border);
		color: var(--dim);
		font-weight: 400;
		text-align: left;
		white-space: nowrap;
	}
	td {
		padding: 10px 0;
		border-bottom: 1px solid var(--border);
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
	th.r,
	td.r {
		padding-left: 8px;
		text-align: right;
	}
	.nowrap {
		white-space: nowrap;
	}
	.dim {
		color: var(--dim);
	}
	.tier {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}
	.code {
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.note {
		margin: 0;
		font-size: var(--fs-xs);
		line-height: 20px;
		color: var(--dim);
	}

	/* 保底 */
	.bullets,
	.numbered {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--fs-sm);
		line-height: 22px;
		color: var(--text);
	}
	.bullets {
		gap: 8px;
	}
	.bullets li,
	.numbered li {
		display: flex;
		gap: 12px;
	}
	.bullets .dot {
		flex: none;
		width: 4px;
		height: 4px;
		margin-top: 9px;
		border-radius: var(--r-full);
		background: var(--dim);
	}
	.text {
		min-width: 0;
	}
	.pity-box {
		padding: 8px 12px;
		border-radius: var(--r-md);
		background: var(--surface2);
	}

	/* 规则 */
	.numbered {
		gap: 12px;
	}
	.no {
		flex: none;
		width: 16px;
		text-align: right;
		color: var(--dim);
		font-variant-numeric: tabular-nums;
	}
	.abuse {
		margin: 0;
		padding-top: 12px;
		border-top: 1px solid var(--hairline);
		font-size: var(--fs-xs);
		line-height: 20px;
		color: var(--dim);
	}
</style>
