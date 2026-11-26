<script lang="ts">
	// The working glyph (dotGlyph.ts): a turning sphere of dots that gathers
	// into the 04 林光 mark now and then. Its dots take the text colour of
	// where it sits. Decorative: the words beside it, or its parent's title,
	// say what it means.
	import { dotGlyph } from './dotGlyph';

	let { size = 14 }: { size?: number } = $props();
</script>

<canvas class="glyph" aria-hidden="true" style:width="{size}px" style:height="{size}px" use:dotGlyph={size}></canvas>

<style>
	.glyph {
		display: block;
		flex-shrink: 0;
	}
</style>
