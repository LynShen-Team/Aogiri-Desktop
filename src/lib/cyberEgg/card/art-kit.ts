// cyber-egg.spec.md CE-C3: what every artwork is made of. A picture is a stack of depth planes (Layer),
// each an SVG in the window's own units (252 × 278), moved against the others when the card tilts.
import { useEffect, useRef, type RefObject } from "./jsx";

export const AW = 252;
export const AH = 278;

export interface ArtProps {
  /** `url(#…)` of this card's foil gradient (in window units). */
  foil: string;
  /** A unique id prefix for ids inside the picture. */
  uid: string;
  /** Whether the picture should move (paused in grids and when off screen). */
  live: boolean;
  /** The card's pack. */
  period?: number;
  /** CE-S1: the 典藏 card of a completed pack draws its ten cards; they come in here. */
  set?: SetInfo;
}

/** CE-S1: what the 典藏 card shows of its pack. */
export interface SetInfo {
  packName: string;
  names: string[];
  tiers: string[];
}

/** How far past the window a plane reaches (each side), so tilting never shows its edge. */
export const BLEED = 0.05;
export const VIEW = `${-AW * BLEED} ${-AH * BLEED} ${AW * (1 + 2 * BLEED)} ${AH * (1 + 2 * BLEED)}`;
/** A rectangle that fills a plane to its bleed (for backgrounds). */
export const FULL = { x: -AW * BLEED, y: -AH * BLEED, width: AW * (1 + 2 * BLEED), height: AH * (1 + 2 * BLEED) };

export const r1 = (value: number) => Math.round(value * 10) / 10;

/**
 * A frame clock for pictures drawn by script (CE-C6): calls `draw(seconds)` once at mount, then every frame
 * while `live`, the element is on screen and the page is visible. Reduced motion draws one still frame.
 */
export function useArtClock(live: boolean, draw: (seconds: number) => void, target: RefObject<Element | null>) {
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });
  useEffect(() => {
    drawRef.current(0);
    if (!live) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let visible = true;
    let elapsed = 0;
    let last = 0;
    const tick = (now: number) => {
      if (last) elapsed += Math.min(0.1, (now - last) / 1000);
      last = now;
      drawRef.current(elapsed);
      raf = requestAnimationFrame(tick);
    };
    const update = () => {
      const run = visible && !document.hidden;
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      update();
    });
    if (observer && target.current) observer.observe(target.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [live, target]);
}
