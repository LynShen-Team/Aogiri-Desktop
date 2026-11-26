// The website's own 赛博鸡蛋 pages, for what only the web does: cash-out of a 集齐 reward (it takes the web's step-up;
// gateway CE-API-8 leaves it out) and the ways to earn extra chances (invites, top-ups).
import { openExternal } from '$lib/openExternal';
import { readConfig } from '$lib/protocol';

/** Opens `/dashboard/cyber-egg{path}` on the account's website in the system browser. */
export async function openWebEgg(path = ''): Promise<void> {
	let web = 'https://www.lynshen.org';
	try {
		const cfg = await readConfig();
		web = String(cfg.lynshen_web_url || web).replace(/\/+$/, '');
	} catch {
		/* the default site */
	}
	openExternal(`${web}/dashboard/cyber-egg${path}`);
}
