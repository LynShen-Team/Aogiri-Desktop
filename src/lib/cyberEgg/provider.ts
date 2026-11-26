// Which conversation is on the 赛博鸡蛋 tokens, and what a pick in the model menu does to it. Kept free of the
// app's stores so the chat, the session store and the model menu share one rule (and tests read it plainly).

/** The provider id the engine reports for a session on the campaign's key and endpoint (route.ts). */
export const EGG_PROVIDER = 'cyber-egg';

/**
 * The round's model a conversation runs on with the campaign's tokens, or null when it is on the account.
 * Picked here (`egg`), or, for a conversation reopened after a restart (`egg` is not saved), as its engine reports
 * it. A draft is on 赛博鸡蛋 only when picked: what it shows before its engine runs is a guess (seeded from the
 * backend's last report) and never puts it there.
 */
export function eggModelOf(s: { egg?: { model: string }; draft?: boolean; chat: { provider: string; model: string } }): string | null {
	if (s.egg) return s.egg.model;
	if (s.draft) return null;
	return s.chat.provider === EGG_PROVIDER ? s.chat.model || EGG_PROVIDER : null;
}

/**
 * What a model-menu pick does: `egg` puts the conversation on the round's model; `leave` first takes it off the
 * campaign (then the pick goes on, once: `left`); `pick` is the ordinary pick.
 */
export function modelPickRoute(command: string, onEgg: boolean, left = false): 'egg' | 'leave' | 'pick' {
	if (command.startsWith('@egg ')) return 'egg';
	if (onEgg && !left && (command.startsWith('/model ') || command.startsWith('@switch '))) return 'leave';
	return 'pick';
}
