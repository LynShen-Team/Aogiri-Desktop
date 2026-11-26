import { describe, expect, it } from 'vitest';
import { EGG_PROVIDER, eggModelOf, modelPickRoute } from './provider';

const chat = (provider = '', model = '') => ({ provider, model });

describe('which conversation is on 赛博鸡蛋', () => {
	it('a pick puts it there, a draft or open conversation alike', () => {
		expect(eggModelOf({ egg: { model: 'gpt-6.2-astra' }, draft: true, chat: chat() })).toBe('gpt-6.2-astra');
		expect(eggModelOf({ egg: { model: 'deepseek-v4.1-flash' }, chat: chat('monoize') })).toBe('deepseek-v4.1-flash');
	});
	it('a conversation reopened after a restart is there by the provider its engine reports', () => {
		expect(eggModelOf({ chat: chat(EGG_PROVIDER, 'gpt-6.2-astra') })).toBe('gpt-6.2-astra');
		expect(eggModelOf({ chat: chat('monoize', 'gpt-6.2-sol') })).toBeNull();
	});
	it('a draft is never there by what it was seeded with (ticket #86)', () => {
		expect(eggModelOf({ draft: true, chat: chat(EGG_PROVIDER, 'gpt-6.2-astra') })).toBeNull();
	});
});

describe('what a model-menu pick does', () => {
	// Every row of the menu picks with one of these: a favourite, a recent model and a row of 全部模型 are
	// `/model <id> [effort]`; a model of another provider is `@switch <provider> <model>`; a 赛博鸡蛋 row is `@egg`.
	const rows = ['/model gpt-6.2-sol', '/model claude-haiku-5-5 high', '@switch openai gpt-5'];

	it('on the account: a 赛博鸡蛋 row puts the conversation there, any other row is an ordinary pick', () => {
		expect(modelPickRoute('@egg gpt-6.2-astra', false)).toBe('egg');
		for (const row of rows) expect(modelPickRoute(row, false), row).toBe('pick');
	});
	it('on 赛博鸡蛋: another round model stays there; a model of the account leaves it first', () => {
		expect(modelPickRoute('@egg deepseek-v4.1-flash', true)).toBe('egg');
		for (const row of rows) expect(modelPickRoute(row, true), row).toBe('leave');
	});
	it('after leaving, the same pick goes through once, even while the engine still reports the campaign', () => {
		for (const row of rows) expect(modelPickRoute(row, true, true), row).toBe('pick');
	});
	it('a pick can never loop: with nothing changed by leaving it ends in two steps (the window froze, ticket #86)', () => {
		for (const row of rows) {
			const steps: string[] = [];
			const select = (picked: string, left = false) => {
				const way = modelPickRoute(picked, true, left);
				steps.push(way);
				if (steps.length > 5) throw new Error('loop');
				if (way === 'leave') select(picked, true);
			};
			select(row);
			expect(steps, row).toEqual(['leave', 'pick']);
		}
	});
	it('other menu commands are untouched', () => {
		expect(modelPickRoute('@tool lynshen gpt-6.2-sol', true)).toBe('pick');
		expect(modelPickRoute('/effort high', true)).toBe('pick');
	});
});
