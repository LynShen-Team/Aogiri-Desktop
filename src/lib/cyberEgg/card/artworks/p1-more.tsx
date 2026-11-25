/** @jsxRuntime classic */
/** @jsx ceJsx */
/** @jsxFrag CeFragment */
// Pack 1 「机器之心」, the five cards added 2026-11-24 (owner: 每期 15 张，普通卡更多，UR 只有 2 张): four 素纸 and one
// 赤铜, drawn like the rest of the pack as patent plates and engravings on paper, each with its own motion.
//   打字机 (N): the typebars fanned round the printing point; one swings up and strikes, a line types itself.
//   真空管 (N): a triode in section; the filament glows and flickers inside the glass.
//   磁带 (N): a reel-to-reel deck; the reels turn at their own speeds, the meter needle moves, REC blinks.
//   图灵机 (N): a tape of symbols under a head; the tape steps along one cell at a time.
//   晶圆 (R): a silicon wafer of dies under a sheen of thin-film colour; one die is lifted out, enlarged.
import { ceJsx, CeFragment, memo, useMemo } from "../jsx";
import { polyline, seeded, type Pt } from "../geometry";
import { AH, AW, FULL, type ArtProps } from "../art-kit";
import { Layer, Spin } from "../layer";

const INK = "#2f2d29";
const PAPER = "#ece5d6";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', Courier, monospace";

const f1 = (value: number) => value.toFixed(1);
const circle = (cx: number, cy: number, r: number) => `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;

function Desk({ uid, tone = "#efe8d9", edge = "#d9cfbb" }: { uid: string; tone?: string; edge?: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-desk`} cx="0.45" cy="0.35" r="0.9">
          <stop offset="0" stopColor={tone} />
          <stop offset="1" stopColor={edge} />
        </radialGradient>
        <pattern id={`${uid}-grid`} width={12} height={12} patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="#9a8f78" strokeWidth={0.25} opacity={0.5} />
        </pattern>
      </defs>
      <rect {...FULL} fill={`url(#${uid}-desk)`} />
    </>
  );
}

function Hatch({ id, angle = 45, gap = 1.6 }: { id: string; angle?: number; gap?: number }) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
      <path d={`M0 0V${gap}`} stroke={INK} strokeWidth={0.4} />
    </pattern>
  );
}

function Caption({ children, x = AW - 20, anchor = "end" }: { children: string; x?: number; anchor?: "start" | "end" }) {
  return (
    <text x={x} y={AH - 20} textAnchor={anchor} fontFamily={SERIF} fontStyle="italic" fontSize={7} fill={INK} opacity={0.7}>
      {children}
    </text>
  );
}

// ——— N 打字机 ———
const TW_P: Pt = [126, 128];
export const TypewriterArt = memo(function TypewriterArt({ uid }: ArtProps) {
  const fan = useMemo(() => {
    let bars = "";
    let slugs = "";
    for (let k = 0; k < 34; k += 1) {
      const a = (Math.PI * (18 + (k / 33) * 144)) / 180;
      const x0 = TW_P[0] + Math.cos(a) * 46;
      const y0 = TW_P[1] + Math.sin(a) * 46;
      const x1 = TW_P[0] + Math.cos(a) * 98;
      const y1 = TW_P[1] + Math.sin(a) * 98;
      bars += `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`;
      slugs += `M${f1(x0 - Math.sin(a) * 1.6)} ${f1(y0 + Math.cos(a) * 1.6)}L${f1(x0 + Math.cos(a) * 5 - Math.sin(a) * 1.6)} ${f1(y0 + Math.sin(a) * 5 + Math.cos(a) * 1.6)}`;
    }
    return { bars, slugs };
  }, []);
  const keys = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  return (
    <>
      <Layer depth={-1.2}>
        <Desk uid={uid} />
        <Caption x={20} anchor="start">Sholes &amp; Glidden, 1868</Caption>
      </Layer>
      <Layer depth={0.3} cast>
        {/* The sheet in the machine, a line typing itself. */}
        <g transform="translate(56 18) rotate(-1.5)">
          <rect x={0} y={0} width={140} height={98} fill="#fbf7ec" stroke={INK} strokeWidth={0.4} />
          <text x={12} y={22} fontFamily={MONO} fontSize={8.6} fill="#2a2620">
            Dear machine,
          </text>
          <text x={12} y={38} fontFamily={MONO} fontSize={8.6} fill="#2a2620">
            please learn
          </text>
          <clipPath id={`${uid}-typed`}>
            <rect x={12} y={46} width={96} height={12} className="ce-anim ce-type" />
          </clipPath>
          <text x={12} y={54} fontFamily={MONO} fontSize={8.6} fill="#2a2620" clipPath={`url(#${uid}-typed)`}>
            to think.
          </text>
          <path d="M0 98H140" stroke={INK} strokeWidth={0.4} />
        </g>
        {/* Platen and ribbon guide. */}
        <rect x={34} y={112} width={184} height={12} rx={6} fill="#3b3732" />
        <rect x={34} y={112} width={184} height={4} rx={2} fill="#5d5750" />
        <rect x={116} y={120} width={20} height={8} rx={1} fill="#8f2f24" opacity={0.85} />
      </Layer>
      <Layer depth={0.8} cast>
        <defs>
          <Hatch id={`${uid}-h`} />
        </defs>
        {/* The typebars fanned round the printing point, the segment that holds them. */}
        <path d={fan.bars} stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
        <path d={fan.slugs} stroke={INK} strokeWidth={3} />
        <path d={`M${TW_P[0] - 104} ${TW_P[1] + 34}A108 108 0 0 0 ${TW_P[0] + 104} ${TW_P[1] + 34}`} fill="none" stroke={INK} strokeWidth={6} />
        <path d={`M${TW_P[0] - 104} ${TW_P[1] + 34}A108 108 0 0 0 ${TW_P[0] + 104} ${TW_P[1] + 34}`} fill="none" stroke={PAPER} strokeWidth={3.4} />
        <path d={`M${TW_P[0] - 104} ${TW_P[1] + 34}A108 108 0 0 0 ${TW_P[0] + 104} ${TW_P[1] + 34}`} fill="none" stroke={`url(#${uid}-h)`} strokeWidth={3.4} />
        {/* One bar swings up from its place in the fan and strikes the platen. */}
        <g transform={`translate(${TW_P[0]} ${TW_P[1] + 98})`}>
          <g className="ce-anim ce-strike">
            <path d="M0 0V-92" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
            <path d="M-2 -92h4v-6h-4Z" fill={INK} />
          </g>
        </g>
        {/* Three rows of round keys. */}
        {keys.map((row, r) =>
          row.split("").map((ch, k) => {
            const x = 126 - ((row.length - 1) * 19) / 2 + k * 19 + r * 4;
            const y = 238 + r * 17;
            return (
              <g key={`${r}-${ch}`}>
                <circle cx={x} cy={y + 1.5} r={7.4} fill="#1b1916" />
                <circle cx={x} cy={y} r={7.4} fill="#f6f1e4" stroke={INK} strokeWidth={0.9} />
                <text x={x} y={y + 2.6} textAnchor="middle" fontFamily={SERIF} fontSize={7} fill={INK}>
                  {ch}
                </text>
              </g>
            );
          }),
        )}
      </Layer>
    </>
  );
});

// ——— N 真空管 ———
export const TubeArt = memo(function TubeArt({ uid }: ArtProps) {
  const cx = AW / 2;
  const glass = `M${cx - 42} 220V96C${cx - 42} 48 ${cx - 22} 30 ${cx} 30C${cx + 22} 30 ${cx + 42} 48 ${cx + 42} 96V220Z`;
  const grid = useMemo(() => {
    const points: Pt[] = [];
    for (let k = 0; k <= 22; k += 1) points.push([cx + (k % 2 ? 14 : -14), 92 + k * 4.6]);
    return polyline(points);
  }, [cx]);
  return (
    <>
      <Layer depth={-1.2}>
        <Desk uid={uid} />
        <rect {...FULL} fill={`url(#${uid}-grid)`} opacity={0.6} />
        <text x={20} y={26} fontFamily={SERIF} fontStyle="italic" fontSize={8} fill={INK} opacity={0.8}>
          Fig. 4
        </text>
        <Caption x={20} anchor="start">Audion, 1906</Caption>
      </Layer>
      <Layer depth={0.2}>
        <defs>
          <radialGradient id={`${uid}-heat`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#ff9a3c" stopOpacity="0.4" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* The glow of the filament, seen through the glass. */}
        <ellipse cx={cx} cy={142} rx={52} ry={78} fill={`url(#${uid}-heat)`} className="ce-anim ce-flicker" />
      </Layer>
      <Layer depth={0.7} cast>
        <defs>
          <Hatch id={`${uid}-h`} angle={-35} />
          <linearGradient id={`${uid}-getter`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8d949c" />
            <stop offset="0.5" stopColor="#f4f6f8" />
            <stop offset="1" stopColor="#7a818a" />
          </linearGradient>
        </defs>
        {/* Electrodes: two plates in hatch, the grid wound round, the cathode glowing. */}
        <rect x={cx - 30} y={86} width={12} height={110} fill="#efe8d8" stroke={INK} strokeWidth={0.8} />
        <rect x={cx - 30} y={86} width={12} height={110} fill={`url(#${uid}-h)`} opacity={0.6} />
        <rect x={cx + 18} y={86} width={12} height={110} fill="#efe8d8" stroke={INK} strokeWidth={0.8} />
        <rect x={cx + 18} y={86} width={12} height={110} fill={`url(#${uid}-h)`} opacity={0.6} />
        <path d={grid} fill="none" stroke={INK} strokeWidth={0.7} />
        <path d={`M${cx} 84V200`} stroke="#ff8a2a" strokeWidth={2.4} className="ce-anim ce-flicker" />
        <path d={`M${cx} 84V200`} stroke="#fff1c2" strokeWidth={0.8} />
        <ellipse cx={cx} cy={84} rx={36} ry={4} fill="#f6f1e4" stroke={INK} strokeWidth={0.7} />
        <ellipse cx={cx} cy={200} rx={36} ry={4} fill="#f6f1e4" stroke={INK} strokeWidth={0.7} />
        <ellipse cx={cx} cy={44} rx={18} ry={6} fill={`url(#${uid}-getter)`} opacity={0.85} />
        {/* The glass: an outline, a hatched shade on the far side, a long highlight on the near one. */}
        <path d={glass} fill="none" stroke={INK} strokeWidth={1.2} />
        <path d={`M${cx + 30} 60C${cx + 40} 80 ${cx + 40} 120 ${cx + 40} 200`} fill="none" stroke={INK} strokeWidth={0.4} strokeDasharray="1 1.6" />
        <path d={`M${cx - 32} 70C${cx - 36} 100 ${cx - 36} 160 ${cx - 34} 206`} fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
        {/* Base and pins. */}
        <path d={`M${cx - 46} 220H${cx + 46}L${cx + 40} 250H${cx - 40}Z`} fill="#2b2622" />
        <path d={`M${cx - 44} 226H${cx + 44}`} stroke="#5c534b" strokeWidth={0.8} />
        {[-24, -8, 8, 24].map((x) => (
          <path key={x} d={`M${cx + x} 250V266`} stroke="#8e8577" strokeWidth={3} strokeLinecap="round" />
        ))}
        {/* Numbered parts, as on a patent plate. */}
        {(
          [
            [210, 70, cx + 26, 96, "1"],
            [214, 132, cx + 14, 132, "2"],
            [40, 112, cx - 2, 120, "3"],
            [44, 58, cx - 14, 44, "4"],
          ] as Array<[number, number, number, number, string]>
        ).map(([x, y, tx, ty, n]) => (
          <g key={n}>
            <path d={`M${x} ${y - 2}Q${(x + tx) / 2} ${(y + ty) / 2 - 8} ${tx} ${ty}`} fill="none" stroke={INK} strokeWidth={0.45} />
            <text x={x} y={y} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={8} fill={INK}>
              {n}
            </text>
          </g>
        ))}
      </Layer>
    </>
  );
});

// ——— N 磁带 ———
function Reel({ r, pack, seconds, reverse }: { r: number; pack: number; seconds: number; reverse?: boolean }) {
  const holes = [0, 120, 240].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return circle(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.22);
  });
  return (
    <Spin x={0} y={0} seconds={seconds} reverse={reverse}>
      <circle r={pack} fill="#3a332c" />
      <circle r={pack} fill="none" stroke="#5a5048" strokeWidth={0.4} strokeDasharray="0.6 1.4" />
      <path d={`${circle(0, 0, r)}${holes.join("")}`} fill="#f3eddf" fillRule="evenodd" stroke={INK} strokeWidth={0.9} opacity={0.92} />
      <circle r={r * 0.13} fill="#f3eddf" stroke={INK} strokeWidth={0.9} />
      <path d={`M0 ${-r * 0.13}V${-r * 0.05}`} stroke={INK} strokeWidth={1.2} />
    </Spin>
  );
}

export const TapeArt = memo(function TapeArt({ uid }: ArtProps) {
  const left: Pt = [72, 96];
  const right: Pt = [182, 96];
  return (
    <>
      <Layer depth={-1.2}>
        <Desk uid={uid} />
        <Caption x={20} anchor="start">Magnetophon, 1935</Caption>
      </Layer>
      <Layer depth={0.3} cast>
        <defs>
          <Hatch id={`${uid}-h`} angle={30} />
        </defs>
        {/* The deck plate. */}
        <rect x={18} y={34} width={216} height={208} rx={10} fill="#e7dfcd" stroke={INK} strokeWidth={1} />
        <rect x={18} y={34} width={216} height={208} rx={10} fill={`url(#${uid}-h)`} opacity={0.12} />
        <path d={`M30 182H222`} stroke={INK} strokeWidth={0.5} />
        {/* Tape path: off the left reel, round the guides, over the heads, onto the right. */}
        <path d={`M${left[0] - 30} ${left[1] + 26}L60 168L100 176H152L194 168L${right[0] + 22} ${right[1] + 20}`} fill="none" stroke="#4a3d32" strokeWidth={2.2} strokeLinejoin="round" />
        <circle cx={60} cy={168} r={5} fill="#f3eddf" stroke={INK} strokeWidth={0.8} />
        <circle cx={194} cy={168} r={5} fill="#f3eddf" stroke={INK} strokeWidth={0.8} />
        <rect x={108} y={170} width={36} height={14} rx={2} fill="#3b3732" />
        <path d="M114 170v14M126 170v14M138 170v14" stroke="#77706a" strokeWidth={0.6} />
        {/* Counter and meter. */}
        <rect x={40} y={198} width={46} height={18} rx={2} fill="#f6f1e4" stroke={INK} strokeWidth={0.8} />
        <text x={63} y={211} textAnchor="middle" fontFamily={MONO} fontSize={10} fill={INK}>
          0137
        </text>
        <rect x={160} y={194} width={56} height={30} rx={3} fill="#f8f1dc" stroke={INK} strokeWidth={0.8} />
        <path d="M168 218A22 22 0 0 1 208 218" fill="none" stroke={INK} strokeWidth={0.5} />
        <path d="M200 205l5 -3" stroke="#a3362a" strokeWidth={1.2} />
        <g transform="translate(188 220)">
          <path d="M0 0L-12 -16" stroke={INK} strokeWidth={0.8} className="ce-anim ce-vu" />
        </g>
        <text x={182} y={234} textAnchor="middle" fontFamily={SERIF} fontSize={5} fill={INK}>
          VU
        </text>
        <circle cx={108} cy={207} r={3} fill="#c0392b" className="ce-blink" />
        <text x={116} y={209.5} fontFamily={SERIF} fontSize={6} fill={INK}>
          REC
        </text>
      </Layer>
      <Layer depth={0.9} cast>
        <g transform={`translate(${left[0]} ${left[1]})`}>
          <Reel r={44} pack={40} seconds={9} />
        </g>
        <g transform={`translate(${right[0]} ${right[1]})`}>
          <Reel r={44} pack={26} seconds={6} />
        </g>
      </Layer>
    </>
  );
});

// ——— N 图灵机 ———
const CELL = 26;
const SYMBOLS = ["1", "0", "1", "1", "0", "1", "0", "0"];
export const TuringArt = memo(function TuringArt({ uid }: ArtProps) {
  // Twice the pattern, so the tape can step along and start over without a jump.
  const cells = [...SYMBOLS, ...SYMBOLS, ...SYMBOLS];
  const y = 146;
  return (
    <>
      <Layer depth={-1.2}>
        <Desk uid={uid} />
        <rect {...FULL} fill={`url(#${uid}-grid)`} opacity={0.5} />
        <Caption>On Computable Numbers, 1936</Caption>
        <g fontFamily={SERIF} fontStyle="italic" fontSize={7.4} fill={INK} opacity={0.8}>
          <text x={24} y={218}>q₁, 0 → 1, R, q₂</text>
          <text x={24} y={230}>q₂, 1 → 1, R, q₂</text>
          <text x={24} y={242}>q₂, 0 → 0, L, q₃</text>
          <text x={136} y={218}>q₃, 1 → 0, L, q₃</text>
          <text x={136} y={230}>q₃, 0 → 1, R, q₁</text>
        </g>
      </Layer>
      <Layer depth={0.4} cast>
        <defs>
          <clipPath id={`${uid}-tape`}>
            <rect x={0} y={y - 2} width={AW} height={CELL + 4} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-tape)`}>
          <g className="ce-anim ce-tape">
            {cells.map((symbol, k) => (
              <g key={k} transform={`translate(${-CELL * 2 + k * CELL} ${y})`}>
                <rect width={CELL} height={CELL} fill="#fbf7ec" stroke={INK} strokeWidth={0.8} />
                <text x={CELL / 2} y={CELL / 2 + 5} textAnchor="middle" fontFamily={SERIF} fontSize={14} fill={INK}>
                  {symbol}
                </text>
              </g>
            ))}
          </g>
        </g>
        <path d={`M0 ${y - 6}H${AW}M0 ${y + CELL + 6}H${AW}`} stroke={INK} strokeWidth={0.4} strokeDasharray="2 3" />
        <text x={AW - 26} y={y + CELL + 20} textAnchor="end" fontFamily={SERIF} fontStyle="italic" fontSize={8} fill={INK}>
          … ∞
        </text>
      </Layer>
      <Layer depth={1.1} cast>
        <defs>
          <Hatch id={`${uid}-h`} angle={-40} />
        </defs>
        {/* The head over one cell: its state, and a mark when it writes. */}
        <g transform={`translate(${AW / 2 - 30} 62)`}>
          <rect x={0} y={0} width={60} height={56} rx={4} fill="#efe8d8" stroke={INK} strokeWidth={1} />
          <rect x={0} y={0} width={60} height={56} rx={4} fill={`url(#${uid}-h)`} opacity={0.18} />
          <text x={30} y={34} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={20} fill={INK}>
            q₃
          </text>
          <path d="M22 56L30 80L38 56Z" fill="#efe8d8" stroke={INK} strokeWidth={1} />
        </g>
        <rect x={AW / 2 - CELL / 2 - 2} y={y - 2} width={CELL + 4} height={CELL + 4} fill="none" stroke="#a3362a" strokeWidth={1.4} className="ce-anim ce-write" />
      </Layer>
    </>
  );
});

// ——— R 晶圆 ———
const WF_C: Pt = [AW / 2, 136];
const WF_R = 100;
export const WaferArt = memo(function WaferArt({ foil, uid }: ArtProps) {
  const dies = useMemo(() => {
    const random = seeded(77);
    const list: Array<{ x: number; y: number; bad: boolean }> = [];
    for (let y = WF_C[1] - WF_R; y < WF_C[1] + WF_R; y += 17) {
      for (let x = WF_C[0] - WF_R; x < WF_C[0] + WF_R; x += 13) {
        const corners: Pt[] = [
          [x, y],
          [x + 11, y],
          [x, y + 15],
          [x + 11, y + 15],
        ];
        if (corners.every(([px, py]) => Math.hypot(px - WF_C[0], py - WF_C[1]) < WF_R - 4 && py < WF_C[1] + WF_R - 14)) list.push({ x, y, bad: random() < 0.07 });
      }
    }
    return list;
  }, []);
  const flat = WF_C[1] + WF_R - 10;
  const half = Math.sqrt(WF_R * WF_R - (flat - WF_C[1]) ** 2);
  const outline = `M${f1(WF_C[0] - half)} ${f1(flat)}A${WF_R} ${WF_R} 0 1 1 ${f1(WF_C[0] + half)} ${f1(flat)}Z`;
  return (
    <>
      <Layer depth={-1.4}>
        <defs>
          <radialGradient id={`${uid}-bg`} cx="0.5" cy="0.4" r="0.8">
            <stop offset="0" stopColor="#1d2630" />
            <stop offset="1" stopColor="#0b1016" />
          </radialGradient>
        </defs>
        <rect {...FULL} fill={`url(#${uid}-bg)`} />
      </Layer>
      <Layer depth={0.4} cast>
        <defs>
          <radialGradient id={`${uid}-si`} cx="0.4" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#8c96a3" />
            <stop offset="0.6" stopColor="#4d5764" />
            <stop offset="1" stopColor="#2b333d" />
          </radialGradient>
          <linearGradient id={`${uid}-film`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b28be0" stopOpacity="0" />
            <stop offset="0.3" stopColor="#b28be0" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#8fd6b8" stopOpacity="0.55" />
            <stop offset="0.7" stopColor="#f0c878" stopOpacity="0.5" />
            <stop offset="1" stopColor="#f0c878" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}-wafer`}>
            <path d={outline} />
          </clipPath>
        </defs>
        <path d={outline} fill={`url(#${uid}-si)`} />
        <g clipPath={`url(#${uid}-wafer)`}>
          {dies.map((die) => (
            <g key={`${die.x}-${die.y}`}>
              <rect x={die.x} y={die.y} width={11} height={15} fill="none" stroke={foil} strokeWidth={0.5} opacity={0.85} />
              <path d={`M${die.x + 2} ${die.y + 4}h7M${die.x + 2} ${die.y + 7.5}h4M${die.x + 2} ${die.y + 11}h6`} stroke={foil} strokeWidth={0.3} opacity={0.6} />
              {die.bad ? <circle cx={die.x + 5.5} cy={die.y + 7.5} r={2.2} fill="#141a20" /> : null}
            </g>
          ))}
          {/* Thin-film colour slides across as the light moves. */}
          <g className="ce-anim ce-sheen">
            <rect x={WF_C[0] - 60} y={WF_C[1] - 130} width={120} height={260} fill={`url(#${uid}-film)`} transform={`rotate(28 ${WF_C[0]} ${WF_C[1]})`} style={{ mixBlendMode: "screen" }} />
          </g>
        </g>
        <path d={outline} fill="none" stroke={foil} strokeWidth={1.4} />
        <text x={WF_C[0]} y={flat + 14} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={6.6} fill="#c9d2dc" opacity={0.8}>
          300 mm · 2026
        </text>
      </Layer>
      <Layer depth={1.4} cast>
        {/* One die lifted out of its place, enlarged: its wiring in copper. */}
        <path d={`M${WF_C[0] + 33} ${WF_C[1] - 52}L${AW - 70} 40`} stroke="#c9d2dc" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.7} />
        <g className="ce-anim ce-bob">
          <g transform={`translate(${AW - 96} 14)`}>
            <rect x={3} y={5} width={58} height={74} fill="#000" opacity={0.35} />
            <rect x={0} y={0} width={58} height={74} fill="#39424e" stroke={foil} strokeWidth={1.2} />
            <path d="M6 10h46M6 18h30M6 26h40M6 34h20M30 34h22M6 42h46M6 50h28M6 58h40M6 66h18" stroke={foil} strokeWidth={0.8} opacity={0.85} />
            <path d="M14 10v8M40 18v16M24 42v16M46 50v16" stroke={foil} strokeWidth={0.8} opacity={0.85} />
            <rect x={20} y={28} width={18} height={12} fill="none" stroke="#e8edf2" strokeWidth={0.6} />
          </g>
        </g>
      </Layer>
    </>
  );
});
