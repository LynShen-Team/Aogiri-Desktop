<script lang="ts">
	// cyber-egg.spec.md CE-D6 保底 (the website's `pages/cyber-egg/pity.tsx`): how far the player is from each
	// guarantee, in one quiet line: the soonest of 白银/鎏金, then 流光. The server's guarantee has no count of its own to
	// show: the line says how it works instead.
	import { t } from '$lib/i18n';
	import type { EggMe, EggPity } from '../api';

	let { left, pity }: { left: EggMe['pity_left']; pity?: EggPity } = $props();

	const parts = $derived.by(() => {
		const out: string[] = [];
		if (left.ur === 1) {
			out.push(t('eggInfo.pity.urNext'));
		} else {
			// 鎏金 wins a tie: it is the bigger promise.
			const soon: ['sr' | 'ssr', number] | null =
				left.ssr != null && (left.sr == null || left.ssr <= left.sr) ? ['ssr', left.ssr] : left.sr != null ? ['sr', left.sr] : null;
			if (soon) {
				const tier = t(`eggInfo.tier.${soon[0]}`);
				out.push(soon[1] <= 1 ? t('eggInfo.pity.next', { tier }) : t('eggInfo.pity.within', { count: soon[1], tier }));
			}
			if (left.ur != null) out.push(t('eggInfo.pity.ur', { count: left.ur }));
		}
		if (pity?.shared_sr_every) out.push(t('eggInfo.pity.sharedEvery', { count: pity.shared_sr_every }));
		return out;
	});
</script>

{#if parts.length}
	<!-- Each part wraps whole, never mid-phrase. -->
	<p class="pity-line">
		{#each parts as part, index (index)}
			<span>{#if index > 0}<span aria-hidden="true">&nbsp;·&nbsp;</span>{/if}{part}</span>
		{/each}
	</p>
{/if}

<style>
	.pity-line {
		margin: 0;
		font-size: var(--fs-xs);
		line-height: 20px;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.pity-line > span {
		display: inline-block;
	}
</style>
