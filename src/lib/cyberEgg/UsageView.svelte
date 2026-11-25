<script lang="ts">
	// 赛博鸡蛋 · 调用: today's tokens (what is left, from which card, until when), how Aogiri uses them (the
	// 「赛博鸡蛋」 group in the model menu), the campaign key for other tools, and today's calls.
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import ArrowClockwiseIcon from 'phosphor-svelte/lib/ArrowClockwiseIcon';
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import Switch from '$lib/ui/Switch.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { confirm } from '$lib/ui/confirm.svelte';
	import { copyText } from '$lib/clipboard';
	import { cardById } from './art';
	import { egg } from './store.svelte';
	import { eggApi, eggErrorText, type EggMe } from './api';
	import { clock, left, shortTokens, wan } from './format';

	let { me, onChat }: { me: EggMe; onChat: () => void } = $props();

	let busy = $state(false);
	let picker = $state(egg.inPicker);
	const lapse = $derived(left(egg.resetsAt, egg.now));
	const source = $derived(me.today ? cardById(me.today.card.card_id) : undefined);
	const key = $derived(me.key);

	/** Today's calls (CE-API-1 `usage`, newest first). */
	const calls = $derived(me.today ? me.usage.filter((row) => row.at >= me.today!.expires_at - 86_400_000) : []);

	async function copyKey() {
		try {
			const secret = await egg.keySecret();
			if (secret && (await copyText(secret))) toast.success(t('egg.key.copied'));
			else toast.warn(t('egg.key.noSecret'));
		} catch (error) {
			toast.error(eggErrorText(error));
		}
	}

	async function rotate() {
		const ok = await confirm({ title: t('egg.key.rotateTitle'), message: t('egg.key.rotateBody'), confirmLabel: t('egg.key.rotate') });
		if (!ok) return;
		const campaign = me.campaign;
		if (!campaign) return;
		busy = true;
		try {
			const key = await eggApi.rotateKey(campaign.id);
			if (key.secret) egg.secret = key.secret;
			if (egg.me) egg.me = { ...egg.me, key: { ...key, secret: undefined } };
			toast.success(t('egg.key.rotated'));
		} catch (error) {
			toast.error(eggErrorText(error));
		} finally {
			busy = false;
		}
	}
</script>

<div class="usage">
	<h1>{t('egg.nav.usage')}</h1>

	<section class="panel total">
		<div class="row-top">
			<span>{t('egg.usage.left')}</span>
			{#if source && me.today}<span>{t('egg.usage.from', { tier: t(`egg.tier.${me.today.card.tier}`), name: source.name })}</span>{/if}
		</div>
		<p class="figure"><span class="n">{wan(egg.remaining)}</span><span class="u">{t('egg.wan')} tokens</span></p>
		<div class="meter" aria-hidden="true"><i style:width="{egg.share * 100}%"></i></div>
		<div class="row-foot">
			<span class="mono">{t('egg.usage.used', { used: wan(egg.used), total: wan(egg.granted) })}</span>
			<span>{lapse ? t('egg.usage.resetLeft', { h: lapse.h, m: lapse.m }) : t('egg.today.resets')}</span>
		</div>
		{#if !me.today}
			<div class="nodraw">
				<span>{t('egg.usage.noDraw')}</span>
			</div>
		{/if}
	</section>

	<h3>{t('egg.usage.inApp')}</h3>
	<section class="panel">
		<div class="row">
			<div class="txt">
				<p class="title">{t('egg.usage.pickerTitle')}</p>
				<p class="desc">{t('egg.usage.pickerDesc')}</p>
			</div>
			<Switch bind:checked={picker} label={t('egg.usage.pickerTitle')} onChange={(on) => egg.setInPicker(on)} />
		</div>
		<div class="row">
			<div class="txt">
				<p class="title">{t('egg.usage.models')}</p>
				<p class="desc">{t('egg.usage.modelsDesc')}</p>
			</div>
			<span class="value mono">{egg.models.join(' · ')}</span>
		</div>
		{#if egg.usable}
			<div class="row">
				<div class="txt"><p class="title">{t('egg.usage.startTitle')}</p></div>
				<Button size="sm" onclick={onChat}>{t('egg.result.chat')}</Button>
			</div>
		{/if}
	</section>

	<h3>{t('egg.key.title')}</h3>
	<section class="panel">
		<div class="row">
			<div class="txt">
				<p class="title mono">{key ? `${key.prefix}…${key.last4}` : '—'}</p>
				<p class="desc">{key?.suspended === 'leak' ? t('egg.key.suspended') : t('egg.key.desc')}</p>
			</div>
			<div class="btns">
				<Button size="sm" onclick={copyKey} disabled={!key}><CopyIcon size={14} />{t('egg.key.copy')}</Button>
				<Button size="sm" variant="ghost" onclick={rotate} disabled={busy || (key?.rotations_left ?? 1) <= 0}><ArrowClockwiseIcon size={14} />{t('egg.key.rotate')}</Button>
			</div>
		</div>
		<div class="row">
			<div class="txt"><p class="title">{t('egg.key.base')}</p></div>
			<span class="value mono">{me.api_base_url}</span>
		</div>
	</section>

	<h3>{t('egg.usage.calls')}</h3>
	<section class="panel">
		{#if calls.length}
			{#each calls as row (row.id)}
				<div class="row call">
					<div class="txt">
						<p class="title">{row.model}</p>
						<p class="desc">{clock(row.at)} · {t('egg.usage.split', { input: shortTokens(row.input_tokens), cached: shortTokens(row.cached_input_tokens), output: shortTokens(row.output_tokens) })}</p>
					</div>
					<span class="value mono">{shortTokens(row.counted_tokens)}</span>
				</div>
			{/each}
		{:else}
			<p class="none">{t('egg.usage.noCalls')}</p>
		{/if}
	</section>
</div>

<style>
	.usage {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 24px 48px 48px;
	}
	.usage > :global(*) {
		max-width: 760px;
	}
	h1 {
		margin: 0 0 18px;
		font-size: var(--fs-xl);
		font-weight: 600;
		color: var(--text);
	}
	h3 {
		margin: 28px 0 10px;
		font-size: var(--fs-sm);
		font-weight: 600;
		color: var(--text);
	}
	.panel {
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--panel);
	}
	.total {
		padding: 18px 20px;
	}
	.row-top,
	.row-foot {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.figure {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin: 10px 0 16px;
		color: var(--text);
	}
	.figure .n {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-size: calc(var(--fs-2xl) * 1.25);
		font-weight: 600;
		line-height: 1;
	}
	.figure .u {
		font-size: var(--fs-md);
		font-weight: 500;
	}
	.meter {
		height: 4px;
		margin-bottom: 10px;
		border-radius: var(--r-full);
		background: var(--surface2);
		overflow: hidden;
	}
	.meter i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--text);
	}
	.nodraw {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--hairline);
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 48px;
		padding: 12px 20px;
	}
	.row + .row {
		border-top: 1px solid var(--hairline);
	}
	.txt {
		min-width: 0;
	}
	.txt p {
		margin: 0;
	}
	.title {
		font-size: var(--fs-sm);
		color: var(--text);
	}
	.desc {
		margin-top: 3px !important;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.value {
		flex: none;
		max-width: 60%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.mono {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}
	.btns {
		display: flex;
		flex: none;
		gap: 6px;
	}
	.none {
		margin: 0;
		padding: 16px 20px;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
</style>
