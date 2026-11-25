<script lang="ts">
	// cyber-egg.spec.md CE-R1..CE-R5: today's draw as a pack opening (the gateway's draw-stage.tsx).
	//   1. The sealed pack: the player tears it by hand (Enter on it tears it by itself).
	//   2. The stack slides out of the mouth, the wrapper drops away, five cards fan out face down.
	//   3. Pick one. Only now does the server draw, so nothing can be read from the page before.
	//   4. The picked card goes to its place; light from behind it hints the tier (a gilt card glows
	//      silver first, then gold); it turns over and its picture stands up off the face. The four
	//      others turn over small, beside it.
	//   5. The result: what it gave, until when, a conversation on it.
	// A click or Esc skips to the end; reduced motion gets the end at once.
	import { tick, untrack } from 'svelte';
	import ChatCircleIcon from 'phosphor-svelte/lib/ChatCircleIcon';
	import Button from '$lib/ui/Button.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { t } from '$lib/i18n';
	import Card3D from './Card3D.svelte';
	import Pack from './Pack.svelte';
	import Motes from './Motes.svelte';
	import { cardById } from './card/cards';
	import type { TearHint } from './card/pack-engine';
	import { TIER_LOOK, type CardTier } from './card/tiers';
	import { playDeal, playFlip, playReveal, playRustle } from './card/sound';
	import { eggApi, eggErrorText, type EggDraw, type EggMe, type EggPicked } from './api';
	import { left, wan } from './format';

	type Phase = 'sealed' | 'dealing' | 'fanned' | 'picking' | 'revealing' | 'done';
	interface Spot {
		x: number;
		y: number;
		w: number;
		rot: number;
		z: number;
		opacity: number;
		ms: number;
		delay: number;
	}
	type Aura = { level: number; color: string; glow: string; prism: boolean; rays: boolean };

	let {
		me,
		now,
		onDrawn,
		onChat,
		onAlbum
	}: {
		me: EggMe;
		now: number;
		onDrawn: (result: EggPicked) => void;
		/** Start a conversation on today's tokens. */
		onChat: () => void;
		onAlbum: () => void;
	} = $props();

	/** The width a card is drawn at; smaller places scale it down (keeps the art crisp). */
	const BASE_W = 300;
	/** Where on the frame the glints come (% of the aura's box), and when. */
	const GLINTS: Array<[number, number, number]> = [
		[31.5, 24, 0],
		[68.6, 47, -1.6],
		[43, 76.6, -3.1]
	];
	const reducedMotion = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

	// Opened today already (a later visit): the result, drawn directly.
	const initial = untrack(() => me.today);
	let phase = $state<Phase>(initial ? 'done' : 'sealed');
	let staticResult = $state(!!initial);
	let stage = $state<HTMLDivElement>();
	let packBox = $state<HTMLDivElement>();
	let chosenSlot = $state<HTMLDivElement>();
	const otherSlots: Array<HTMLDivElement | undefined> = [];
	const shakeEls: Array<HTMLDivElement | undefined> = [];
	let spinEl = $state<HTMLDivElement>();
	let size = $state({ w: 0, h: 0 });
	let spots = $state<Spot[]>([]);
	let picked = $state<number | null>(null);
	let result = $state<EggPicked | null>(null);
	let faceUp = $state([false, false, false, false, false]);
	let pop = $state(0);
	let pose = $state<{ x: number; y: number } | null>(null);
	let lift = $state(0);
	let aura = $state<Aura>({ level: 0, color: '#fff', glow: '#c2b391', prism: false, rays: false });
	let motes = $state<'gold' | 'prism' | null>(null);
	let shown = $state(!!initial);
	let tearHint = $state<TearHint>(null);
	let drawId: string | null = null;

	// Waits that a skip resolves at once.
	let skipped = false;
	const pending = new Set<() => void>();
	function wait(ms: number) {
		return new Promise<void>((resolve) => {
			if (skipped || ms <= 0) return resolve();
			const done = () => {
				pending.delete(done);
				window.clearTimeout(timer);
				resolve();
			};
			const timer = window.setTimeout(done, ms);
			pending.add(done);
		});
	}
	function skip() {
		skipped = true;
		for (const done of [...pending]) done();
	}

	$effect(() => {
		const node = stage;
		if (!node) return;
		const measure = () => (size = { w: node.clientWidth, h: node.clientHeight });
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	});

	/** Where the five cards sit when fanned out (stage px); they fit the stage's height too. */
	function fanSpots(width: number, height: number): Spot[] {
		const w = Math.min(176, (width - 96) / 5.5, (height - 64) / 1.48);
		const h = w * 1.4;
		const gap = w * 0.16;
		const total = 5 * w + 4 * gap;
		return Array.from({ length: 5 }, (_, k) => {
			const off = k - 2;
			return { x: (width - total) / 2 + k * (w + gap), y: height / 2 - h / 2 + Math.abs(off) ** 1.5 * 9 - 14, w, rot: off * 2.6, z: 10 + k, opacity: 1, ms: 620, delay: k * 70 };
		});
	}

	function rectIn(node: HTMLElement | undefined) {
		if (!node || !stage) return null;
		const a = node.getBoundingClientRect();
		const b = stage.getBoundingClientRect();
		return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
	}

	/** Cards inside the pack: stacked under its mouth. */
	function inPack(): Spot[] {
		const box = rectIn(packBox);
		const w = box ? box.w * 0.8 : 160;
		const x = box ? box.x + (box.w - w) / 2 : size.w / 2 - w / 2;
		const y = box ? box.y + box.h * 0.12 : 80;
		return Array.from({ length: 5 }, (_, k) => ({ x: x + (k - 2) * 0.6, y: y + k * 0.8, w, rot: 0, z: 1 + k, opacity: 0, ms: 0, delay: 0 }));
	}

	// Keep the fanned cards, and the cards on their slots, where they belong when the stage resizes.
	$effect(() => {
		const { w, h } = size;
		if (!w) return;
		if (phase === 'fanned') spots = fanSpots(w, h).map((spot) => ({ ...spot, ms: 0, delay: 0 }));
		else if (phase === 'done' && !staticResult) void tick().then(() => toSlots(0));
	});

	/** Moves the picked card and the four others onto the result's slots. */
	function toSlots(ms: number) {
		const chosen = rectIn(chosenSlot);
		if (!chosen || picked === null) return;
		const others = otherSlots.map((node) => rectIn(node));
		let o = 0;
		spots = spots.map((spot, k) => {
			if (k === picked) return { ...spot, x: chosen.x, y: chosen.y, w: chosen.w, rot: 0, z: 40, opacity: 1, ms, delay: 0 };
			const slot = others[o];
			o += 1;
			return slot ? { ...spot, x: slot.x, y: slot.y, w: slot.w, rot: 0, z: 20 + o, opacity: 1, ms, delay: o * 60 } : spot;
		});
	}

	async function onTorn() {
		const reduced = reducedMotion();
		// The server opens the pack while the stack slides out; a refusal puts the pack back.
		const opening = eggApi.draw(false).then(
			(answer) => {
				drawId = answer.draw_id;
				return true;
			},
			(error) => {
				toast.error(eggErrorText(error));
				return false;
			}
		);
		phase = 'dealing';
		const start = inPack();
		spots = start;
		await wait(30);
		// As a pack really empties: the sides are squeezed, the mouth opens and the stack's top shows in the
		// light; then the whole stack slides out together, the wrapper drops away, and only then are the
		// cards spread.
		if (!reduced) {
			packBox?.animate([{ transform: 'scale(1, 1)' }, { transform: 'scale(0.94, 1.015)' }, { transform: 'scale(0.955, 1.01)' }], { duration: 340, easing: 'ease-out', fill: 'forwards' });
			playRustle();
		}
		spots = start.map((spot, k) => ({ ...spot, y: spot.y - spot.w * 0.3 - k * 0.6, opacity: 1, ms: reduced ? 0 : 420, delay: 0 }));
		await wait(reduced ? 0 : 620);
		if (!(await opening)) {
			packBox?.getAnimations().forEach((a) => a.cancel());
			spots = [];
			phase = 'sealed';
			return;
		}
		playDeal(0);
		spots = start.map((spot, k) => ({ ...spot, y: spot.y - spot.w * 1.1 - k * 0.8, opacity: 1, ms: reduced ? 0 : 540, delay: 0 }));
		if (!reduced) {
			packBox?.animate(
				[
					{ transform: 'translateY(0) scale(0.955, 1.01) rotate(0deg)', opacity: 1 },
					{ transform: 'translateY(24%) scale(1, 1) rotate(-4deg)', opacity: 0 }
				],
				{ duration: 640, delay: 300, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' }
			);
		} else if (packBox) packBox.style.opacity = '0';
		await wait(reduced ? 0 : 620);
		const fan = fanSpots(size.w, size.h);
		fan.forEach((_, k) => playDeal(k));
		spots = fan.map((spot) => (reduced ? { ...spot, ms: 0, delay: 0 } : spot));
		await wait(reduced ? 0 : 900);
		phase = 'fanned';
	}

	async function shake(times: number, strength: number) {
		const node = picked === null ? undefined : shakeEls[picked];
		if (!node || skipped) return;
		const frames: Keyframe[] = [{ transform: 'translate(0,0) rotate(0)' }];
		for (let k = 0; k < times; k += 1) {
			frames.push(
				{ transform: `translate(${-strength}px, ${-strength * 0.4}px) rotate(${-strength * 0.35}deg)` },
				{ transform: `translate(${strength}px, ${strength * 0.3}px) rotate(${strength * 0.35}deg)` }
			);
		}
		frames.push({ transform: 'translate(0,0) rotate(0)' });
		playRustle();
		node.animate(frames, { duration: 110 * times * 2 + 80, easing: 'ease-in-out' });
		await wait(110 * times * 2 + 120);
	}

	async function runReveal(tier: CardTier) {
		const look = TIER_LOOK[tier];
		// 1. The hint: light from behind the card, in the tier's colour.
		if (tier === 'n') {
			aura = { level: 0.45, color: look.light, glow: look.glow, prism: false, rays: false };
			await wait(300);
		} else if (tier === 'r') {
			aura = { level: 0.7, color: look.light, glow: look.glow, prism: false, rays: false };
			await wait(450);
			await shake(1, 3);
		} else if (tier === 'sr') {
			aura = { level: 0.8, color: look.light, glow: look.glow, prism: false, rays: true };
			await wait(500);
			await shake(2, 4);
		} else if (tier === 'ssr') {
			// It glows silver first, waits half a beat, then turns gold.
			aura = { level: 0.8, color: TIER_LOOK.sr.light, glow: TIER_LOOK.sr.glow, prism: false, rays: true };
			await wait(520);
			await shake(2, 4);
			await wait(260);
			aura = { level: 1, color: look.light, glow: look.glow, prism: false, rays: true };
			motes = 'gold';
			await wait(560);
			await shake(1, 7);
		} else {
			aura = { level: 0.6, color: '#ffffff', glow: look.glow, prism: false, rays: false };
			lift = 5;
			await wait(520);
			aura = { level: 1, color: '#ffffff', glow: look.glow, prism: true, rays: true };
			motes = 'prism';
			await wait(900);
		}
		// 2. It turns over; the hologram spins a full turn more on the way.
		playFlip();
		if (tier === 'ur' && spinEl && !skipped) {
			spinEl.animate([{ transform: 'rotateY(-360deg)' }, { transform: 'rotateY(0deg)' }], { duration: 1300, easing: 'cubic-bezier(.2,.7,.2,1)' });
		}
		faceUp = faceUp.map((value, k) => (k === picked ? true : value));
		await wait(tier === 'ur' ? 1100 : tier === 'ssr' ? 760 : 620);
		// 3. Its picture stands up off the face; the light sweeps once over the foil.
		pop = 1;
		playReveal(tier);
		lift = 0;
		if (!skipped) {
			pose = { x: -0.9, y: -0.35 };
			await wait(360);
			pose = { x: 0.85, y: 0.3 };
			await wait(520);
		}
		pose = null;
		// 4. The four others turn over beside it.
		for (let k = 0; k < 5; k += 1) {
			if (k === picked) continue;
			faceUp = faceUp.map((value, i) => (i === k ? true : value));
			playFlip(true);
			await wait(140);
		}
		aura = { ...aura, level: tier === 'n' || tier === 'r' ? 0 : aura.level * 0.55 };
		await wait(200);
		shown = true;
		phase = 'done';
	}

	async function pick(index: number) {
		if (phase !== 'fanned' || !drawId) return;
		picked = index;
		phase = 'picking';
		// The picking pause: the picked card rises, the others settle back.
		spots = spots.map((spot, k) =>
			k === index ? { ...spot, y: spot.y - 26, rot: 0, z: 40, ms: 380, delay: 0 } : { ...spot, y: spot.y + 14, opacity: 0.55, ms: 380, delay: 0 }
		);
		let answer: EggPicked;
		try {
			[answer] = await Promise.all([eggApi.pick(drawId, index), wait(reducedMotion() ? 0 : 650)]);
		} catch (error) {
			toast.error(eggErrorText(error));
			picked = null;
			spots = fanSpots(size.w, size.h).map((spot) => ({ ...spot, delay: 0 }));
			phase = 'fanned';
			return;
		}
		result = answer;
		// The result's slots are laid out: move the cards there and play the reveal.
		await tick();
		if (reducedMotion()) skip();
		toSlots(reducedMotion() ? 0 : 700);
		phase = 'revealing';
		await wait(760);
		await runReveal(answer.draw.card.tier);
		onDrawn(answer);
	}

	$effect(() => {
		if (phase !== 'revealing') return;
		const onKey = (event: KeyboardEvent) => event.key === 'Escape' && skip();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const draw = $derived<EggDraw | null>(result?.draw ?? initial ?? null);
	const showResult = $derived(!!draw && (phase === 'picking' || phase === 'revealing' || phase === 'done'));
	const chosenDef = $derived(draw ? cardById(draw.card.card_id) : undefined);
	const lapse = $derived(draw ? left(draw.expires_at, now) : null);

	function cardFor(k: number) {
		if (!draw || picked === null) return null;
		if (k === picked) return { def: cardById(draw.card.card_id), serial: draw.card.serial };
		const others = [0, 1, 2, 3, 4].filter((i) => i !== picked);
		const other = draw.others[others.indexOf(k)];
		return other ? { def: cardById(other.card_id), serial: null } : null;
	}

	/** The aura's box: centred on the picked card, about twice its size. */
	function auraBox(spot: Spot | undefined): string {
		if (!spot) return '';
		const h = spot.w * 1.4;
		const s = spot.w * 2.6;
		return `left:${spot.x + spot.w / 2 - s / 2}px;top:${spot.y + h / 2 - s / 2}px;width:${s}px;height:${s}px`;
	}

	// A number that rolls up to the tokens once the text shows (at once under reduced motion).
	let counted = $state(initial ? initial.card.tokens : 0);
	$effect(() => {
		if (!shown || !draw || staticResult) return;
		const value = draw.card.tokens;
		if (reducedMotion()) {
			counted = value;
			return;
		}
		let raf = 0;
		const t0 = performance.now();
		const step = (time: number) => {
			const p = Math.min(1, (time - t0) / 1100);
			counted = Math.round((value * (1 - Math.pow(1 - p, 3))) / 10_000) * 10_000;
			if (p < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	});
	const pityLine = $derived(me.pity_left.sr ? t('egg.draw.pity', { n: me.pity_left.sr }) : '');
	const range = $derived.by(() => {
		const low = Math.min(...me.tiers.map((r) => r.min_tokens));
		const high = Math.max(...me.tiers.map((r) => r.max_tokens));
		return t('egg.draw.range', { low: wan(low), high: high >= 100_000_000 ? t('egg.draw.yi', { n: high / 100_000_000 }) : `${wan(high)} 万` });
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div bind:this={stage} class="stage" class:busy={phase !== 'done'} data-phase={phase} onclick={() => phase === 'revealing' && skip()}>
	{#if showResult && phase !== 'picking' && aura.level > 0 && picked !== null}
		<div
			class="ce-aura"
			class:ce-aura-prism={aura.prism}
			class:ce-aura-rays={aura.rays}
			style="{auraBox(spots[picked])};--aura-light:{aura.color};--aura-glow:{aura.glow};opacity:{aura.level}"
			aria-hidden="true"
		>
			<span class="ce-aura-floor"></span>
		</div>
	{/if}
	{#if showResult && phase === 'done' && aura.rays && picked !== null}
		<div class="ce-glints" style={auraBox(spots[picked])} aria-hidden="true">
			{#each GLINTS as [x, y, delay] (`${x}-${y}`)}
				<span style:left="{x}%" style:top="{y}%" style:animation-delay="{delay}s"></span>
			{/each}
		</div>
	{/if}
	{#if showResult && motes}<Motes kind={motes} active={true} />{/if}

	{#if showResult && draw}
		<div class="result">
			<div bind:this={chosenSlot} class="chosen">
				{#if staticResult && chosenDef}
					<Card3D card={chosenDef} period={me.pack.period} packName={me.pack.name} serial={draw.card.serial} sway />
				{:else}
					<div class="ratio"></div>
				{/if}
			</div>
			<div class="info" class:shown>
				<p class="tier">{t(`egg.tier.${draw.card.tier}`)} · {TIER_LOOK[draw.card.tier].code}</p>
				<h2 class="name">{chosenDef?.name}</h2>
				<p class="got">{t('egg.result.got')}</p>
				<p class="figure"><span class="n">{wan(counted)}</span><span class="u">{t('egg.wan')}</span><span class="tk">tokens</span></p>
				<p class="valid">
					{lapse ? t('egg.result.validLeft', { h: lapse.h, m: lapse.m }) : t('egg.result.validEnded')}
				</p>
				<div class="actions">
					<Button variant="primary" onclick={onChat}><ChatCircleIcon size={16} />{t('egg.result.chat')}</Button>
					<Button variant="secondary" onclick={onAlbum}>{t('egg.result.album')}</Button>
				</div>
				<div class="others">
					<p class="label">{t('egg.result.others')}</p>
					<div class="row">
						{#each draw.others as other, index (index)}
							{@const def = cardById(other.card_id)}
							<div class="other" bind:this={otherSlots[index]}>
								{#if (staticResult || phase === 'done') && def}
									<Card3D card={def} period={me.pack.period} packName={me.pack.name} interactive={false} live={false} class="ce-card-dim" />
								{:else}
									<div class="ratio"></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if phase === 'sealed' || phase === 'dealing'}
		<div class="sealed">
			<div bind:this={packBox} class="pack-box">
				<Pack
					period={me.pack.period}
					packName={me.pack.name}
					disabled={phase !== 'sealed'}
					label={t('egg.draw.tearLabel')}
					{onTorn}
					onHint={(hint) => (tearHint = hint === null && tearHint === 'small' ? tearHint : hint)}
				/>
			</div>
			<div class="lines" class:gone={phase !== 'sealed'}>
				<p class="hint" aria-live="polite">
					{t(tearHint === 'small' ? 'egg.draw.tearMore' : tearHint === 'edge' ? 'egg.draw.tearEdge' : tearHint === 'slack' ? 'egg.draw.tearSlack' : 'egg.draw.tearHint')}
				</p>
				<p class="sub">{[pityLine, range].filter(Boolean).join(' · ')}</p>
			</div>
		</div>
	{/if}

	{#if phase === 'fanned'}
		<p class="pick-hint" aria-live="polite">{t('egg.draw.pick')}</p>
	{/if}

	{#if spots.length && phase !== 'sealed' && !staticResult}
		{#each spots as spot, k (k)}
			{@const face = cardFor(k)}
			{@const isPicked = k === picked}
			<div
				class="ce-stage-card card-at"
				class:is-pickable={phase === 'fanned'}
				class:is-picked={isPicked}
				style:width="{BASE_W}px"
				style:transform="translate3d({spot.x}px, {spot.y}px, 0) rotate({spot.rot}deg) scale({spot.w / BASE_W})"
				style:z-index={spot.z}
				style:opacity={phase === 'done' && !isPicked ? 0 : spot.opacity}
				style:visibility={phase === 'done' && !isPicked ? 'hidden' : undefined}
				style:transition="transform {spot.ms}ms cubic-bezier(.2,.8,.2,1) {spot.delay}ms, opacity 320ms ease {spot.delay}ms"
			>
				<div bind:this={shakeEls[k]} class="ce-stage-shake">
					{#if isPicked}
						<div bind:this={spinEl} class="ce-stage-spin">
							{@render cardOf(k, face)}
						</div>
					{:else}
						<div class="ce-stage-spin">
							{@render cardOf(k, face)}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	{/if}

	{#if phase === 'revealing'}
		<button type="button" class="skip" onclick={skip}>{t('egg.draw.skip')}</button>
	{/if}
</div>

{#snippet cardOf(k: number, face: { def: ReturnType<typeof cardById>; serial: number | null } | null)}
	{@const isPicked = k === picked}
	{#if face?.def}
		<Card3D
			card={face.def}
			period={me.pack.period}
			packName={me.pack.name}
			serial={face.serial}
			flipped={!faceUp[k]}
			pop={isPicked ? pop : 1}
			pose={isPicked ? pose : null}
			sway={isPicked && phase === 'done'}
			interactive={isPicked}
			live={isPicked}
			lift={isPicked ? lift : 0}
			class={isPicked ? '' : 'ce-card-dim'}
		/>
	{:else}
		<Card3D
			period={me.pack.period}
			packName={me.pack.name}
			interactive={phase === 'fanned'}
			onclick={phase === 'fanned' ? () => void pick(k) : undefined}
			label={t('egg.draw.pickLabel', { n: k + 1 })}
		/>
	{/if}
{/snippet}

<style>
	.stage {
		position: relative;
		flex: 1;
		min-height: 0;
		min-width: 0;
		container-type: size;
	}
	.stage.busy {
		user-select: none;
		-webkit-user-select: none;
	}
	.card-at {
		position: absolute;
		left: 0;
		top: 0;
		transform-origin: 0 0;
	}
	.sealed {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 28px;
	}
	.pack-box {
		position: relative;
		z-index: 30;
		width: min(240px, calc((100cqh - 240px) / 1.45));
	}
	/* The lamp the pack is held under: a soft warm light on the canvas behind it. */
	.sealed::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 42%;
		width: min(760px, 120cqh);
		aspect-ratio: 1;
		border-radius: 50%;
		transform: translate(-50%, -50%);
		background: radial-gradient(closest-side, color-mix(in oklab, var(--logo-light) 12%, transparent), transparent);
		pointer-events: none;
	}
	:global(:root[data-theme='dark']) .sealed::before {
		background: radial-gradient(closest-side, color-mix(in oklab, var(--logo-light) 7%, transparent), transparent);
	}
	.lines {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		text-align: center;
		transition: opacity var(--t-base) var(--ease-base);
	}
	.lines.gone {
		opacity: 0;
		pointer-events: none;
	}
	.hint {
		margin: 0;
		font-size: var(--fs-sm);
		font-weight: 500;
		color: var(--text);
	}
	.sub {
		margin: 0;
		font-size: var(--fs-xs);
		color: var(--dim);
	}
	.pick-hint {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 24px;
		margin: 0;
		text-align: center;
		font-size: var(--fs-sm);
		color: var(--dim);
		pointer-events: none;
	}
	.result {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: center;
		gap: 56px;
		padding: 8px 0;
	}
	.chosen {
		justify-self: end;
		width: min(270px, calc((100cqh - 110px) / 1.42));
	}
	.ratio {
		aspect-ratio: 5 / 7;
	}
	.info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		max-width: 460px;
		opacity: 0;
		transform: translateY(8px);
		transition:
			opacity 0.5s var(--ease-base),
			transform 0.5s var(--ease-base);
	}
	.info.shown {
		opacity: 1;
		transform: none;
	}
	.tier {
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.name {
		margin: 6px 0 0;
		font-size: var(--fs-2xl);
		font-weight: 600;
		color: var(--text);
	}
	.got {
		margin: 22px 0 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.figure {
		display: flex;
		align-items: baseline;
		gap: 6px;
		margin: 6px 0 0;
		color: var(--text);
		white-space: nowrap;
	}
	.figure .n {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-size: calc(var(--fs-2xl) * 1.45);
		font-weight: 600;
		line-height: 1;
		letter-spacing: -0.02em;
	}
	.figure .u {
		font-size: var(--fs-xl);
		font-weight: 600;
	}
	.figure .tk {
		margin-left: 4px;
		font-size: var(--fs-md);
		color: var(--dim);
	}
	.valid {
		margin: 14px 0 0;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 22px;
	}
	.others {
		margin-top: 22px;
		padding-top: 18px;
		border-top: 1px solid var(--hairline);
	}
	.others .label {
		margin: 0 0 10px;
		font-size: var(--fs-sm);
		color: var(--dim);
	}
	.others .row {
		display: flex;
		gap: 12px;
	}
	.other {
		width: clamp(48px, 12.5cqh, 72px);
		flex-shrink: 0;
	}
	.skip {
		position: absolute;
		right: 0;
		bottom: 0;
		z-index: 50;
		height: 28px;
		padding: 0 8px;
		border: none;
		border-radius: var(--r-sm);
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: var(--fs-xs);
		cursor: pointer;
	}
	.skip:hover {
		background: var(--surface2);
		color: var(--text);
	}
</style>
