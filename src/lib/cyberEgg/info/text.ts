// 赛博鸡蛋 · 规则与概率 and 调用: numbers and words as the website writes them (gateway frontend
// `lib/cyber-egg-api.ts` tokenParts / formatTokens, `pages/cyber-egg/use-time.ts` useLeft, `index.tsx` longDate).
import { getLocale, t } from '$lib/i18n';

/** The Intl locale of the UI language. */
export const intlLocale = () => (getLocale() === 'zh' ? 'zh-CN' : 'en-US');

/** `t` with an English singular: `<key>_one` when `count` is 1 and the language has one. */
export function tn(key: string, count: number, params: Record<string, string | number> = {}): string {
	if (count === 1) {
		const one = `${key}_one`;
		const text = t(one, params);
		if (text !== one) return text;
	}
	return t(key, params);
}

/**
 * A token amount in the UI language's short units: `6.38` + `亿` in Chinese, `638` + `M` in English. Hundreds of
 * millions keep two decimals, tens of thousands one below 10 million.
 */
export function tokenParts(value: number, locale = intlLocale()): { number: string; unit: string } {
	const digits = value >= 1e8 ? 2 : value >= 1e7 ? 0 : 1;
	const parts = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: digits }).formatToParts(value);
	const unit = parts.find((part) => part.type === 'compact')?.value ?? '';
	const number = parts
		.filter((part) => part.type !== 'compact' && part.type !== 'literal')
		.map((part) => part.value)
		.join('');
	return { number, unit };
}

/** `5000 万` in Chinese, `50M` in English. */
export function tokens(value: number): string {
	const locale = intlLocale();
	const { number, unit } = tokenParts(value, locale);
	if (!unit) return number;
	return locale.startsWith('zh') ? `${number} ${unit}` : `${number}${unit}`;
}

/** `6 小时 12 分` until `until` (`12 分钟` under an hour). */
export function leftText(until: number, now: number): string {
	const minutes = Math.max(0, Math.round((until - now) / 60_000));
	const hours = Math.floor(minutes / 60);
	return hours > 0 ? t('eggInfo.usage.leftHm', { h: hours, m: minutes % 60 }) : t('eggInfo.usage.leftM', { m: minutes });
}

/** A campaign moment, `11月24日 00:00`, in Beijing time (the round's own clock: its days turn at 00:00 there). */
export function campaignDate(ms: number): string {
	return new Date(ms).toLocaleString(intlLocale(), { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' });
}

/** `14:32`, the computer's clock. */
export function clockText(at: number): string {
	return new Date(at).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });
}
