// The time a turn has worked, as WorkingIndicator.svelte shows it after
// 工作中: whole seconds, then minutes and seconds, then hours and minutes
// (「41 秒」「1 分 05 秒」「1 时 02 分」; "41s", "1m 05s", "1h 02m").
import { t } from '$lib/i18n';

const pad = (n: number) => String(n).padStart(2, '0');

export function workingElapsed(ms: number): string {
	const s = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
	if (s < 60) return t('chat.working.sec', { s });
	if (s < 3600) return t('chat.working.min', { m: Math.floor(s / 60), s: pad(s % 60) });
	return t('chat.working.hour', { h: Math.floor(s / 3600), m: pad(Math.floor(s / 60) % 60) });
}
