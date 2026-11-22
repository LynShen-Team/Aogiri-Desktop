// The model a new Claude Code conversation shows before its first message,
// when the user picked none, and starts on (`--model`): what the draft
// shows is what runs.
//
// A draft is seeded from what the backend last reported (backendProfile.ts),
// which may have been in another provider mode: the LynShen gateway, one of
// the tool's custom providers, or the tool's own login or config. A model
// is shown again only when it was reported in the draft's mode and that
// mode still offers it; otherwise the draft shows the mode's default (the
// model a session of that mode runs when it names none), or nothing when
// that is not known yet, and then names no model, so the engine reports
// the one it runs.

import type { ModelOption } from './chat.svelte';

/** A provider mode: `lynshen`, `custom:<provider id>` or `system`. */
export function toolModeKey(gateway: boolean | undefined, customProvider: string | undefined): string {
	if (gateway) return 'lynshen';
	return customProvider ? `custom:${customProvider}` : 'system';
}

export interface ShownModel {
	model: string;
	label: string;
}

/** Whether Claude Code's catalog lists `model`, by its alias or the id it
 *  resolves to. */
export function catalogOffers(catalog: ModelOption[] | undefined, model: string): boolean {
	return !!model && (catalog ?? []).some((m) => m.model === model || m.vendor === model);
}

export function draftModel(input: {
	/** The model the backend last reported, and the mode it ran in. */
	remembered?: ShownModel;
	rememberedMode?: string;
	/** The draft's mode; undefined while it is not known. */
	mode: string | undefined;
	/** Whether the draft's mode offers a model. */
	offers: (model: string) => boolean;
	/** The draft mode's default, when known. */
	fallback?: ShownModel;
}): ShownModel {
	const { remembered, rememberedMode, mode, offers, fallback } = input;
	if (mode === undefined) return { model: '', label: '' };
	if (remembered?.model && rememberedMode === mode && offers(remembered.model)) return remembered;
	return fallback?.model ? fallback : { model: '', label: '' };
}
