// cyber-egg.spec.md CE-C1: the cards of each pack. A pack (期) has a theme and its own set; each card has
// a tier, a name, one line of text and its own picture (artworks/), drawn for this campaign.
import type { Component } from "./jsx";
import type { ArtProps, SetInfo } from "./art-kit";
import type { CardTier } from "./tiers";
import { ArmillaryArt } from "./artworks/armillary";
import { CircuitArt } from "./artworks/circuit";
import { DecoCityArt } from "./artworks/deco-city";
import { DuskTramArt } from "./artworks/dusk-tram";
import { GearsArt } from "./artworks/gears";
import { LorenzArt } from "./artworks/lorenz";
import { MobiusArt } from "./artworks/mobius";
import { NeuralArt } from "./artworks/neural";
import { PunchCardArt } from "./artworks/punch-card";
import { TapeArt, TubeArt, TuringArt, TypewriterArt, WaferArt } from "./artworks/p1-more";
import { SingularityArt } from "./artworks/singularity";
import { AstrolabeArt, AuroraArt, EarthriseArt, EclipseArt, GalaxyArt, MoonPhasesArt, SaturnArt, SeaChartArt, SextantArt, TelescopeArt } from "./artworks/p2-star-sea";
import { SetArt } from "./artworks/set-card";
import { AbacusArt, BellsArt, DragonArt, IslandArt, KoiArt, LanternArt, MirrorArt, MoonGateArt, NightMarketArt, TypeArt } from "./artworks/p3-east";

export interface CardDef {
  /** Stable id, e.g. `p1-07`. */
  id: string;
  period: number;
  no: number;
  /** Cards in the pack. */
  of: number;
  tier: CardTier;
  name: string;
  /** One short line printed under the name. */
  line: string;
  /** The picture window's ground colour (shown before the picture paints). */
  ground: string;
  Art: Component<ArtProps>;
  /** CE-S1: the 典藏 card of a completed pack (not drawn, not traded). */
  special?: "set";
  set?: SetInfo;
}

export interface PackDef {
  period: number;
  name: string;
  /** One line about the theme. */
  line: string;
  cards: CardDef[];
  /** Ready to be drawn (owner 2026-11-24: pack 1 goes out first; packs 2 and 3 are reworked after launch). */
  ready: boolean;
}

type Entry = Omit<CardDef, "id" | "period" | "no" | "of">;

function pack(period: number, name: string, line: string, entries: Entry[], ready = true): PackDef {
  return {
    period,
    name,
    line,
    ready,
    cards: entries.map((entry, index) => ({ ...entry, id: `p${period}-${String(index + 1).padStart(2, "0")}`, period, no: index + 1, of: entries.length })),
  };
}

export const PACKS: PackDef[] = [
  // Owner 2026-11-24: 15 cards a pack, more of the cheap tiers, always two UR (素纸 6 · 赤铜 3 · 白银 2 · 鎏金 2 · 流光 2).
  pack(1, "机器之心", "从齿轮到神经网络，机器学会思考的一路", [
    { tier: "n", name: "穿孔卡", line: "一排孔，就是一行程序。", ground: "#ece5d6", Art: PunchCardArt },
    { tier: "n", name: "差分机", line: "齿轮咬合之处，数字自己往前走。", ground: "#ece5d6", Art: GearsArt },
    { tier: "n", name: "打字机", line: "一下一下敲出来的字，最先教会了机器听话。", ground: "#ece5d6", Art: TypewriterArt },
    { tier: "n", name: "真空管", line: "玻璃里点一盏小灯，就能算数。", ground: "#ece5d6", Art: TubeArt },
    { tier: "n", name: "磁带", line: "转一圈，就记住一点。", ground: "#ece5d6", Art: TapeArt },
    { tier: "n", name: "图灵机", line: "一条纸带，一个读写头，就够了。", ground: "#ece5d6", Art: TuringArt },
    { tier: "r", name: "电路", line: "铜线上跑的，是光速的念头。", ground: "#121a15", Art: CircuitArt },
    { tier: "r", name: "洛伦兹", line: "一只蝴蝶，永不重复的轨迹。", ground: "#efe7da", Art: LorenzArt },
    { tier: "r", name: "晶圆", line: "一片硅上，住着几百颗大脑。", ground: "#121820", Art: WaferArt },
    { tier: "sr", name: "神经网络", line: "一层一层亮起来，就懂了。", ground: "#161c22", Art: NeuralArt },
    { tier: "sr", name: "黄昏电车", line: "下班路上，云比代码好看。", ground: "#3b3047", Art: DuskTramArt },
    { tier: "ssr", name: "天球仪", line: "把整个天空，装进几道金环。", ground: "#0d0a07", Art: ArmillaryArt },
    { tier: "ssr", name: "不夜城", line: "算力不眠，城市也不眠。", ground: "#0b0907", Art: DecoCityArt },
    { tier: "ur", name: "奇点", line: "光也逃不出去的地方。", ground: "#050407", Art: SingularityArt },
    { tier: "ur", name: "莫比乌斯", line: "只有一面，走下去就回到起点。", ground: "#f3f1f4", Art: MobiusArt },
  ]),
  pack(2, "星海", "抬头是星，低头是海，地图画到哪里，人就走到哪里", [
    { tier: "n", name: "星盘", line: "把整片天空，刻进一块铜里。", ground: "#e6dcc4", Art: AstrolabeArt },
    { tier: "n", name: "六分仪", line: "量一量太阳有多高，就知道船在哪。", ground: "#e6dcc4", Art: SextantArt },
    { tier: "r", name: "航海图", line: "画出来的海，才敢开过去。", ground: "#e9dec6", Art: SeaChartArt },
    { tier: "r", name: "望远镜", line: "1610 年，有人第一次把它对准了月亮。", ground: "#0f151b", Art: TelescopeArt },
    { tier: "sr", name: "土星", line: "戴着环的那颗，从不着急。", ground: "#0c1117", Art: SaturnArt },
    { tier: "sr", name: "极光", line: "天上换了窗帘，冰面也跟着换。", ground: "#08141a", Art: AuroraArt },
    { tier: "ssr", name: "月相", line: "圆了又缺，缺了又圆。", ground: "#100c08", Art: MoonPhasesArt },
    { tier: "ssr", name: "日食", line: "太阳被遮住的那两分钟，天上开出一朵金花。", ground: "#040302", Art: EclipseArt },
    { tier: "ur", name: "银河", line: "一千亿颗太阳，慢慢地转。", ground: "#030306", Art: GalaxyArt },
    { tier: "ur", name: "地出", line: "第一次，从月亮上看家。", ground: "#020203", Art: EarthriseArt },
  ], false),
  pack(3, "东方", "旧东西里的新念头：算盘、活字、铜镜和龙", [
    { tier: "n", name: "算盘", line: "上二下五，拨一拨就是答案。", ground: "#ece4d2", Art: AbacusArt },
    { tier: "n", name: "活字", line: "反着刻，才能正着印。", ground: "#ece4d2", Art: TypeArt },
    { tier: "r", name: "灯笼", line: "一盏灯，就把整条街照成了节日。", ground: "#1a0c0a", Art: LanternArt },
    { tier: "r", name: "铜镜", line: "两千年前的镜子，背面比正面好看。", ground: "#141b26", Art: MirrorArt },
    { tier: "sr", name: "锦鲤", line: "绕了一圈又一圈，好运就来了。", ground: "#10312f", Art: KoiArt },
    { tier: "sr", name: "月门", line: "推开圆门，月亮刚好在那里。", ground: "#1d2140", Art: MoonGateArt },
    { tier: "ssr", name: "夜市", line: "雨里的招牌，比白天还亮。", ground: "#0b0907", Art: NightMarketArt },
    { tier: "ssr", name: "编钟", line: "两千年前的钟，还能敲出 do re mi。", ground: "#120d08", Art: BellsArt },
    { tier: "ur", name: "浮岛", line: "蓬莱不在海上，在云里。", ground: "#2a2450", Art: IslandArt },
    { tier: "ur", name: "云龙", line: "云从龙，风从虎。", ground: "#0d0b18", Art: DragonArt },
  ], false),
];

export function packOf(period: number): PackDef | undefined {
  return PACKS.find((item) => item.period === period);
}

const SET_CARDS = new Map<number, CardDef>();

/** CE-S1: the 典藏 card of a pack: given once to each player who completes it. */
export function setCardOf(period: number): CardDef | undefined {
  const hit = SET_CARDS.get(period);
  if (hit) return hit;
  const pack = packOf(period);
  if (!pack) return undefined;
  const card: CardDef = {
    id: `p${period}-set`,
    period,
    no: 0,
    of: pack.cards.length,
    tier: "ssr",
    name: `${pack.name} · 典藏`,
    line: "一期集齐，才有这一张。",
    ground: "#0a0806",
    Art: SetArt,
    special: "set",
    set: { packName: pack.name, names: pack.cards.map((item) => item.name), tiers: pack.cards.map((item) => item.tier) },
  };
  SET_CARDS.set(period, card);
  return card;
}

export function cardById(id: string): CardDef | undefined {
  const set = /^p(\d+)-set$/.exec(id);
  if (set) return setCardOf(Number(set[1]));
  for (const item of PACKS) {
    const card = item.cards.find((entry) => entry.id === id);
    if (card) return card;
  }
  return undefined;
}
