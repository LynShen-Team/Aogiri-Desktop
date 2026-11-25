// 赛博鸡蛋 numbers as the pages write them: tokens in 万 (「3,044 万」), the time left until the day's
// tokens lapse (「5 小时 12 分」).

/** Tokens in 万, whole and grouped: 30_440_000 → "3,044". Under 1 万 shows one decimal ("0.8"). */
export function wan(tokens: number): string {
	const value = Math.max(0, tokens) / 10_000;
	if (value > 0 && value < 1) return (Math.floor(value * 10) / 10).toFixed(1);
	return Math.floor(value).toLocaleString('en-US');
}

/** A request's tokens, short: 182_400 → "182.4k", 1_204_000 → "1.2M". */
export function shortTokens(tokens: number): string {
	if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
	if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
	return String(Math.max(0, Math.round(tokens)));
}

/** Hours and minutes left until `at` ({h, m}); null once it has passed. */
export function left(at: number, now = Date.now()): { h: number; m: number } | null {
	const ms = at - now;
	if (ms <= 0) return null;
	const minutes = Math.ceil(ms / 60_000);
	return { h: Math.floor(minutes / 60), m: minutes % 60 };
}

/** The share of today's tokens used, 0–1 (0 when nothing was drawn). */
export function usedShare(granted: number, used: number): number {
	if (granted <= 0) return 0;
	return Math.max(0, Math.min(1, used / granted));
}

/** `HH:MM` in the computer's time zone. */
export function clock(at: number): string {
	const d = new Date(at);
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
