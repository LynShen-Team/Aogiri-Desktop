<script lang="ts">
	// CE-X5: money on a swap, from my side: 「你补 ¥30」 (plain) or 「对方补 ¥30」 (gilt).
	import { t } from '$lib/i18n';
	import type { EggTopup } from '../api';
	import { yuan } from '../eligibility';

	let { topup, iPay }: { topup: EggTopup | null | undefined; iPay: boolean } = $props();
</script>

{#if topup && topup.fen > 0}
	<span class="ce-topup" data-pay={iPay ? '' : undefined}>
		{iPay ? t('eggMarket.topup.youPay', { amount: yuan(topup.fen) }) : t('eggMarket.topup.theyPay', { amount: yuan(topup.fen) })}
	</span>
{/if}

