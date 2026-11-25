<script lang="ts">
	// cyber-egg.spec.md CE-R2: the sealed pack of the day, a foil pouch with thickness, crimped seals and a
	// glint, torn by the player's own hand (the gateway's pack.tsx). The physics live in card/pack-engine.ts:
	// fingers grip only at an edge, the tear runs only while the strip is pulled taut, a tear let go stays,
	// the body tears ragged, the crinkle follows the tear's speed.
	import { createPack, type TearHint } from './card/pack-engine';
	import { wrapperUrl } from './card/pack-art';
	import { packLook, ROMAN } from './card/tiers';
	import { t } from '$lib/i18n';

	let {
		period,
		packName,
		disabled = false,
		label,
		tearSignal = 0,
		onTorn,
		onHint
	}: {
		period: number;
		packName: string;
		disabled?: boolean;
		label: string;
		/** Bump to tear it open by itself. */
		tearSignal?: number;
		onTorn: () => void;
		onHint?: (hint: TearHint) => void;
	} = $props();

	let root = $state<HTMLDivElement>();
	let tilt = $state<HTMLDivElement>();
	let skin = $state<HTMLDivElement>();
	let back = $state<HTMLDivElement>();
	let rim = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();
	let light = $state<HTMLCanvasElement>();
	let done = $state(false);
	let engine: ReturnType<typeof createPack> | null = null;
	// What the engine reads live.
	const live = {
		period: 0,
		disabled: false,
		onTorn: () => onTorn(),
		onOpen: () => (done = true),
		onHint: (hint: TearHint) => onHint?.(hint)
	};
	const wrapper = $derived(wrapperUrl(period));
	const look = $derived(packLook(period));

	$effect(() => {
		if (!root || !tilt || !skin || !back || !rim || !canvas || !light) return;
		live.period = period;
		const made = createPack({ root, tilt, skin, back, rim, canvas, light }, live);
		engine = made;
		return () => {
			made.destroy();
			engine = null;
		};
	});
	$effect(() => {
		live.disabled = disabled;
		engine?.sync();
	});
	$effect(() => {
		if (tearSignal > 0) engine?.tearAll();
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			engine?.tearAll();
		}
	}
</script>

<div bind:this={root} class="ce-pack" class:ce-pack-open={done} style:--pack-ground={look.back.ground} style:--pack-accent={look.back.accent}>
	<div class="ce-pack-shadow" aria-hidden="true"></div>
	<div bind:this={tilt} class="ce-pack-tilt">
		<div bind:this={rim} class="ce-pack-rim" aria-hidden="true"></div>
		<div bind:this={back} class="ce-pack-back" style:background-image="url({wrapper})" aria-hidden="true"></div>
		<div bind:this={skin} class="ce-pack-skin" style:background-image="url({wrapper})">
			<div class="ce-pack-print">
				<span class="ce-pack-kicker">{t('egg.pack.kicker', { n: ROMAN[period] ?? period })}</span>
				<span class="ce-pack-title">{packName}</span>
				<span class="ce-pack-sub">{t('egg.pack.sub')}</span>
			</div>
			<span class="ce-pack-notch" data-side="right"></span>
			<span class="ce-pack-notch" data-side="left"></span>
			<div class="ce-pack-glint" aria-hidden="true"></div>
		</div>
		<canvas bind:this={light} class="ce-pack-light" aria-hidden="true"></canvas>
		<canvas bind:this={canvas} class="ce-pack-ribbon" aria-hidden="true"></canvas>
	</div>
	<button
		type="button"
		class="ce-pack-hit"
		aria-label={label}
		disabled={disabled || done}
		onpointerdown={(e) => engine?.down(e)}
		onpointermove={(e) => engine?.move(e)}
		onpointerup={() => engine?.up()}
		onpointercancel={() => engine?.up()}
		onlostpointercapture={() => engine?.up()}
		{onkeydown}
	></button>
</div>
