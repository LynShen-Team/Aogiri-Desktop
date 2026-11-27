// 赛博鸡蛋 · 交易市场: the rules every part of the market shares, as the website's trade.tsx has them (CE-X3..X6):
// which of my copies can be offered, which of them a listing would take, the money on a swap (CE-X5) and how long
// ago something happened.
import { t } from '$lib/i18n';
import type { EggListing, EggMarketRules, EggOwnedCard, EggTopup, Tier } from '../api';
import { yuan } from '../eligibility';

/** Copies that can be offered now: not kept for a set (CE-S3), not swapped in too recently (CE-X3). */
export const tradable = (cards: EggOwnedCard[], now = Date.now()) => cards.filter((card) => !card.locked && !((card.relist_after ?? 0) > now));

/** My copies that a listing would take: the card it names, else any of its tier, else any. */
export const matches = (listing: EggListing, mine: EggOwnedCard[]) =>
	mine.filter((card) => (listing.want_card_id ? card.card_id === listing.want_card_id : !listing.want_tier || card.tier === listing.want_tier));

/** `3 分钟前` */
export function ago(at: number, now = Date.now()): string {
	const minutes = Math.max(1, Math.round((now - at) / 60_000));
	if (minutes < 60) return t('eggMarket.hall.minutesAgo', { n: minutes });
	const hours = Math.round(minutes / 60);
	if (hours < 24) return t('eggMarket.hall.hoursAgo', { n: hours });
	return t('eggMarket.hall.daysAgo', { n: Math.round(hours / 24) });
}

export const tierName = (tier: Tier) => t(`eggMarket.tier.${tier}`);
/** 「任意白银」, or 「任意一张」 without a tier. */
export const anyOf = (tier: Tier | null) => (tier ? t('eggMarket.hall.anyOf', { tier: tierName(tier) }) : t('eggMarket.hall.any'));
/** № 000123 */
export const serialNo = (serial: number) => String(serial).padStart(6, '0');

/** The rules when a gateway sends none: no money on a swap. */
export const NO_TOPUP: EggMarketRules = { topup_enabled: false, topup_max_fen: 0, topup_fee_permille: 0 };

/** CE-X5: what the receiving side gets of a top-up, after the platform's fee. */
export const topupNet = (fen: number, rules: Pick<EggMarketRules, 'topup_fee_permille'>) => fen - Math.round((fen * rules.topup_fee_permille) / 1000);

/** CE-X5: the money a dialog is drafting: none, I pay, or they pay; and how much (yuan, as typed). */
export type TopupDraft = { side: 'none' | 'me' | 'them'; amount: string };
export type TopupProblem = 'amount' | 'max' | 'balance' | null;

/** CE-X5: what a draft asks for, and what is wrong with it. */
export function topupCheck(draft: TopupDraft, rules: EggMarketRules, balance: number): { fen: number; problem: TopupProblem } {
	if (draft.side === 'none') return { fen: 0, problem: null };
	const fen = Math.round(Number(draft.amount) * 100);
	if (!(fen > 0)) return { fen: 0, problem: 'amount' };
	if (fen > rules.topup_max_fen) return { fen, problem: 'max' };
	if (draft.side === 'me' && fen > balance) return { fen, problem: 'balance' };
	return { fen, problem: null };
}

/** CE-X5: the money of a done swap, from my side, for the reveal. */
export function moneyLine(topup: EggTopup | null | undefined, iPay: boolean, rules: EggMarketRules): string | null {
	if (!topup || topup.fen <= 0) return null;
	return iPay ? t('eggMarket.get.paid', { amount: yuan(topup.fen) }) : t('eggMarket.get.gotMoney', { amount: yuan(topup.fen), net: yuan(topupNet(topup.fen, rules)) });
}

/** A swap just done, from my side (CE-X6). */
export interface Deal {
	got: EggOwnedCard[];
	gave: EggOwnedCard[];
	/** The other side's username. */
	from: string;
	/** The money line, already worded from my side (CE-X5), if any. */
	money: string | null;
}
