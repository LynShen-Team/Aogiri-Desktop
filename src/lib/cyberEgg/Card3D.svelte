<script lang="ts">
	// cyber-egg.spec.md CE-C4: one card as a physical object, built like a paper-cut shadow box (the
	// gateway's card3d.tsx). It has a thickness (black-core slabs show at the edge when it tilts), its
	// picture is in real depth, a clear coat reflects two soft windows, and the pointer turns it through a
	// spring. Without `card` only the back is real (the five-card pick), so a face can't leak.
	import type { Snippet } from 'svelte';
	import { mountArt, ceJsx } from './card/jsx';
	import { BackFace, FrontFace } from './card/faces';
	import type { CardDef } from './card/cards';
	import { windowMaskUrl } from './card/frame-art';
	import { TIER_LOOK, packLook } from './card/tiers';
	import { Tilt } from './card/tilt';

	let {
		card = null,
		period,
		packName,
		serial = null,
		flipped = false,
		interactive = true,
		live = true,
		sway = false,
		pop = 1,
		pose = null,
		lift = 0,
		class: className = '',
		label,
		onclick,
		children
	}: {
		/** The card; null shows only its back. */
		card?: CardDef | null;
		period: number;
		packName: string;
		/** № of this copy (CE-C5); hidden when absent. */
		serial?: number | null;
		/** Face down. */
		flipped?: boolean;
		/** Turns under the pointer. */
		interactive?: boolean;
		/** The picture moves (idle motion of the artwork). */
		live?: boolean;
		/** Sways slowly by itself while the pointer is away (display, CE-C6). */
		sway?: boolean;
		/** How far the near planes stand up (0 flat … 1 full). */
		pop?: number;
		/** Holds the card at a tilt (−1..1 each way) instead of following the pointer. */
		pose?: { x: number; y: number } | null;
		/** Raised toward the eye (the reveal). */
		lift?: number;
		class?: string;
		label?: string;
		onclick?: () => void;
		children?: Snippet;
	} = $props();

	let seq = 0;
	const uid = `ce${Math.random().toString(36).slice(2, 8)}${(seq += 1)}`;
	const edges = [-0.45, -0.15, 0.15];
	const look = $derived(card ? TIER_LOOK[card.tier] : null);
	const edge = $derived(packLook(card?.period ?? period).back.ground);
	const hole = `url(${windowMaskUrl()})`;

	let root = $state<HTMLDivElement>();
	let tilt: Tilt | null = null;

	$effect(() => {
		if (!root) return;
		const t = new Tilt(root, { sway, interactive, pose });
		tilt = t;
		return () => {
			t.destroy();
			tilt = null;
		};
	});
	$effect(() => {
		tilt?.update({ sway, interactive, pose });
	});

	/** Draws a face's contents; drawn again when what it shows changes. */
	function front(node: HTMLElement, args: { card: CardDef; serial: number | null; live: boolean }) {
		let undo = mountArt(node, () => ceJsx(FrontFace, { card: args.card, packName, serial: args.serial, uid, live: args.live }));
		tilt?.refresh();
		return {
			update(next: { card: CardDef; serial: number | null; live: boolean }) {
				if (next.card === args.card && next.serial === args.serial && next.live === args.live) return;
				args = next;
				undo();
				undo = mountArt(node, () => ceJsx(FrontFace, { card: next.card, packName, serial: next.serial, uid, live: next.live }));
				tilt?.refresh();
			},
			destroy: () => undo()
		};
	}
	function back(node: HTMLElement) {
		const undo = mountArt(node, () => ceJsx(BackFace, { period: card?.period ?? period, packName, uid }));
		queueMicrotask(() => tilt?.refresh());
		return { destroy: () => undo() };
	}

	function onkeydown(event: KeyboardEvent) {
		if (!onclick) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onclick();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_tabindex -->
<div
	bind:this={root}
	class="ce-card {className}"
	data-tier={card?.tier}
	data-special={card?.special}
	data-flipped={flipped || !card ? '' : undefined}
	data-live={live ? '' : undefined}
	style:--edge={edge}
	style:--ink={look?.ink}
	style:--soft={look?.soft}
	style:--art-ground={card?.ground}
	style:--pop={pop}
	style:--lift={lift}
	style:--hole={card ? hole : undefined}
	onpointermove={(e) => tilt?.move(e)}
	onpointerleave={() => tilt?.leave()}
	onclick={onclick}
	{onkeydown}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	aria-label={label}
>
	<div class="ce-shadow" aria-hidden="true"></div>
	<div class="ce-tilt">
		<div class="ce-flip">
			{#each edges as z (z)}
				<div class="ce-edge" style:--z="{z}cqw" aria-hidden="true"></div>
			{/each}
			{#if card}
				<div class="ce-front" aria-hidden={flipped ? true : undefined} use:front={{ card, serial, live }}></div>
			{/if}
			<div class="ce-face ce-back" use:back></div>
		</div>
	</div>
	{@render children?.()}
</div>
