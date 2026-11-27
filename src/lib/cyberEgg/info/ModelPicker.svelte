<script lang="ts">
	// CE-K7 (the website's `pages/cyber-egg/models.tsx` ModelPicker): the key card's model block. A round's models share
	// the day's tokens; the picked one goes into the copied request example. Up to six: the title with the copy
	// button, then one chip per model, wrapping, the picked one marked. More: the picked model with copy and 「全部 N
	// 个」 (the search panel) on one line (two where the block is narrow), then six quick chips: the ones called most
	// today, then the round's own order.
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import { t } from '$lib/i18n';
	import Vendor from '$lib/Vendor.svelte';
	import type { EggUsageRow } from '../api';
	import ModelsPanel from './ModelsPanel.svelte';

	let {
		models,
		value,
		usage = [],
		onChange,
		onCopy
	}: { models: string[]; value: string; usage?: EggUsageRow[]; onChange: (model: string) => void; onCopy: (model: string) => void } = $props();

	/** Past this many models, the chips give way to the panel. */
	const MANY = 6;

	/** The quick chips past six: the ones called most today (by calls), then the round's own order, six in all. */
	const quick = $derived.by(() => {
		const calls = new Map<string, number>();
		for (const row of usage) if (models.includes(row.model)) calls.set(row.model, (calls.get(row.model) ?? 0) + 1);
		const used = [...calls.keys()].sort((a, b) => calls.get(b)! - calls.get(a)! || models.indexOf(a) - models.indexOf(b));
		return [...used, ...models.filter((model) => !calls.has(model))].slice(0, MANY);
	});

	/** The one-line head needs about this much: label, a model name of some 20 letters, copy, 「全部 N 个」. */
	let width = $state(0);
	const roomy = $derived(width === 0 || width >= 424);
	let allButton = $state<HTMLButtonElement>();
	let panel = $state(false);
</script>

{#snippet chips(list: string[])}
	<div class="chips" role="radiogroup" aria-label={t('eggInfo.models.pick')}>
		{#each list as model (model)}
			<button type="button" class="chip" class:on={model === value} role="radio" aria-checked={model === value} onclick={() => onChange(model)}>
				<Vendor {model} size={14} />
				<span class="chip-name">{model}</span>
				{#if model === value}<CheckIcon size={12} />{/if}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet allTrigger()}
	<button bind:this={allButton} type="button" class="all" aria-expanded={panel} onclick={() => (panel = !panel)}>
		{t('eggInfo.models.all', { count: models.length })}
		<CaretDownIcon size={14} />
	</button>
{/snippet}

<div class="picker" bind:clientWidth={width}>
	{#if models.length <= MANY}
		<div class="head">
			<span class="label">{t('eggInfo.models.label', { count: models.length })}</span>
			<button type="button" class="ghost" aria-label={t('eggInfo.key.copy', { what: value })} onclick={() => onCopy(value)}>
				<CopyIcon size={14} />
				{t('eggInfo.models.copyPicked')}
			</button>
		</div>
		{@render chips(models)}
	{:else if roomy}
		<div class="head one">
			<span class="label">{t('eggInfo.models.current')}</span>
			<span class="current"><Vendor model={value} size={16} /><code title={value}>{value}</code></span>
			<button type="button" class="ghost" aria-label={t('eggInfo.key.copy', { what: value })} onclick={() => onCopy(value)}>
				<CopyIcon size={14} />
				{t('eggInfo.models.copy')}
			</button>
			{@render allTrigger()}
		</div>
		{@render chips(quick)}
	{:else}
		<div class="head">
			<span class="label">{t('eggInfo.models.current')}</span>
			{@render allTrigger()}
		</div>
		<div class="current-box">
			<span class="current"><Vendor model={value} size={16} /><code title={value}>{value}</code></span>
			<button type="button" class="icon" aria-label={t('eggInfo.key.copy', { what: value })} onclick={() => onCopy(value)}><CopyIcon size={14} /></button>
		</div>
		{@render chips(quick)}
	{/if}
	<p class="note">{t('eggInfo.models.shared')}</p>
</div>

{#if panel && allButton}
	<ModelsPanel
		{models}
		{value}
		anchor={allButton}
		onPick={(model) => {
			onChange(model);
			panel = false;
		}}
		{onCopy}
		onClose={() => (panel = false)}
	/>
{/if}

<style>
	.picker {
		display: grid;
		gap: 8px;
		min-width: 0;
		padding: 10px 12px;
		border-radius: var(--r-md);
		background: var(--surface2);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-width: 0;
	}
	.head.one {
		justify-content: flex-start;
		gap: 8px;
	}
	.label {
		flex: none;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.current {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 6px;
		min-width: 0;
		color: var(--text);
	}
	.current code {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: 500;
	}
	.current-box {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		padding: 2px 2px 2px 10px;
		border-radius: var(--r-sm);
		background: var(--panel);
	}
	.ghost,
	.icon,
	.all {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 8px;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-xs);
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out);
	}
	.icon {
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
	}
	.ghost:hover,
	.icon:hover {
		background: color-mix(in oklab, var(--text) 8%, transparent);
		color: var(--text);
	}
	/* 「全部 N 个」: a small pill that opens the panel. */
	.all {
		gap: 4px;
		padding: 0 10px;
		border: 1px solid var(--border);
		border-radius: var(--r-full);
		background: var(--panel);
		color: var(--text);
	}
	.all:hover {
		border-color: var(--border-strong);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		min-width: 0;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 3px 10px 3px 8px;
		border: 1px solid var(--border);
		border-radius: var(--r-full);
		background: color-mix(in oklab, var(--panel) 40%, transparent);
		color: var(--dim);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		line-height: 18px;
		cursor: pointer;
		transition:
			border-color var(--t-fast) var(--ease-out),
			color var(--t-fast) var(--ease-out),
			background var(--t-fast) var(--ease-out);
	}
	.chip:hover {
		color: var(--text);
	}
	.chip.on {
		border-color: color-mix(in oklab, var(--text) 35%, transparent);
		background: var(--panel);
		color: var(--text);
	}
	.chip-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.note {
		margin: 0;
		font-size: var(--fs-xs);
		line-height: 20px;
		color: var(--dim);
	}
</style>
