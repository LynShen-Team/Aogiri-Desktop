<script lang="ts">
	// A card face, still and small (the website's Thumb in trade.tsx).
	import Card3D from '../Card3D.svelte';
	import type { ArtCard } from '../art';

	let { def, dim = false }: { def: ArtCard; dim?: boolean } = $props();
</script>

<div class="thumb">
	<Card3D card={def} period={def.period} packName="" interactive={false} live={false} class={dim ? 'ce-card-dim' : ''} />
</div>

<style>
	.thumb {
		min-width: 0;
	}
</style>
