<script lang="ts">
	// The working glyph (dotGlyph.ts): dots whose motion says what the work
	// is doing (`mode`). They take the text colour of where the glyph sits.
	// Decorative: the words beside it, or its parent's title, say what it
	// means.
	import { dotGlyph, type GlyphMode } from './dotGlyph';

	let { size = 14, mode = 'think' }: { size?: number; mode?: GlyphMode } = $props();
</script>

<canvas class="glyph" aria-hidden="true" data-mode={mode} style:width="{size}px" style:height="{size}px" use:dotGlyph={{ size, mode }}></canvas>

<style>
	.glyph {
		display: block;
		flex-shrink: 0;
	}
</style>
