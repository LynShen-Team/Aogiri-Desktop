// The navigator's expanded / collapsed state. Collapsed, it is a narrow rail:
// the logo, the primary nav as icons and the account avatar.

/** Width of the collapsed navigator (the icon rail, design.md "Navigator").
 *  Its items centre on 24px. */
export const SIDEBAR_RAIL_WIDTH = 48;

/** The expanded navigator's width before the user drags it (240–460px). */
export const SIDEBAR_DEFAULT_WIDTH = 272;

const KEY = 'lynshen-sidebar-collapsed';
/** Before the rail, ⌘B hid the navigator completely ('0' = hidden). */
const LEGACY_KEY = 'lynshen-sidebar-visible';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Whether the navigator starts collapsed. A navigator hidden under the old
 *  key comes back as the rail; the old key is then dropped. */
export function readSidebarCollapsed(store: Store): boolean {
	const saved = store.getItem(KEY);
	if (saved === '1' || saved === '0') return saved === '1';
	const legacy = store.getItem(LEGACY_KEY);
	if (legacy === null) return false;
	const collapsed = legacy === '0';
	store.setItem(KEY, collapsed ? '1' : '0');
	store.removeItem(LEGACY_KEY);
	return collapsed;
}

export function writeSidebarCollapsed(store: Store, collapsed: boolean): void {
	store.setItem(KEY, collapsed ? '1' : '0');
}

/** The expanded navigator's narrowest and widest widths (dragged). */
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 460;
/** Dragged narrower than this, the navigator snaps to the rail. */
export const SIDEBAR_SNAP_WIDTH = 160;

/** Where a drag of the navigator's edge to `width` leaves it: the rail
 *  below SIDEBAR_SNAP_WIDTH, else that width within its bounds. */
export function sidebarSnap(width: number): number | 'rail' {
	if (width < SIDEBAR_SNAP_WIDTH) return 'rail';
	return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}
