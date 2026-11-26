// A conversation on the 赛博鸡蛋 tokens: the LynShen engine runs that one session against the campaign
// endpoint (`/new/v1`) with the campaign key, on one of the round's models, while every other
// conversation keeps the account's provider. The daemon takes it as the `provider` option of
// `session_create` (feature `session_provider`) and keeps it with the session.
import { engineHas } from '$lib/engineVersion.svelte';
import { t } from '$lib/i18n';
import { egg } from './store.svelte';
import { EGG_PROVIDER } from './provider';

/** The provider id the engine reports for such a session (provider.ts). */
export { EGG_PROVIDER };

/** The daemon can run one session on its own provider. */
export const eggRoutable = () => engineHas('session_provider');

export interface EggProvider {
	id: string;
	name: string;
	base_url: string;
	protocol: 'chat';
	api_key: string;
	models: { name: string }[];
	model: string;
}

/** The provider option for a conversation on `model`; fails when the key is not at hand. */
export async function eggProvider(model: string): Promise<EggProvider> {
	if (!egg.me?.campaign) await egg.refresh();
	const me = egg.me;
	if (!me?.campaign) throw new Error(t('egg.noRound'));
	const key = await egg.keySecret();
	if (!key) throw new Error(t('egg.key.noSecret'));
	return {
		id: EGG_PROVIDER,
		name: t('egg.title'),
		base_url: me.api_base_url,
		protocol: 'chat',
		api_key: key,
		models: me.campaign.models.map((name) => ({ name })),
		model
	};
}

/** The model menu's command for an egg row, and its parse. */
export const eggCommand = (model: string) => `@egg ${model}`;
export function parseEggCommand(command: string): string | null {
	return command.startsWith('@egg ') ? command.slice('@egg '.length).trim() || null : null;
}
