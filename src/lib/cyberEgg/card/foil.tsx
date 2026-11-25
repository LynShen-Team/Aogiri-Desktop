/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// cyber-egg.spec.md CE-C4: foil. A foil-stamped line is painted with a metal gradient whose highlight
// moves when the card tilts (card3d.tsx moves every gradient marked data-foil). Paper stays matte.
import { ceJsx } from "./jsx";
import type { Metal } from "./tiers";

const STOPS: Record<Metal, Array<[number, string]>> = {
  ink: [[0, "currentColor"], [1, "currentColor"]],
  copper: [[0, "#4f2410"], [0.22, "#8f4a26"], [0.4, "#d9946a"], [0.5, "#ffe2cc"], [0.6, "#c9784a"], [0.8, "#7a3b1b"], [1, "#46200d"]],
  silver: [[0, "#4b5259"], [0.22, "#8b949c"], [0.4, "#d6dde2"], [0.5, "#ffffff"], [0.6, "#b4bcc3"], [0.8, "#6c747b"], [1, "#454b51"]],
  gold: [[0, "#5e4314"], [0.22, "#a27a32"], [0.4, "#e7c777"], [0.5, "#fff3cc"], [0.6, "#d3a851"], [0.8, "#8a6424"], [1, "#56390e"]],
  holo: [[0, "#b9789a"], [0.16, "#c79a68"], [0.32, "#a9a65e"], [0.48, "#64a487"], [0.64, "#5f93b0"], [0.8, "#8a7cbf"], [1, "#b9789a"]],
};

/**
 * A metal gradient in the user space of a `w`×`h` viewBox. `data-foil` tells the card how far to move it
 * (holo moves farther: its colours should run past the eye).
 */
export function FoilGradient({ id, metal, w, h }: { id: string; metal: Metal; w: number; h: number }) {
  const holo = metal === "holo";
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={0}
      y1={0}
      x2={holo ? w * 0.55 : w}
      y2={holo ? h * 0.55 : h}
      spreadMethod={holo ? "repeat" : "reflect"}
      data-foil={`${w} ${h} ${holo ? 1.1 : 0.42}`}
    >
      {STOPS[metal].map(([offset, color]) => (
        <stop key={offset} offset={offset} stopColor={color} />
      ))}
    </linearGradient>
  );
}
