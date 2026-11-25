/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Card 「穿孔卡」 (N): two punched cards on a desk. The front one is punched in Hollerith code with
// "LYNSHEN CYBER EGG 2026"; a reading light passes over its columns.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer } from "../layer";

const INK = "#2f2d29";
const CARD = "#f4ecd6";
const ROWS = ["12", "11", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const COLS = 24;
const TEXT = "LYNSHEN CYBER EGG 2026";

/** The rows punched for one character (Hollerith): letters take a zone row and a digit row. */
function punches(char: string): string[] {
  if (/[0-9]/.test(char)) return [char];
  const code = char.charCodeAt(0) - 65;
  if (code < 0 || code > 25) return [];
  if (code < 9) return ["12", String(code + 1)];
  if (code < 18) return ["11", String(code - 8)];
  return ["0", String(code - 16)];
}

const W = 196;
const H = 88;

function PunchCard({ text, uid, light }: { text: string; uid: string; light?: boolean }) {
  const layout = useMemo(() => {
    const left = 10;
    const top = 17;
    const colW = (W - left - 8) / COLS;
    const rowH = (H - top - 6) / ROWS.length;
    const holes: Array<[number, number]> = [];
    [...text.padEnd(COLS, " ")].slice(0, COLS).forEach((char, col) => {
      for (const row of punches(char)) holes.push([left + col * colW + colW * 0.22, top + ROWS.indexOf(row) * rowH + rowH * 0.12]);
    });
    const digits = ROWS.slice(2).map((row, index) => ({ y: top + (index + 2) * rowH + rowH * 0.78, text: row.repeat(COLS) }));
    return { left, top, colW, rowH, holes, digits };
  }, [text]);
  const outline = `M10 0H${W}V${H}H0V10Z`;
  return (
    <g>
      <clipPath id={`${uid}-pc`}>
        <path d={outline} />
      </clipPath>
      <path d={outline} fill={CARD} stroke={INK} strokeWidth={0.5} />
      <text x={layout.left} y={10} fontFamily="Georgia, 'Times New Roman', serif" fontSize={5} letterSpacing={0.6} fill={INK}>
        {text}
      </text>
      <text x={W - 6} y={10} textAnchor="end" fontFamily="Georgia, serif" fontSize={3.6} letterSpacing={0.4} fill="#9a4b33">
        LYNSHEN · 赛博鸡蛋
      </text>
      {layout.digits.map((row) => (
        <text
          key={row.y}
          x={layout.left}
          y={row.y}
          fontFamily="'SF Mono', Menlo, Consolas, monospace"
          fontSize={layout.rowH * 0.7}
          textLength={layout.colW * COLS - layout.colW * 0.4}
          lengthAdjust="spacing"
          fill="#9a4b33"
          opacity={0.55}
        >
          {row.text}
        </text>
      ))}
      {layout.holes.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={layout.colW * 0.56} height={layout.rowH * 0.76} rx={0.4} fill="#26231f" />
      ))}
      {light ? (
        <g clipPath={`url(#${uid}-pc)`}>
          <rect className="ce-anim ce-scan" x={-30} y={0} width={30} height={H} fill={`url(#${uid}-scan)`} />
        </g>
      ) : null}
    </g>
  );
}

export const PunchCardArt = memo(function PunchCardArt({ uid }: ArtProps) {
  return (
    <>
      <Layer depth={-1.2}>
        <defs>
          <radialGradient id={`${uid}-desk`} cx="0.4" cy="0.35" r="0.9">
            <stop offset="0" stopColor="#efe8d9" />
            <stop offset="1" stopColor="#d9cfbb" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-desk)`} />
        {/* The card under: turned, cast a hatched shadow. */}
        <g transform="translate(40 34) rotate(-8)">
          <rect x={5} y={6} width={W} height={H} fill="#2f2d29" opacity={0.12} />
          <PunchCard text="0123456789 ABCDEFGHIJ" uid={`${uid}-u`} />
        </g>
      </Layer>
      <Layer depth={1.1} cast>
        <defs>
          <linearGradient id={`${uid}-scan`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffd9a0" stopOpacity="0" />
            <stop offset="0.55" stopColor="#ffd9a0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform="translate(26 132) rotate(4)">
          <rect x={6} y={8} width={W} height={H} fill="#2f2d29" opacity={0.18} />
          <PunchCard text={TEXT} uid={`${uid}-f`} light />
        </g>
        <text x={AW - 20} y={AH - 20} textAnchor="end" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontSize={7} fill={INK} opacity={0.7}>
          80 columns, 1928
        </text>
      </Layer>
    </>
  );
});
