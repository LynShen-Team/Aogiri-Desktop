import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { setLocale } from '$lib/i18n';

const text = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('the tool card', () => {
	it('names a running command by what the engine started, before its output comes', async () => {
		setLocale('en');
		const { default: ToolCard } = await import('./ToolCard.svelte');
		const props = { name: 'bash', output: 'running 2.0s', running: true, isError: false };
		// Not a bare "Ran": the command the engine named as it started.
		const running = render(ToolCard, { props: { ...props, named: "cat > notes.md <<'EOF'" } }).body;
		expect(text(running)).toContain("cat > notes.md <<'EOF'");
		// Once the output comes, it names the command itself.
		const done = render(ToolCard, {
			props: { ...props, running: false, output: JSON.stringify({ command: 'ls -la', exit_code: 0, stdout: '' }), named: 'something else' }
		}).body;
		expect(text(done)).toContain('ls -la');
		expect(text(done)).not.toContain('something else');
		// Only a command card takes it.
		const read = render(ToolCard, { props: { ...props, name: 'read', named: 'git apply -' } }).body;
		expect(text(read)).not.toContain('git apply');
	});
});
