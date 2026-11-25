// A small JSX runtime for the 赛博鸡蛋 card art, so the gateway's card modules (geometry, artworks, frame,
// back) run here unchanged and without React. The art is drawn once into real DOM (SVG in its namespace)
// and then only moved by CSS and by the art clock; nothing re-renders, so there is no diffing.
//
// - `ceJsx` builds a tree of plain nodes; a function component is called at once with its props.
// - `mountArt` turns a tree into DOM under a parent, binds `ref`s and then runs the effects the
//   components asked for (`useEffect`, the art clock), returning a function that undoes them.
// - `memo`, `useMemo`, `useRef`, `useCallback` and `useEffect` keep the React call shapes the
//   copied modules use: one render, so a memo is the value and an effect runs once after mount.

/** Something a component can return or take as children. */
export type Child = VNode | string | number | boolean | null | undefined | Child[];
export type ReactNode = Child;
export type CSSProperties = Record<string, string | number | undefined>;
export type RefObject<T> = { current: T | null };

export interface VNode {
	readonly tag: string;
	readonly props: Record<string, unknown>;
	readonly children: Child[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each component types its own props
export type Component<P = any> = (props: P) => Child;

type Effect = () => void | (() => void);
let collecting: Effect[] | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the JSX factory takes any component
export function ceJsx(tag: string | Component<any>, props: Record<string, unknown> | null, ...children: Child[]): Child {
	if (typeof tag === 'function') {
		const all = props ? { ...props } : {};
		if (children.length) all.children = children.length === 1 ? children[0] : children;
		return tag(all);
	}
	return { tag, props: props ?? {}, children };
}

export function CeFragment(props: { children?: Child }): Child {
	return props.children;
}

// The JSX types for files that use `ceJsx` as their factory (`/** @jsx ceJsx */`; not `h`, which
// the copied modules use for heights).
// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace ceJsx {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace JSX {
		type Element = Child;
		interface IntrinsicElements {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SVG and HTML attributes are passed through
			[tag: string]: any;
		}
		interface IntrinsicAttributes {
			key?: string | number;
		}
		interface ElementChildrenAttribute {
			children: unknown;
		}
	}
}

export const memo = <T>(component: T): T => component;
export const useMemo = <T>(make: () => T, _deps?: unknown[]): T => make();
export const useCallback = <T>(fn: T, _deps?: unknown[]): T => fn;
export function useRef<T>(initial: T): { current: T };
export function useRef<T>(initial: T | null): RefObject<T>;
export function useRef<T>(initial: T | null): RefObject<T> {
	return { current: initial };
}
export function useEffect(effect: Effect, _deps?: unknown[]) {
	collecting?.push(effect);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
/** SVG attributes spelt in camelCase; every other camelCase prop on an SVG element is a kebab-case attribute. */
const SVG_CAMEL = new Set([
	'viewBox',
	'preserveAspectRatio',
	'gradientUnits',
	'gradientTransform',
	'patternUnits',
	'patternContentUnits',
	'patternTransform',
	'spreadMethod',
	'pathLength',
	'textLength',
	'lengthAdjust',
	'stdDeviation',
	'baseFrequency',
	'numOctaves',
	'filterUnits',
	'primitiveUnits',
	'maskUnits',
	'maskContentUnits',
	'clipPathUnits',
	'markerWidth',
	'markerHeight',
	'markerUnits',
	'refX',
	'refY',
	'startOffset',
	'tableValues',
	'stitchTiles',
	'kernelMatrix',
	'surfaceScale',
	'specularExponent',
	'specularConstant',
	'diffuseConstant',
	'xChannelSelector',
	'yChannelSelector',
	'keyTimes',
	'keySplines',
	'keyPoints',
	'calcMode',
	'repeatCount',
	'attributeName'
]);
/** Style properties React leaves without a unit. */
const UNITLESS = new Set(['opacity', 'zIndex', 'flex', 'flexGrow', 'flexShrink', 'fontWeight', 'lineHeight', 'order', 'zoom', 'scale']);

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function setStyle(el: HTMLElement | SVGElement, style: CSSProperties) {
	for (const [key, value] of Object.entries(style)) {
		if (value === undefined || value === null || value === '') continue;
		if (key.startsWith('--')) el.style.setProperty(key, String(value));
		else el.style.setProperty(kebab(key), typeof value === 'number' && !UNITLESS.has(key) ? `${value}px` : String(value));
	}
}

function setProp(el: Element, name: string, value: unknown, svg: boolean) {
	if (name === 'children' || name === 'key' || value === undefined || value === null || value === false) {
		if (value === false && (name === 'draggable' || name.startsWith('aria-'))) el.setAttribute(name, 'false');
		return;
	}
	if (name === 'ref') {
		if (typeof value === 'function') value(el);
		else (value as RefObject<Element>).current = el;
		return;
	}
	if (name === 'className') return el.setAttribute('class', String(value));
	if (name === 'style') return setStyle(el as HTMLElement, value as CSSProperties);
	if (name.startsWith('on') && typeof value === 'function') {
		el.addEventListener(name.slice(2).toLowerCase(), value as EventListener);
		return;
	}
	if (name === 'xlinkHref') return el.setAttributeNS(XLINK_NS, 'xlink:href', String(value));
	const attr = svg && !SVG_CAMEL.has(name) && !name.includes('-') ? kebab(name) : name === 'htmlFor' ? 'for' : name;
	el.setAttribute(attr, value === true ? '' : String(value));
}

function build(child: Child, svg: boolean, out: Node[]) {
	if (child === null || child === undefined || child === false || child === true) return;
	if (Array.isArray(child)) {
		for (const c of child) build(c, svg, out);
		return;
	}
	if (typeof child === 'string' || typeof child === 'number') {
		out.push(document.createTextNode(String(child)));
		return;
	}
	const inSvg = svg || child.tag === 'svg';
	const el = inSvg ? document.createElementNS(SVG_NS, child.tag) : document.createElement(child.tag);
	const refs: Array<[string, unknown]> = [];
	for (const [name, value] of Object.entries(child.props)) {
		if (name === 'ref') refs.push([name, value]);
		else setProp(el, name, value, inSvg);
	}
	const kids: Node[] = [];
	const childSvg = inSvg && child.tag !== 'foreignObject';
	for (const c of child.children) build(c, childSvg, kids);
	for (const node of kids) el.appendChild(node);
	for (const [name, value] of refs) setProp(el, name, value, inSvg);
	out.push(el);
}

/**
 * Draws `render()` into `parent` (appended after what is there) and runs the effects its components
 * asked for. Returns the cleanup: undoes the effects and removes the nodes.
 */
export function mountArt(parent: Element, render: () => Child): () => void {
	const effects: Effect[] = [];
	const outer = collecting;
	collecting = effects;
	let tree: Child;
	try {
		tree = render();
	} finally {
		collecting = outer;
	}
	const nodes: Node[] = [];
	build(tree, parent instanceof SVGElement, nodes);
	for (const node of nodes) parent.appendChild(node);
	const cleanups = effects.map((effect) => effect()).filter((c): c is () => void => typeof c === 'function');
	return () => {
		for (const cleanup of cleanups) cleanup();
		for (const node of nodes) node.parentNode?.removeChild(node);
	};
}
