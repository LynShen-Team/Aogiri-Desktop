<script lang="ts">
	// CE-X5 (owner 2026-11-24 「卡牌+余额」): money on top of a swap, when the round turns it on: none, I pay, or they
	// pay; how much (yuan, up to the round's limit); and what that means for each side.
	import { t } from '$lib/i18n';
	import Segmented from '$lib/ui/Segmented.svelte';
	import type { EggMarketRules } from '../api';
	import { yuan } from '../eligibility';
	import { topupCheck, topupNet, type TopupDraft } from './shared';

	let { rules, balance, value = $bindable() }: { rules: EggMarketRules; balance: number; value: TopupDraft } = $props();

	const checked = $derived(topupCheck(value, rules, balance));
	const fee = $derived(`${rules.topup_fee_permille / 10}%`);
	const sides = $derived(
		(['none', 'me', 'them'] as const).map((side) => ({ value: side, label: t(`eggMarket.topup.side.${side}`) }))
	);
	const message = $derived(
		checked.problem === 'max'
			? t('eggMarket.topup.overMax', { amount: yuan(rules.topup_max_fen) })
			: checked.problem === 'balance'
				? t('eggMarket.topup.overBalance', { amount: yuan(balance) })
				: value.side === 'me'
					? t('eggMarket.topup.meBody', { amount: yuan(checked.fen), net: yuan(topupNet(checked.fen, rules)), fee })
					: t('eggMarket.topup.themBody', { amount: yuan(checked.fen), net: yuan(topupNet(checked.fen, rules)), fee })
	);
</script>

{#if rules.topup_enabled}
	<section class="topup">
		<div class="head">
			<p class="title">{t('eggMarket.topup.title')}</p>
			<span class="balance">{t('eggMarket.topup.balance', { amount: yuan(balance) })}</span>
		</div>
		<div class="row">
			<Segmented value={value.side} options={sides} onChange={(side) => (value = { ...value, side: side as TopupDraft['side'] })} />
			{#if value.side !== 'none'}
				<span class="amount">
					<span class="yen">¥</span>
					<input
						class="field"
						aria-label={t('eggMarket.topup.amount')}
						inputmode="decimal"
						value={value.amount}
						oninput={(event) => {
							const clean = event.currentTarget.value.replace(/[^0-9.]/g, '');
							event.currentTarget.value = clean;
							value = { ...value, amount: clean };
						}}
					/>
					<span class="max">{t('eggMarket.topup.max', { amount: yuan(rules.topup_max_fen) })}</span>
				</span>
			{/if}
		</div>
		{#if value.side !== 'none'}
			<p class="note" class:bad={checked.problem !== null && checked.problem !== 'amount'}>{message}</p>
		{/if}
	</section>
{/if}

<style>
	.topup {
		display: grid;
		gap: 12px;
		padding: 16px;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}
	.title {
		margin: 0;
		font-size: var(--fs-sm);
		font-weight: 500;
		color: var(--text);
	}
	.balance {
		font-size: var(--fs-xs);
		font-variant-numeric: tabular-nums;
		color: var(--dim);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}
	.amount {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.yen {
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.field {
		width: 96px;
		min-height: 32px;
		padding: 6px 10px;
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		background: var(--surface2);
		color: var(--text);
		font-family: var(--font-sans);
		font-size: var(--fs-sm);
		line-height: 18px;
		font-variant-numeric: tabular-nums;
		outline: none;
		transition: border-color var(--t-fast) var(--ease-out);
	}
	.field:focus {
		border-color: var(--border-strong);
	}
	.max {
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.note {
		margin: 0;
		font-size: var(--fs-sm);
		line-height: 20px;
		color: var(--dim);
	}
	.note.bad {
		color: var(--err);
	}
</style>
