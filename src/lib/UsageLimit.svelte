<script lang="ts">
	// A plan's usage limit above the composer (Claude Code and Codex
	// subscriptions; the gateway's plan stops keep their own card,
	// planStop.ts): which limit, how much of it is used, when it resets.
	// Once hit, the stopped turn can go on by itself at the reset
	// (limitResume.svelte.ts). One line flat on the canvas, as wide as the
	// composer under it: no fill, a short meter after the title, the error
	// colour only for a limit that was hit (design.md, the usage limit).
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import IconButton from '$lib/ui/IconButton.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { getLocale, t } from '$lib/i18n';
	import { BACKEND_LABELS } from '$lib/backends';
	import { visibleInterval } from '$lib/visibleInterval';
	import type { UsageLimit } from '$lib/chat.svelte';

	let {
		limit,
		backend,
		resumeArmed,
		onResume,
		onCancelResume,
		onDismiss
	}: {
		limit: UsageLimit;
		backend: string;
		resumeArmed: boolean;
		/** Absent (the phone page): the notice offers no wait for the reset. */
		onResume?: () => void;
		onCancelResume?: () => void;
		onDismiss: () => void;
	} = $props();

	// Minutes are enough for a reset hours away.
	let now = $state(Date.now());
	$effect(() => visibleInterval(() => (now = Date.now()), 15_000));

	const WINDOWS = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet', 'overage'];
	const who = $derived(BACKEND_LABELS[backend as keyof typeof BACKEND_LABELS] ?? '');
	const which = $derived(t(`shell.limit.window.${WINDOWS.includes(limit.window) ? limit.window : 'any'}`));
	const title = $derived(
		limit.level === 'limited'
			? t('shell.limit.hit', { who, which })
			: limit.used !== null
				? t('shell.limit.used', { who, which, n: Math.round(limit.used) })
				: t('shell.limit.near', { who, which })
	);

	// The reset: the time of day (with the date when not today), and how far off.
	const reset = $derived.by(() => {
		const at = limit.resetsAt;
		if (!at || at <= now) return '';
		const date = new Date(at);
		const locale = getLocale() === 'zh' ? 'zh-CN' : 'en-US';
		const clock = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
		const today = new Date(now).toDateString() === date.toDateString();
		const when = today ? clock : `${date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} ${clock}`;
		const mins = Math.ceil((at - now) / 60_000);
		const h = Math.floor(mins / 60);
		const left = h >= 24 ? t('shell.limit.days', { d: Math.floor(h / 24), h: h % 24 }) : h > 0 ? t('shell.limit.hours', { h, m: mins % 60 }) : t('shell.limit.minutes', { m: mins });
		return t('shell.limit.resets', { when, left });
	});
	// Past its reset, a limit nobody waits on is over.
	$effect(() => {
		if (limit.resetsAt && now > limit.resetsAt && !resumeArmed) onDismiss();
	});
	const fill = $derived(limit.level === 'limited' ? 100 : Math.min(100, Math.max(0, limit.used ?? 0)));
	const canResume = $derived(!!onResume && limit.level === 'limited' && !!limit.resetsAt && limit.resetsAt > now);
	const showMeter = $derived(limit.used !== null || limit.level === 'limited');
</script>

<div class="limit" class:hit={limit.level === 'limited'} role="status">
	<div class="text">
		<span class="head">
			<span class="title">{title}</span>
			{#if showMeter}
				<span class="meter" role="meter" aria-label={which} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill)}><span style:width="{fill}%"></span></span>
			{/if}
		</span>
		{#if reset}<span class="dim">{reset}</span>{:else if limit.message}<span class="dim">{limit.message}</span>{/if}
		{#if limit.overage}<span class="dim">{t('shell.limit.overage')}</span>{/if}
		{#if resumeArmed}<span class="dim">{t('shell.limit.resumeArmed')}</span>{/if}
	</div>
	{#if canResume}
		{#if resumeArmed}
			<Button size="sm" variant="ghost" onclick={onCancelResume}>{t('shell.limit.cancelResume')}</Button>
		{:else}
			<Button size="sm" variant="secondary" onclick={onResume}>{t('shell.limit.resume')}</Button>
		{/if}
	{/if}
	<IconButton size="sm" label={t('shell.rlDismiss')} title={t('shell.rlDismiss')} onclick={onDismiss}><XIcon size={14} /></IconButton>
</div>

<style>
	/* One line flat on the canvas above the composer (design.md, the usage
	   limit): no fill or box of its own, so nothing stacks on the composer's
	   box under it. Its page lines it up with the composer: the strip's edges
	   with the box's, its text where the box's text starts (--limit-inset).
	   A short meter follows the title on its line; in a narrow column the
	   reset wraps under the title. */
	.limit {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 10px;
		margin: 0 0 8px;
		padding: 0 4px 0 var(--limit-inset, 16px);
		font-size: var(--fs-xs);
		line-height: 16px;
	}
	.text {
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 8px;
		min-width: 0;
	}
	.head {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}
	.title {
		color: var(--text);
		font-weight: 500;
	}
	.hit .title {
		color: var(--err);
	}
	.dim {
		color: var(--dim);
		font-variant-numeric: tabular-nums;
	}
	.meter {
		flex: 0 0 64px;
		width: 64px;
		height: 4px;
		overflow: hidden;
		border-radius: var(--r-full);
		background: var(--surface2);
	}
	.meter > span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--warn);
	}
	.hit .meter > span {
		background: var(--err);
	}
</style>
