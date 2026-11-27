<script lang="ts">
	// CE-K5..K7 (the website's `pages/cyber-egg/usage.tsx` key card): the campaign key for other tools, the endpoint, the
	// round's models (the picked one goes into the copied request example), and a new key. The web shows the full key
	// once, when it is made; this computer may read the working key in full (CE-K7, `egg.keySecret()`), so here it is
	// masked until asked for, and a new key shows in full.
	import ArrowClockwiseIcon from 'phosphor-svelte/lib/ArrowClockwiseIcon';
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import EyeIcon from 'phosphor-svelte/lib/EyeIcon';
	import EyeSlashIcon from 'phosphor-svelte/lib/EyeSlashIcon';
	import { getLocale, t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { copyText } from '$lib/clipboard';
	import { eggErrorText, type EggKey, type EggMe } from '../api';
	import { egg } from '../store.svelte';
	import KeyLine from './KeyLine.svelte';
	import ModelPicker from './ModelPicker.svelte';

	let {
		me,
		keyInfo,
		revealed = $bindable(false),
		onRotate
	}: { me: EggMe; keyInfo: EggKey; revealed?: boolean; onRotate: () => void } = $props();

	const models = $derived(me.campaign?.models ?? []);
	let picked = $state('');
	const model = $derived(models.includes(picked) ? picked : (models[0] ?? ''));
	/** No full key while it is stopped for a leak. */
	const usable = $derived(keyInfo.suspended == null);
	const full = $derived(revealed && usable ? egg.secret : null);
	const shown = $derived(full ?? `${keyInfo.prefix}…${keyInfo.last4}`);
	let reading = $state(false);

	async function copy(text: string) {
		if (await copyText(text)) toast.success(t('eggInfo.copied'));
	}

	/** The key in full, kept or asked of the gateway; a warning when it can't be had. */
	async function secret(): Promise<string | null> {
		reading = true;
		try {
			const value = await egg.keySecret();
			if (!value) toast.warn(t('eggInfo.key.noSecret'));
			return value;
		} catch (error) {
			toast.error(eggErrorText(error));
			return null;
		} finally {
			reading = false;
		}
	}

	async function toggle() {
		if (revealed) {
			revealed = false;
			return;
		}
		if (await secret()) revealed = true;
	}

	async function copyKey() {
		const value = await secret();
		if (value) await copy(value);
	}

	function curl() {
		return `curl ${me.api_base_url}/chat/completions \\\n  -H "Authorization: Bearer ${full ?? '$CYBER_EGG_KEY'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "${model}", "messages": [{"role": "user", "content": "你好"}]}'`;
	}
</script>

<section class="card key">
	<div class="top">
		<h2>{t('eggInfo.usage.keyTitle')}</h2>
		<button type="button" class="rotate" onclick={onRotate}>
			<ArrowClockwiseIcon size={14} />
			{t('eggInfo.key.rotate')}
		</button>
	</div>
	<div class="lines" style:--key-label={getLocale() === 'en' ? '88px' : '64px'}>
		<KeyLine label={t('eggInfo.key.label')} value={shown} strong={!!full}>
			{#snippet actions()}
				{#if usable}
					<button type="button" aria-label={t(revealed ? 'eggInfo.key.hide' : 'eggInfo.key.show')} title={t(revealed ? 'eggInfo.key.hide' : 'eggInfo.key.show')} disabled={reading} onclick={toggle}>
						{#if revealed}<EyeSlashIcon size={15} />{:else}<EyeIcon size={15} />{/if}
					</button>
					<button type="button" aria-label={t('eggInfo.key.copy', { what: t('eggInfo.key.label') })} disabled={reading} onclick={copyKey}><CopyIcon size={15} /></button>
				{/if}
			{/snippet}
		</KeyLine>
		<KeyLine label={t('eggInfo.key.baseUrl')} value={me.api_base_url}>
			{#snippet actions()}
				<button type="button" aria-label={t('eggInfo.key.copy', { what: t('eggInfo.key.baseUrl') })} onclick={() => copy(me.api_base_url)}><CopyIcon size={15} /></button>
			{/snippet}
		</KeyLine>
		{#if models.length > 1}
			<ModelPicker {models} value={model} usage={me.usage} onChange={(next) => (picked = next)} onCopy={copy} />
		{:else}
			<KeyLine label={t('eggInfo.key.model')} value={model}>
				{#snippet actions()}
					<button type="button" aria-label={t('eggInfo.key.copy', { what: model })} onclick={() => copy(model)}><CopyIcon size={15} /></button>
				{/snippet}
			</KeyLine>
		{/if}
	</div>
	<p class="note">{t('eggInfo.key.endpointOnly')}</p>
	<div class="actions">
		<Button size="sm" onclick={() => copy(curl())}>
			<CopyIcon size={14} />
			{t('eggInfo.usage.copyCurl')}
		</Button>
		<span class="only">{t('eggInfo.key.keyOnly')}</span>
	</div>
</section>

<style>
	.card {
		min-width: 0;
		border: 1px solid var(--border);
		border-radius: var(--r-xl);
		background: var(--panel);
	}
	.key {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 28px;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}
	h2 {
		margin: 0;
		font-size: var(--fs-md);
		font-weight: 600;
		color: var(--text);
	}
	.rotate {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 0;
		border: none;
		border-radius: var(--r-xs);
		background: none;
		color: var(--text);
		font: inherit;
		font-size: var(--fs-sm);
		font-weight: 500;
		cursor: pointer;
	}
	.rotate:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.lines {
		display: grid;
		gap: 8px;
	}
	.note {
		margin: 0;
		font-size: var(--fs-xs);
		line-height: 20px;
		color: var(--dim);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		margin-top: auto;
	}
	.only {
		flex-basis: 100%;
		font-size: var(--fs-xs);
		line-height: 20px;
		color: var(--dim);
	}
</style>
