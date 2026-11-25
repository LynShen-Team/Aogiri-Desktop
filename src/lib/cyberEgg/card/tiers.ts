// cyber-egg.spec.md CE-D1, CE-C1, CE-C2: the five tiers of a 赛博鸡蛋 draw, their materials, and the
// packs (期). A tier decides the material of a card (paper, copper, silver, gilt, hologram); the
// picture on it is its own (artworks/). Amounts and chances here are defaults an admin can change.

export type CardTier = "n" | "r" | "sr" | "ssr" | "ur";
export const TIERS: CardTier[] = ["n", "r", "sr", "ssr", "ur"];
export type Metal = "ink" | "copper" | "silver" | "gold" | "holo";

/** The material of a tier. */
export interface TierLook {
  code: string;
  /** Card ground (the paper or board round the picture). */
  ground: string;
  /** Text and fine lines printed in ink. */
  ink: string;
  soft: string;
  metal: Metal;
  /** Dark card: the frame is light on dark. */
  dark: boolean;
  /** The colour of the card's edge (seen when tilted, and while it lies face down: the tier's first hint). */
  edge: string;
  /** The light that hints the tier before the card turns (CE-R3), on a dark backdrop … */
  light: string;
  /** … and on a light one (a white glow vanishes on paper, so by day the hint is the metal's own tone). */
  glow: string;
}

export const TIER_LOOK: Record<CardTier, TierLook> = {
  n: { code: "N", ground: "#f2eee5", ink: "#2f2d29", soft: "#8b8578", metal: "ink", dark: false, edge: "#e4ddcc", light: "#fff7e6", glow: "#c2b391" },
  r: { code: "R", ground: "#f2e9de", ink: "#43291c", soft: "#9a7963", metal: "copper", dark: false, edge: "#b06a43", light: "#f4a875", glow: "#c47a4d" },
  sr: { code: "SR", ground: "#edeff0", ink: "#232c35", soft: "#7c8790", metal: "silver", dark: false, edge: "#c2c8cd", light: "#eef5fa", glow: "#8c97a2" },
  ssr: { code: "SSR", ground: "#17130f", ink: "#e9d3a0", soft: "#8a7048", metal: "gold", dark: true, edge: "#caa14d", light: "#ffd27a", glow: "#c99a3e" },
  ur: { code: "UR", ground: "#f5f3f2", ink: "#26242e", soft: "#8d88a0", metal: "holo", dark: false, edge: "#dcd4e8", light: "#ffffff", glow: "#a497d6" },
};

/** CE-D1: one tier of a campaign: a token range and a chance in basis points (the five sum to 10 000). */
export interface TierRule {
  tier: CardTier;
  min_tokens: number;
  max_tokens: number;
  weight_bp: number;
}

/**
 * CE-D1 defaults (owner 2026-11-23: floor 500 万, ceiling 1 亿; 2026-11-24 「UR 的概率得是 0.05%，SSR 的概率是 0.1%」 —
 * the event is free and a set pays ¥500, so the top two are rare: 白银 stays at 12%, the rest goes to 素纸 and 赤铜).
 * Expected value about 1254 万 a draw (1345 万 with the 白银 guarantee).
 */
export const DEFAULT_TIER_RULES: TierRule[] = [
  { tier: "n", min_tokens: 5_000_000, max_tokens: 10_000_000, weight_bp: 5785 },
  { tier: "r", min_tokens: 10_000_000, max_tokens: 20_000_000, weight_bp: 3000 },
  { tier: "sr", min_tokens: 20_000_000, max_tokens: 40_000_000, weight_bp: 1200 },
  { tier: "ssr", min_tokens: 40_000_000, max_tokens: 70_000_000, weight_bp: 10 },
  { tier: "ur", min_tokens: 70_000_000, max_tokens: 100_000_000, weight_bp: 5 },
];

/** CE-D2: the expected tokens of one draw (each range drawn uniformly). */
export function expectedTokens(rules: TierRule[]): number {
  const total = rules.reduce((sum, rule) => sum + rule.weight_bp, 0) || 1;
  return rules.reduce((sum, rule) => sum + ((rule.min_tokens + rule.max_tokens) / 2) * (rule.weight_bp / total), 0);
}

/** CE-D6 保底 (owner 2026-11-24): the guarantees, in draws; 0 turns one off. */
export interface PityRule {
  sr_at: number;
  ssr_at: number;
  ur_at: number;
  dupe_guard: boolean;
  /** Every this-many-th draw on the whole server is lifted to 白银 or better (0: off). */
  shared_sr_every?: number;
}

/**
 * CE-D6 defaults (owner 2026-11-24, 「全按推荐」): only the 白银 guarantee, and the duplicate guard. 鎏金 and 流光 have no
 * guarantee, so what a player sees of them is exactly the published chance. The admin can still set the other two.
 */
/** The server's lift every 200th draw (owner 2026-11-24: 「全服多少抽才有挑战性难度性」): about one every 3 days at ~65 draws a day. */
export const DEFAULT_PITY: PityRule = { sr_at: 10, ssr_at: 0, ur_at: 0, dupe_guard: true, shared_sr_every: 200 };

const ORDER: Record<CardTier, number> = { n: 0, r: 1, sr: 2, ssr: 3, ur: 4 };

/**
 * CE-D6: the long-run chance of each tier (0–1) once the guarantees are counted. Exact, by renewal: a "cycle" runs
 * from just after a 流光 to the next one; the chance of a tier is its expected count in a cycle over the cycle's
 * expected length. The state inside a cycle is (draws since 白银+, draws since 鎏金+); a guarantee that is off keeps
 * its count at 0. A cycle with no 流光 guarantee is followed until almost nothing of it is left.
 */
export function pityRates(rules: TierRule[], pity: Pick<PityRule, "sr_at" | "ssr_at" | "ur_at" | "shared_sr_every">): Record<CardTier, number> {
  const total = rules.reduce((sum, rule) => sum + Math.max(0, rule.weight_bp), 0);
  const base = Object.fromEntries(TIERS.map((tier) => [tier, 0])) as Record<CardTier, number>;
  for (const rule of rules) base[rule.tier] = total > 0 ? Math.max(0, rule.weight_bp) / total : 0;
  // A due guarantee lifts a roll that lands below its tier up to it; a roll at or above it stays as it was.
  const guaranteed = (from: "sr" | "ssr" | "ur"): Array<[CardTier, number]> =>
    TIERS.map((tier) => [ORDER[tier] < ORDER[from] ? from : tier, base[tier]] as [CardTier, number]);
  const plain = TIERS.map((tier) => [tier, base[tier]] as [CardTier, number]);
  const count = Object.fromEntries(TIERS.map((tier) => [tier, 0])) as Record<CardTier, number>;
  const srAt = pity.sr_at > 0 ? pity.sr_at : 0;
  const ssrAt = pity.ssr_at > 0 ? pity.ssr_at : 0;
  if (!(pity.ur_at > 0)) {
    // No 流光 guarantee: the state (draws since 白银+, since 鎏金+) is a small chain of its own; its long-run share
    // of each state, found by iterating, gives each tier's chance directly (the renewal below would crawl).
    let dist = new Map<string, number>([["0,0", 1]]);
    // The server's every-nth lift reaches a given player's draw about once in n (many players share the count).
    const every = pity.shared_sr_every && pity.shared_sr_every > 0 ? pity.shared_sr_every : 0;
    const mixed: Array<[CardTier, number]> = every
      ? (() => {
          const lifted = guaranteed("sr");
          return [...plain.map(([tier, q]) => [tier, q * (1 - 1 / every)] as [CardTier, number]), ...lifted.map(([tier, q]) => [tier, q / every] as [CardTier, number])];
        })()
      : plain;
    const oddsAt = (a: number, b: number) => (ssrAt && b === ssrAt - 1 ? guaranteed("ssr") : srAt && a === srAt - 1 ? guaranteed("sr") : mixed);
    for (let round = 0; round < 4000; round += 1) {
      const next = new Map<string, number>();
      for (const [key, p] of dist) {
        const [a, b] = key.split(",").map(Number);
        for (const [tier, q] of oddsAt(a, b)) {
          if (q <= 0) continue;
          const na = !srAt || ORDER[tier] >= ORDER.sr ? 0 : a + 1;
          const nb = !ssrAt || ORDER[tier] >= ORDER.ssr ? 0 : b + 1;
          const k = `${na},${nb}`;
          next.set(k, (next.get(k) ?? 0) + p * q);
        }
      }
      let change = 0;
      for (const [key, p] of next) change += Math.abs(p - (dist.get(key) ?? 0));
      dist = next;
      if (change < 1e-12) break;
    }
    for (const [key, p] of dist) {
      const [a, b] = key.split(",").map(Number);
      for (const [tier, q] of oddsAt(a, b)) count[tier] += p * q;
    }
    return count;
  }
  const steps = pity.ur_at > 0 ? pity.ur_at : 20_000;
  let alive = new Map<string, number>([["0,0", 1]]);
  let length = 0;
  for (let c = 0; c < steps && alive.size > 0; c += 1) {
    const next = new Map<string, number>();
    let mass = 0;
    for (const [key, p] of alive) {
      if (p < 1e-15) continue;
      mass += p;
      const [a, b] = key.split(",").map(Number);
      length += p;
      const odds = pity.ur_at > 0 && c === pity.ur_at - 1 ? guaranteed("ur") : ssrAt && b === ssrAt - 1 ? guaranteed("ssr") : srAt && a === srAt - 1 ? guaranteed("sr") : plain;
      for (const [tier, q] of odds) {
        if (q <= 0) continue;
        count[tier] += p * q;
        if (tier === "ur") continue;
        const na = !srAt || tier === "sr" || tier === "ssr" ? 0 : a + 1;
        const nb = !ssrAt || tier === "ssr" ? 0 : b + 1;
        const k = `${na},${nb}`;
        next.set(k, (next.get(k) ?? 0) + p * q);
      }
    }
    alive = next;
    if (mass < 1e-9) break;
  }
  return Object.fromEntries(TIERS.map((tier) => [tier, length > 0 ? count[tier] / length : base[tier]])) as Record<CardTier, number>;
}

/** CE-C2: a pack. Each has a name, its own card back and wrapper colours, and its own set of cards. */
export interface PackLook {
  period: number;
  /** Wrapper and card back: ground, line, accent. */
  back: { ground: string; line: string; accent: string };
  lobes: number;
  waves: number;
}

const PACKS: PackLook[] = [
  { period: 1, back: { ground: "#1b1a18", line: "#8c8476", accent: "#d6cab2" }, lobes: 24, waves: 62 },
  { period: 2, back: { ground: "#141a20", line: "#7d8b96", accent: "#c9d3da" }, lobes: 30, waves: 70 },
  { period: 3, back: { ground: "#241717", line: "#9a7b74", accent: "#e0c2a8" }, lobes: 20, waves: 54 },
];

export function packLook(period: number): PackLook {
  return PACKS.find((pack) => pack.period === period) ?? { ...PACKS[(period - 1) % PACKS.length], period };
}

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
