<script lang="ts">
	// 赛博鸡蛋 · 调用 (CE-UI-5), as the website's page (gateway `pages/cyber-egg/usage.tsx`): why calls are stopped, if
	// they are; today's tokens beside the campaign key; then, where the web points to its 日志 and 用量 pages, what the
	// desktop does with the tokens itself: a conversation on them, and the 「赛博鸡蛋」 group in the model menu; then
	// today's calls. The page header is CyberEggPage's; this fills the box it gives and scrolls inside it.
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import ChatCircleIcon from 'phosphor-svelte/lib/ChatCircleIcon';
	import SquaresFourIcon from 'phosphor-svelte/lib/SquaresFourIcon';
	import { t } from '$lib/i18n';
	import Button from '$lib/ui/Button.svelte';
	import Switch from '$lib/ui/Switch.svelte';
	import type { EggKey, EggMe } from './api';
	import { egg } from './store.svelte';
	import { yuan } from './eligibility';
	import TodayCard from './info/TodayCard.svelte';
	import KeyCard from './info/KeyCard.svelte';
	import RotateDialog from './info/RotateDialog.svelte';
	import { todayDraws, todayTokens } from './info/today';
	import { clockText, tokens } from './info/text';

	let {
		me,
		onChat,
		onDraw,
		onTopUp
	}: {
		me: EggMe;
		/** Start a conversation on today's tokens. */
		onChat: () => void;
		/** To the draw page (today not drawn yet). */
		onDraw?: () => void;
		/** The app's store (calls stopped: the balance is below the round's minimum). */
		onTopUp?: () => void;
	} = $props();

	const DAY = 86_400_000;
	const key = $derived(me.key);
	const funds = $derived(me.checks.find((check) => check.key === 'funds'));
	const short = $derived(Math.max(0, (funds?.min_balance_fen ?? 0) - (funds?.balance_fen ?? 0)));
	const left = $derived(todayTokens(me).left);
	const first = $derived(todayDraws(me)[0]);
	/** Today's calls (CE-API-1 `usage`, newest first): those since today's tokens began. */
	const calls = $derived(first ? me.usage.filter((row) => row.at >= first.expires_at - DAY) : []);
	const chatBody = $derived(
		egg.usable ? t('eggInfo.app.chatBody') : !first ? t('eggInfo.app.chatNotDrawn') : left <= 0 ? t('eggInfo.app.chatUsedUp') : t('eggInfo.app.chatBody')
	);

	let picker = $state(egg.inPicker);
	let rotating = $state(false);
	/** The key shows in full (asked for, or just made). */
	let revealed = $state(false);

	function rotated(next: EggKey) {
		if (next.secret) egg.secret = next.secret;
		if (egg.me) egg.me = { ...egg.me, key: { ...next, secret: undefined } };
		revealed = !!next.secret;
	}
</script>

<div class="usage">
	<!-- CE-E4, CE-K4: why calls are stopped right now, and the one fix. -->
	{#if me.blocked}
		<div class="stopped" role="status">
			<p>{t('eggInfo.usage.blocked', { balance: yuan(funds?.balance_fen ?? 0), min: yuan(funds?.min_balance_fen ?? 0) })}</p>
			{#if onTopUp}<Button size="sm" variant="primary" onclick={onTopUp}>{t('eggInfo.usage.topUp', { amount: yuan(short) })}</Button>{/if}
		</div>
	{:else if key?.suspended === 'leak'}
		<div class="stopped" role="status">
			<p>{t('eggInfo.usage.leakedBody')}</p>
			<Button size="sm" variant="primary" disabled={(key.rotations_left ?? 0) <= 0} onclick={() => (rotating = true)}>{t('eggInfo.key.rotate')}</Button>
		</div>
	{/if}

	<div class="cols">
		<TodayCard {me} {onDraw} />
		{#if key}<KeyCard {me} keyInfo={key} bind:revealed onRotate={() => (rotating = true)} />{/if}
	</div>

	<!-- The desktop's own: what the web's links to 日志 and 用量 stand for here. -->
	<div class="cols app">
		<button type="button" class="tile" disabled={!egg.usable} onclick={onChat}>
			<ChatCircleIcon size={16} />
			<span class="txt">
				<span class="title">{t('eggInfo.app.chatTitle')}</span>
				<span class="body">{chatBody}</span>
			</span>
			<span class="go"><CaretRightIcon size={16} /></span>
		</button>
		<div class="tile">
			<SquaresFourIcon size={16} />
			<span class="txt">
				<span class="title">{t('eggInfo.app.pickerTitle')}</span>
				<span class="body">{t('eggInfo.app.pickerBody')}</span>
			</span>
			<Switch bind:checked={picker} label={t('eggInfo.app.pickerTitle')} onChange={(on) => egg.setInPicker(on)} />
		</div>
	</div>

	{#if key}
		<section class="calls">
			<div class="calls-head">
				<h2>{t('eggInfo.usage.callsTitle')}</h2>
				<span>{t('eggInfo.usage.callsNote')}</span>
			</div>
			{#if calls.length}
				<ul>
					{#each calls as row (row.id)}
						<li>
							<span class="time">{clockText(row.at)}</span>
							<span class="model">{row.model}</span>
							<span class="detail">{t('eggInfo.usage.callDetail', { input: tokens(row.input_tokens), cached: tokens(row.cached_input_tokens), output: tokens(row.output_tokens) })}</span>
							<span class="counted">{tokens(row.counted_tokens)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="none">
					<p class="none-title">{t('eggInfo.usage.callsEmpty')}</p>
					<p>{t('eggInfo.usage.callsEmptyHint')}</p>
				</div>
			{/if}
		</section>
	{/if}
</div>

{#if rotating && key && me.campaign}
	<RotateDialog campaignId={me.campaign.id} keyInfo={key} onRotated={rotated} onClose={() => (rotating = false)} />
{/if}

<style>
	.usage {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		gap: 16px;
		min-height: 0;
		overflow-y: auto;
		container-type: inline-size;
	}
	.usage > :global(*) {
		flex: none;
	}
	.stopped {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 16px 20px;
		border: 1px solid color-mix(in oklab, var(--warn) 40%, transparent);
		border-radius: var(--r-xl);
		background: color-mix(in oklab, var(--warn) 9%, transparent);
	}
	.stopped p {
		flex: 1;
		min-width: 0;
		margin: 0;
		font-size: var(--fs-sm);
		line-height: 20px;
		color: var(--text);
	}
	.cols {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 16px;
		min-width: 0;
	}
	@container (max-width: 760px) {
		.cols {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	/* The two tiles: the web's link cards (an icon, a title over one line, the end mark). */
	.tile {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		padding: 16px 20px;
		border: 1px solid var(--border);
		border-radius: var(--r-xl);
		background: var(--panel);
		color: var(--dim);
		font: inherit;
		text-align: left;
	}
	button.tile {
		cursor: pointer;
		transition: background var(--t-fast) var(--ease-out);
	}
	button.tile:hover:not(:disabled) {
		background: color-mix(in oklab, var(--surface2) 60%, var(--panel));
	}
	button.tile:disabled {
		cursor: default;
	}
	button.tile:disabled .title,
	button.tile:disabled .go {
		opacity: 0.5;
	}
	.tile > :global(svg) {
		flex: none;
	}
	.txt {
		flex: 1;
		min-width: 0;
	}
	.title {
		display: block;
		font-size: var(--fs-sm);
		font-weight: 500;
		color: var(--text);
	}
	.body {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-top: 2px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.go {
		display: inline-flex;
		flex: none;
		transition: transform var(--t-fast) var(--ease-out);
	}
	button.tile:hover:not(:disabled) .go {
		transform: translateX(2px);
	}

	/* Today's calls. */
	.calls {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--r-xl);
		background: var(--panel);
	}
	.calls-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		padding: 20px 24px 8px;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.calls h2 {
		margin: 0;
		font-size: var(--fs-md);
		font-weight: 600;
		color: var(--text);
	}
	.calls ul {
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--hairline);
	}
	.calls li {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 24px;
		font-size: var(--fs-sm);
	}
	.calls li + li {
		border-top: 1px solid var(--hairline);
	}
	.time {
		flex: none;
		width: 44px;
		color: var(--dim);
		font-variant-numeric: tabular-nums;
	}
	.model {
		flex: none;
		max-width: 40%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		color: var(--text);
	}
	.detail {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.counted {
		flex: none;
		font-weight: 500;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.none {
		padding: 20px 24px 24px;
		border-top: 1px solid var(--hairline);
		text-align: center;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.none p {
		margin: 0;
	}
	.none-title {
		margin-bottom: 4px !important;
		font-size: var(--fs-sm);
		color: var(--text);
	}
</style>
