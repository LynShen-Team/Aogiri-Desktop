<script lang="ts">
	// 赛博鸡蛋 · 规则与概率: each tier's tokens and chance as the round sets them, the guarantee, and the
	// rules in a few lines.
	import { t } from '$lib/i18n';
	import Modal from '$lib/ui/Modal.svelte';
	import { TIER_LOOK } from './art';
	import type { EggMe } from './api';
	import { wan } from './format';

	let { me, onClose }: { me: EggMe; onClose: () => void } = $props();
	const total = $derived(me.tiers.reduce((sum, r) => sum + r.weight_bp, 0) || 1);
	const pct = (bp: number) => {
		const value = (bp / total) * 100;
		return `${value < 1 ? value.toFixed(2) : value.toFixed(value < 10 ? 2 : 1)}%`;
	};
</script>

<Modal title={t('egg.rules.title')} width={520} {onClose}>
	<table>
		<thead>
			<tr><th>{t('egg.rules.tier')}</th><th>{t('egg.rules.tokens')}</th><th class="r">{t('egg.rules.chance')}</th></tr>
		</thead>
		<tbody>
			{#each me.tiers as rule (rule.tier)}
				<tr>
					<td>{t(`egg.tier.${rule.tier}`)} <span class="code">{TIER_LOOK[rule.tier].code}</span></td>
					<td class="mono">{wan(rule.min_tokens)} – {wan(rule.max_tokens)} {t('egg.wan')}</td>
					<td class="mono r">{pct(rule.weight_bp)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<ul>
		<li>{t('egg.rules.daily')}</li>
		<li>{t('egg.rules.lapse')}</li>
		{#if me.pity_left.sr}<li>{t('egg.rules.pity', { n: me.pity_left.sr })}</li>{/if}
		<li>{t('egg.rules.models')}</li>
		<li>{t('egg.rules.trade')}</li>
	</ul>
</Modal>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--fs-sm);
	}
	th {
		padding: 0 0 8px;
		font-size: var(--fs-xs);
		font-weight: 400;
		color: var(--dim);
		text-align: left;
	}
	td {
		padding: 9px 0;
		border-top: 1px solid var(--hairline);
		color: var(--text);
	}
	.r {
		text-align: right;
	}
	.code {
		margin-left: 4px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}
	ul {
		margin: 18px 0 0;
		padding-left: 18px;
		font-size: var(--fs-xs);
		line-height: 1.7;
		color: var(--dim);
	}
</style>
