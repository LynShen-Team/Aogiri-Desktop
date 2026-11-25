/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// cyber-egg.spec.md CE-C3: the depth planes a picture is made of, and a spinning group.
import { ceJsx, type CSSProperties, type ReactNode } from "./jsx";
import { VIEW } from "./art-kit";

/**
 * One depth plane (CE-C4). `depth` < 0 sinks behind the card's surface (seen through the window, the frame
 * in front of it); > 0 stands out in front of the frame and may reach over it. `cast` drops a soft shadow
 * on the planes behind, as the layers of a paper-cut box do.
 */
export function Layer({ depth, children, className, style, cast, clip }: { depth: number; children: ReactNode; className?: string; style?: CSSProperties; cast?: boolean; clip?: boolean }) {
  return (
    <div className={className ? `ce-plane ${className}` : "ce-plane"} data-pop={depth > 0 ? "" : undefined} data-cast={cast ? "" : undefined} data-clip={clip ? "" : undefined} style={{ ...style, ["--d" as string]: depth }}>
      <svg viewBox={VIEW} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

/** A spinning group about its own origin (CSS, paused with the card's picture). */
export function Spin({ x, y, seconds, reverse, phase = 0, children }: { x: number; y: number; seconds: number; reverse?: boolean; phase?: number; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`rotate(${phase})`}>
        <g className="ce-spin" style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}>
          {children}
        </g>
      </g>
    </g>
  );
}

