<script lang="ts">
	// Hotfix 11-25 (the website's `pages/cyber-egg/models-panel.tsx`): a round may offer dozens of models. Past six, the
	// key card's 「全部 N 个」 opens this panel: a search box (letters and digits in order, so 「gpt6」 finds gpt-6.2-sol),
	// then the models grouped by vendor in the admin's order, each group folding. A row picks its model and closes the
	// panel; its copy button copies it. A popover (`.pop`) under its button; the list scrolls inside it, never the page.
	import { onMount, tick } from 'svelte';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import { t } from '$lib/i18n';
	import Vendor from '$lib/Vendor.svelte';
	import { tn } from './text';

	let {
		models,
		value,
		anchor,
		onPick,
		onCopy,
		onClose
	}: {
		models: string[];
		value: string;
		/** The button it opens under (its right edge lines up with the button's). */
		anchor: HTMLElement;
		onPick: (model: string) => void;
		onCopy: (model: string) => void;
		onClose: () => void;
	} = $props();

	/** Vendor by the model name's start (after any 「owner/」 path); a prefix matches only before a non-letter. */
	const VENDORS: Array<[string, string[]]> = [
		['DeepSeek', ['deepseek']],
		['OpenAI', ['gpt', 'chatgpt', 'o1', 'o3', 'o4', 'codex', 'davinci']],
		['Claude', ['claude']],
		['Gemini', ['gemini', 'gemma']],
		['Qwen', ['qwen', 'qwq']],
		['GLM', ['glm', 'chatglm', 'zhipu']],
		['Kimi', ['kimi', 'moonshot']],
		['Doubao', ['doubao']],
		['Grok', ['grok']],
		['MiniMax', ['minimax', 'abab']],
		['Mistral', ['mistral', 'mixtral', 'codestral', 'devstral', 'magistral']],
		['Llama', ['llama']],
		['Hunyuan', ['hunyuan']],
		['ERNIE', ['ernie']],
		['StepFun', ['step']],
		['Yi', ['yi']]
	];

	function vendorOf(model: string): string | null {
		const name = (model.split('/').pop() ?? model).toLowerCase();
		for (const [vendor, prefixes] of VENDORS) {
			if (prefixes.some((prefix) => name.startsWith(prefix) && !/[a-z]/.test(name.charAt(prefix.length)))) return vendor;
		}
		return null;
	}

	const WORD = /[\p{L}\p{N}]/u;
	const squash = (text: string) => [...text.toLowerCase()].filter((char) => WORD.test(char)).join('');

	/** The letters and digits of `query` in order within `model`: the matched positions, or null. */
	function fuzzyHits(model: string, query: string): number[] | null {
		const want = squash(query);
		const hits: number[] = [];
		let next = 0;
		for (let index = 0; index < model.length && next < want.length; index += 1) {
			if (model.charAt(index).toLowerCase() === want.charAt(next)) {
				hits.push(index);
				next += 1;
			}
		}
		return next === want.length ? hits : null;
	}

	type Group = { key: string; label: string; items: Array<{ model: string; hits: number[] }> };

	let query = $state('');
	let folded = $state<Set<string>>(new Set());
	const searching = $derived(squash(query).length > 0);
	/** The models by vendor: groups in the order their first model comes, 其他 last; inside a group, the admin's order. */
	const groups = $derived.by(() => {
		const map = new Map<string, Group>();
		const want = squash(query);
		for (const model of models) {
			const vendor = vendorOf(model);
			const key = vendor ?? '';
			let hits: number[] | null = [];
			if (want) {
				hits = fuzzyHits(model, query);
				if (!hits && vendor && squash(vendor).startsWith(want)) hits = [];
				if (!hits) continue;
			}
			const group = map.get(key) ?? { key, label: vendor ?? t('eggInfo.models.other'), items: [] };
			group.items.push({ model, hits });
			map.set(key, group);
		}
		const list = [...map.values()];
		return [...list.filter((group) => group.key), ...list.filter((group) => !group.key)];
	});
	/** The rows the arrow keys walk: every match while searching, else the rows of open groups. */
	const rows = $derived(groups.flatMap((group) => (searching || !folded.has(group.key) ? group.items.map((item) => item.model) : [])));
	let active = $state(-1);
	const current = $derived(active >= 0 ? rows[Math.min(active, rows.length - 1)] : searching ? rows[0] : value);

	function fold(key: string) {
		const next = new Set(folded);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		folded = next;
	}

	let list = $state<HTMLDivElement>();
	let input = $state<HTMLInputElement>();
	let place = $state<{ top: number; right: number; maxHeight: number; up: boolean } | null>(null);

	function measure() {
		const r = anchor.getBoundingClientRect();
		const below = window.innerHeight - r.bottom - 16;
		const above = r.top - 16;
		const up = below < 260 && above > below;
		place = { top: up ? r.top - 6 : r.bottom + 6, right: window.innerWidth - r.right, maxHeight: Math.min(window.innerHeight * 0.6, (up ? above : below) - 6), up };
	}

	onMount(() => {
		measure();
		void tick().then(() => {
			input?.focus();
			// The picked model in view on open.
			const row = list?.querySelector<HTMLElement>('[aria-selected="true"]');
			if (list && row) list.scrollTop = row.offsetTop - (list.clientHeight - row.offsetHeight) / 2;
		});
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	});

	const rowId = (model: string) => `ce-model-${models.indexOf(model)}`;

	function moveTo(index: number) {
		const next = Math.max(0, Math.min(rows.length - 1, index));
		active = next;
		const row = rows[next] ? list?.querySelector<HTMLElement>(`[id="${CSS.escape(rowId(rows[next]))}"]`) : null;
		if (!list || !row) return;
		// Clear of the sticky group title above it.
		const top = row.offsetTop - 30;
		const bottom = row.offsetTop + row.offsetHeight;
		if (top < list.scrollTop) list.scrollTop = top;
		else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			onClose();
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const at = current ? rows.indexOf(current) : -1;
			moveTo(at < 0 ? 0 : at + (event.key === 'ArrowDown' ? 1 : -1));
		} else if (event.key === 'Enter' && current) {
			event.preventDefault();
			onPick(current);
		}
	}

	const marked = (text: string, hits: number[]) => {
		const set = new Set(hits);
		return [...text].map((char, index) => ({ char, hit: set.has(index) }));
	};
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="away" onpointerdown={onClose}></div>
{#if place}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="pop models-pop"
		class:up={place.up}
		style:top="{place.top}px"
		style:right="{place.right}px"
		style:max-height="{place.maxHeight}px"
		aria-label={tn('eggInfo.models.count', models.length, { count: models.length })}
		onkeydown={onKey}
	>
		<label class="search">
			<MagnifyingGlassIcon size={14} />
			<input
				bind:this={input}
				type="search"
				role="combobox"
				aria-expanded="true"
				aria-controls="ce-models-list"
				aria-autocomplete="list"
				aria-activedescendant={current ? rowId(current) : undefined}
				aria-label={t('eggInfo.models.search')}
				placeholder={t('eggInfo.models.search')}
				autocomplete="off"
				spellcheck={false}
				bind:value={query}
				oninput={() => {
					active = -1;
					list?.scrollTo({ top: 0 });
				}}
			/>
		</label>
		<div bind:this={list} id="ce-models-list" class="list" role="listbox" aria-label={tn('eggInfo.models.count', models.length, { count: models.length })}>
			{#if groups.length === 0}<p class="none">{t('eggInfo.models.none')}</p>{/if}
			{#each groups as group (group.key)}
				{@const open = searching || !folded.has(group.key)}
				<div role="group" aria-label="{group.label} {group.items.length}">
					<button type="button" class="group-head" tabindex={-1} aria-expanded={open} disabled={searching} onclick={() => fold(group.key)}>
						{#if !searching}<span class="caret" class:open><CaretRightIcon size={12} /></span>{/if}
						<span class="group-name">{group.label}</span>
						<span class="group-count">{group.items.length}</span>
					</button>
					{#if open}
						{#each group.items as { model, hits } (model)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								id={rowId(model)}
								class="row"
								class:lit={model === current}
								role="option"
								tabindex={-1}
								aria-selected={model === value}
								onclick={() => onPick(model)}
								onmousemove={() => {
									if (model !== current) active = rows.indexOf(model);
								}}
							>
								<Vendor {model} size={16} />
								<span class="name" class:picked={model === value}>
									{#each marked(model, hits) as part, index (index)}{#if part.hit}<span class="hit">{part.char}</span>{:else}{part.char}{/if}{/each}
								</span>
								{#if model === value}<CheckIcon size={14} />{/if}
								<button
									type="button"
									class="copy"
									tabindex={-1}
									aria-label={t('eggInfo.key.copy', { what: model })}
									onclick={(event) => {
										event.stopPropagation();
										onCopy(model);
									}}
								>
									<CopyIcon size={14} />
								</button>
							</div>
						{/each}
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.away {
		position: fixed;
		inset: 0;
		z-index: 90;
	}
	.models-pop {
		position: fixed;
		z-index: 91;
		width: min(352px, calc(100vw - 32px));
		gap: 8px;
		padding: 8px;
		animation: pop-in var(--t-fast) var(--ease-out);
		transform-origin: top right;
	}
	.models-pop.up {
		transform: translateY(-100%);
		transform-origin: bottom right;
		animation: none;
	}
	.search {
		position: relative;
		display: flex;
		flex: none;
		align-items: center;
		gap: 8px;
		height: 36px;
		padding: 0 10px;
		border-radius: var(--r-sm);
		background: var(--surface2);
		color: var(--dim);
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: none;
		color: var(--text);
		font: inherit;
		font-size: var(--fs-sm);
	}
	.search input::placeholder {
		color: var(--dim2);
	}
	.search input::-webkit-search-cancel-button {
		display: none;
	}
	.list {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.none {
		margin: 0;
		padding: 32px 8px;
		text-align: center;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.group-head {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 8px 8px 4px;
		border: none;
		border-radius: var(--r-sm);
		background: var(--panel);
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-xs);
		text-align: left;
		cursor: pointer;
	}
	.group-head:disabled {
		cursor: default;
	}
	.group-head:hover:not(:disabled) {
		color: var(--text);
	}
	.caret {
		display: inline-flex;
		transition: transform var(--t-fast) var(--ease-out);
	}
	.caret.open {
		transform: rotate(90deg);
	}
	.group-name {
		font-weight: 500;
		color: color-mix(in oklab, var(--text) 80%, transparent);
	}
	.group-count {
		font-variant-numeric: tabular-nums;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 32px;
		padding: 2px 2px 2px 8px;
		border-radius: var(--r-md);
		color: var(--text);
		cursor: pointer;
	}
	.row.lit {
		background: var(--surface2);
	}
	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		color: color-mix(in oklab, var(--text) 85%, transparent);
	}
	.name.picked {
		font-weight: 500;
		color: var(--text);
	}
	.hit {
		font-weight: 600;
		color: var(--text);
		text-decoration: underline;
		text-decoration-color: color-mix(in oklab, var(--text) 40%, transparent);
		text-underline-offset: 3px;
	}
	.copy {
		display: grid;
		flex: none;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim);
		cursor: pointer;
	}
	.copy:hover {
		background: var(--bg);
		color: var(--text);
	}
</style>
