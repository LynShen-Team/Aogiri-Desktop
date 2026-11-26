<script lang="ts">
	// The work status line under the transcript: the working indicator (the
	// dot glyph moving as the step does, 工作中 under a light, the whole
	// turn's time so far; ui/WorkingIndicator.svelte), then what the turn is
	// doing in words ("正在运行 pnpm vitest run") and "›" to the running tool
	// call's details (workStatus.ts). The words change at once when the step
	// does; the glyph morphs, and holds a step of a moment back.
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import { untrack } from 'svelte';
	import { t } from '$lib/i18n';
	import type { CallTiming, Msg } from '$lib/chat.svelte';
	import WorkingIndicator from '$lib/ui/WorkingIndicator.svelte';
	import { workMode, workStep, type WorkPhase } from '$lib/workStatus';

	let {
		phase,
		tokens = 0,
		call = null,
		messages = [],
		turnSince = 0,
		waiting = false,
		onDetails
	}: {
		/** ChatState.phase. */
		phase: WorkPhase | (string & {}) | null;
		/** What a running compaction has written. */
		tokens?: number;
		/** The model request in flight. */
		call?: CallTiming | null;
		messages?: readonly Msg[];
		/** When the running turn began (0: not known): the clock counts from it. */
		turnSince?: number;
		/** The turn waits for the reader (an approval, a question). */
		waiting?: boolean;
		/** Show a tool call's details (its card in the transcript). */
		onDetails?: (call: Extract<Msg, { kind: 'tool' }>) => void;
	} = $props();

	const step = $derived(workStep(phase, call, messages));
	const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);
	const object = $derived(step?.verb === 'compacting' && tokens > 0 ? t('chat.tokens', { n: fmt(tokens) }) : (step?.object ?? ''));

	// A turn whose start is not known (a session shown afresh, an engine that
	// does not say) counts from its first step this line saw.
	let seen = $state(0);
	$effect.pre(() => {
		const s = step;
		untrack(() => {
			if (!s) seen = 0;
			else if (!seen) seen = s.since ?? Date.now();
		});
	});
	const since = $derived(turnSince > 0 ? turnSince : seen);
	const mode = $derived(workMode(step?.verb, waiting));
</script>

{#if step}
	<div class="ind">
		<WorkingIndicator startedAt={since} {mode} elapsedTitle={t('chat.turnClock')} />
		<span class="step">
			<span class="sep" aria-hidden="true">·</span>
			<span class="verb">{t(`chat.work.${step.verb}`)}</span>
			{#if object}<span class="obj" title={object}>{object}</span>{/if}
		</span>
		{#if step.call && onDetails}
			{@const running = step.call}
			<button class="more" onclick={() => onDetails(running)} aria-label={t('chat.work.details')} title={t('chat.work.details')}>
				<CaretRightIcon size={12} />
			</button>
		{/if}
	</div>
{/if}

<style>
	.ind {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		height: 24px;
		padding: 0 2px;
		color: var(--dim);
		font-size: var(--fs-xs);
		line-height: 16px;
	}
	/* The step, quieter than the indicator before it. */
	.step {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
		color: var(--dim2);
	}
	.sep,
	.verb {
		flex-shrink: 0;
		white-space: nowrap;
	}
	.obj {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: var(--fs-2xs);
	}
	.more {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		margin-left: -4px;
		padding: 0;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim2);
		cursor: pointer;
		transition:
			background var(--t-fast) var(--ease-base),
			color var(--t-fast) var(--ease-base);
	}
	.more:hover {
		background: var(--surface2);
		color: var(--text);
	}
</style>
