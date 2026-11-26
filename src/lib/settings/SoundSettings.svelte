<script lang="ts">
	// Settings → 提示音: the master switch, the volume, and each event's
	// switch with a 试听 button. Self-contained (its own section), so it sits
	// in whichever settings page holds it.
	import SettingsSection from './SettingsSection.svelte';
	import SettingsRow from './SettingsRow.svelte';
	import Switch from '$lib/ui/Switch.svelte';
	import IconButton from '$lib/ui/IconButton.svelte';
	import PlayIcon from 'phosphor-svelte/lib/PlayIcon';
	import { t } from '$lib/i18n';
	import { SOUND_EVENTS, type SoundEventId } from '$lib/sounds/events';
	import { soundSettings } from '$lib/sounds/settings.svelte';
	import { previewSound } from '$lib/sounds/play';
	import { previewEggSound } from '$lib/cyberEgg/card/sound';

	const volume = $derived(Math.round(soundSettings.volume * 100));

	function preview(id: SoundEventId) {
		if (id === 'egg') previewEggSound();
		else previewSound(id);
	}
</script>

<SettingsSection title={t('sounds.title')} id="sounds">
	<SettingsRow id="sounds-master" title={t('sounds.master')} description={t('sounds.masterHint')}>
		<Switch checked={soundSettings.master} label={t('sounds.master')} onChange={(on) => soundSettings.setMaster(on)} />
	</SettingsRow>
	<div class="rest" class:off={!soundSettings.master}>
		<SettingsRow id="sounds-volume" title={t('sounds.volume')}>
			<div class="vol">
				<input
					type="range"
					min="0"
					max="100"
					step="5"
					value={volume}
					disabled={!soundSettings.master}
					aria-label={t('sounds.volume')}
					style:--fill="{volume}%"
					oninput={(e) => soundSettings.setVolume(Number(e.currentTarget.value) / 100)}
					onchange={() => previewSound('done')}
				/>
				<span class="val">{volume}</span>
			</div>
		</SettingsRow>
		{#each SOUND_EVENTS as ev (ev.id)}
			{@const name = t(`sounds.event.${ev.id}`)}
			<SettingsRow
				id="sounds-{ev.id}"
				title={name}
				description={ev.quiet === 'focused' ? t('sounds.quietFocused') : undefined}
			>
				<IconButton size="sm" title="{t('sounds.preview')} · {name}" onclick={() => preview(ev.id)}>
					<PlayIcon size={13} weight="fill" />
				</IconButton>
				<Switch
					checked={soundSettings.enabled(ev.id)}
					label={name}
					disabled={!soundSettings.master}
					onChange={(on) => soundSettings.setEnabled(ev.id, on)}
				/>
			</SettingsRow>
		{/each}
	</div>
</SettingsSection>

<style>
	/* The rows under the master switch keep the section's hairlines. */
	.rest > :global(* + *) {
		border-top: 1px solid var(--hairline);
	}
	.rest.off :global(.title),
	.rest.off :global(.desc) {
		opacity: 0.5;
	}
	.vol {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 240px;
	}
	.vol input {
		flex: 1;
		height: 20px;
		margin: 0;
		background: none;
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
	}
	.vol input:disabled {
		cursor: default;
		opacity: 0.5;
	}
	.vol input::-webkit-slider-runnable-track {
		height: 4px;
		border-radius: var(--r-full);
		background: linear-gradient(to right, var(--accent) var(--fill), var(--surface2) var(--fill));
	}
	.vol input::-webkit-slider-thumb {
		width: 16px;
		height: 16px;
		margin-top: -6px;
		border-radius: var(--r-full);
		background: var(--panel);
		box-shadow:
			0 0 0 1px var(--border-strong),
			var(--shadow-sm);
		-webkit-appearance: none;
		transition: transform var(--t-fast) var(--ease-out);
	}
	.vol input:active::-webkit-slider-thumb {
		transform: scale(1.1);
	}
	.val {
		width: 3ch;
		color: var(--dim);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
</style>
