<script lang="ts">
	// CE-K3 (the website's `pages/cyber-egg/key-panel.tsx` RotateDialog): a new campaign key; the old one stops at
	// once. Limited per day.
	import { t } from '$lib/i18n';
	import Modal from '$lib/ui/Modal.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { eggApi, eggErrorText, type EggKey } from '../api';

	let {
		campaignId,
		keyInfo,
		onRotated,
		onClose
	}: { campaignId: string; keyInfo: EggKey; onRotated: (key: EggKey) => void; onClose: () => void } = $props();

	let busy = $state(false);

	async function rotate() {
		busy = true;
		try {
			onRotated(await eggApi.rotateKey(campaignId));
			onClose();
			toast.success(t('eggInfo.key.rotated'));
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			busy = false;
		}
	}
</script>

<Modal title={t('eggInfo.key.rotateTitle')} width={448} dismissible={!busy} {onClose}>
	<p class="body">{t('eggInfo.key.rotateBody')}</p>
	<p class="left">{t('eggInfo.key.rotateLeft', { left: keyInfo.rotations_left, limit: keyInfo.rotation_limit })}</p>
	{#snippet footer()}
		<Button onclick={onClose} disabled={busy}>{t('eggInfo.cancel')}</Button>
		<Button variant="primary" onclick={rotate} disabled={busy || keyInfo.rotations_left <= 0}>{t('eggInfo.key.rotateConfirm')}</Button>
	{/snippet}
</Modal>

<style>
	p {
		margin: 0;
	}
	.body {
		font-size: var(--fs-sm);
		line-height: 20px;
		color: var(--dim);
	}
	.left {
		font-size: var(--fs-xs);
		color: var(--dim);
	}
</style>
