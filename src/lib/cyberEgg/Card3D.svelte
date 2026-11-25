<script lang="ts" module>
	let seq = 0;
</script>

<script lang="ts">
	// cyber-egg.spec.md CE-C4: one card as a physical object, built like a paper-cut shadow box, drawn here from
	// the shared card-art bundle (art.ts, ART-FORMAT.md "怎么拼一张卡"). It has a thickness (black-core slabs show
	// at the edge when it tilts); its picture planes sit in real depth behind and in front of the face; a clear
	// coat reflects two soft windows; the pointer turns it through a spring (card/tilt.ts). A live card inlines
	// its SVGs so the tilt moves the foil's light; a still one (the album, the others) shows them as images.
	// Without `card` only the back is real (the five-card pick), so a face can't leak.
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { GEOMETRY, GRAIN_TILE, TIER_LOOK, animate, backGrain, frameOf, groundOf, inlineSvg, packOf, svgText, artUrl, windowMaskUrl, type ArtCard } from './art';
	import { Tilt } from './card/tilt';
	import { t } from '$lib/i18n';

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
		card?: ArtCard | null;
		period: number;
		packName: string;
		/** № of this copy (CE-C5); hidden when absent. */
		serial?: number | null;
		/** Face down. */
		flipped?: boolean;
		/** Turns under the pointer. */
		interactive?: boolean;
		/** The foil's light follows the tilt (its SVGs inline). */
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

	const uid = `ce${(seq += 1)}`;
	const edges = [-0.45, -0.15, 0.15];
	const { window: win, card: cardBox } = GEOMETRY;
	const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(3)}%`;
	const windowBox = `left:${pct(win.x, cardBox.w)};top:${pct(win.y, cardBox.h)};width:${pct(win.w, cardBox.w)};height:${pct(win.h, cardBox.h)}`;
	const planeBox = (b: { x: number; y: number; w: number; h: number }) => `left:${pct(b.x, win.w)};top:${pct(b.y, win.h)};width:${pct(b.w, win.w)};height:${pct(b.h, win.h)}`;
	const grainSize = `${((GRAIN_TILE / cardBox.w) * 100).toFixed(3)}% auto`;

	const look = $derived(card ? TIER_LOOK[card.tier] : null);
	const pack = $derived(packOf(card?.period ?? period));
	const edge = $derived(pack?.back.ground ?? '#1b1a18');
	const ground = $derived(card ? groundOf(card.tier) : null);
	const frame = $derived(card ? frameOf(card.tier, card.period) : '');
	const code = $derived(card?.special === 'set' ? t('egg.album.setCode') : (look?.code ?? ''));
	const foot = $derived(card ? (card.special === 'set' ? `${packName} · ${card.of}/${card.of}` : `${packName} · ${String(card.no).padStart(2, '0')}/${card.of}`) : '');

	// A live card's SVGs, inlined once fetched: the planes far → near, then the frame.
	let inlined = $state<{ planes: string[]; frame: string } | null>(null);
	$effect(() => {
		const c = card;
		inlined = null;
		if (!c || !live) return;
		let gone = false;
		const frameFile = frame.slice(artUrl('').length);
		Promise.all([Promise.all(c.planes.map((p) => svgText(p.file))), svgText(frameFile)])
			.then(([planes, frameSvg]) => {
				if (gone) return;
				inlined = { planes: planes.map((s) => inlineSvg(s, uid)), frame: inlineSvg(frameSvg, uid) };
				void tick().then(() => {
					tilt?.refresh();
					if (root) animate(root);
				});
			})
			.catch(() => undefined);
		return () => {
			gone = true;
		};
	});

	let root = $state<HTMLDivElement>();
	let tilt: Tilt | null = null;
	$effect(() => {
		if (!root) return;
		const made = new Tilt(root, { sway, interactive, pose });
		tilt = made;
		return () => {
			made.destroy();
			tilt = null;
		};
	});
	$effect(() => {
		tilt?.update({ sway, interactive, pose });
	});

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
	style:--hole={card ? `url(${windowMaskUrl()})` : undefined}
	onpointermove={(e) => tilt?.move(e)}
	onpointerleave={() => tilt?.leave()}
	{onclick}
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
			{#if card && ground}
				<div class="ce-front" aria-hidden={flipped ? true : undefined}>
					<!-- Far planes first: they sit behind the face, seen through the window. -->
					<div class="ce-depth" style={windowBox}>
						<div class="ce-plane ce-base" style:--d={-2.2}></div>
						{#each card.planes as plane, i (plane.file)}
							<div
								class="ce-plane"
								data-pop={plane.pop ? '' : undefined}
								data-cast={plane.cast ? '' : undefined}
								data-clip={plane.clip ? '' : undefined}
								style="{planeBox(plane.box)};--d:{plane.depth}"
								style:opacity={plane.opacity}
							>
								{#if inlined}{@html inlined.planes[i]}{:else}<img src={artUrl(plane.file)} alt="" draggable="false" />{/if}
							</div>
						{/each}
						<div class="ce-plane ce-wall" style:--d={-0.02}></div>
					</div>
					<!-- The face: paper with the window cut out, the frame, the light, the text. -->
					<div class="ce-skin">
						<!-- The paper: its colour, the grain over it, then the security print (the web's order). -->
						<div class="ce-paper" style:background-color={look?.ground}></div>
						<div class="ce-grain" style:background-image="url({ground.grain})" style:background-size={grainSize}></div>
						<img class="ce-ground" src={ground.svg} alt="" draggable="false" />
						<div class="ce-frame">{#if inlined}{@html inlined.frame}{:else}<img src={frame} alt="" draggable="false" />{/if}</div>
						<div class="ce-holo" aria-hidden="true"></div>
						<div class="ce-glare" aria-hidden="true"></div>
						<div class="ce-text">
							<span class="ce-name">{card.name}</span>
							<span class="ce-code">{code}</span>
							<span class="ce-line">{card.line}</span>
							<span class="ce-foot">
								<span>{foot}</span>
								{#if serial}<span>№ {String(serial).padStart(6, '0')}</span>{/if}
							</span>
						</div>
					</div>
					<div class="ce-glaze" aria-hidden="true"></div>
				</div>
			{/if}
			<div class="ce-face ce-back">
				<div class="ce-paper" style:background-color={edge}></div>
				<div class="ce-grain" style:background-image="url({backGrain()})" style:background-size={grainSize}></div>
				{#if pack}<img class="ce-ground" src={artUrl(pack.back.svg)} alt="" draggable="false" />{/if}
				<div class="ce-glaze ce-glaze-flat" aria-hidden="true"></div>
			</div>
		</div>
	</div>
	{@render children?.()}
</div>
