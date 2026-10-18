import { CATALOG } from "./catalog";
import type { MenuItem, Venue } from "./types";

export const DEFAULT_BUDGET = 300;

/** 減脂期一餐的參考熱量區間（大卡），僅作排序參考，不是個人處方 */
export const KCAL_RANGE = { min: 400, max: 650 } as const;
const KCAL_TARGET = (KCAL_RANGE.min + KCAL_RANGE.max) / 2;

export type RecommendInput = {
  venue: Venue;
  budget: number;
  /** 不想吃的食物關鍵字，品名包含任一關鍵字就排除 */
  avoid: string[];
};

export type Suggestion = {
  items: MenuItem[];
  /** 估計總價；有任一品項價格未知時為 null */
  totalPrice: number | null;
  kcalEst: number;
  proteinG: number;
  reasons: string[];
};

export type Swap = {
  from: MenuItem;
  to: MenuItem;
  kcalSaved: number;
};

export function parseAvoid(text: string): string[] {
  return text
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function available(venue: Venue, avoid: string[]): MenuItem[] {
  return CATALOG.filter((item) => item.venue === venue && !avoid.some((word) => item.name.includes(word)));
}

function totalPrice(items: MenuItem[]): number | null {
  let sum = 0;
  for (const item of items) {
    if (item.priceEst === null) return null;
    sum += item.priceEst;
  }
  return sum;
}

function score(items: MenuItem[]): number {
  const kcal = items.reduce((s, i) => s + i.kcalEst, 0);
  const protein = items.reduce((s, i) => s + i.proteinG, 0);
  const has = (tag: MenuItem["tags"][number]) => items.some((i) => i.tags.includes(tag));
  // 熱量落在參考區間內不扣分，超出越多扣越多；超過上限比低於下限扣得重
  const kcalPenalty =
    kcal > KCAL_RANGE.max ? (kcal - KCAL_RANGE.max) / 3 : kcal < KCAL_RANGE.min ? (KCAL_RANGE.min - kcal) / 6 : 0;
  // 蛋白質加分到 40 公克為止，避免一直疊加高蛋白配菜
  let s = Math.min(protein, 40) * 1.5 - kcalPenalty - Math.abs(kcal - KCAL_TARGET) / 50;
  if (has("fried")) s -= 30;
  if (has("sugary")) s -= 25;
  if (has("veggie")) s += 8;
  if (has("whole-grain")) s += 5;
  // 價格未知時無法確認預算，優先推薦價格已知的組合
  if (totalPrice(items) === null) s -= 40;
  return s;
}

function reasonsFor(items: MenuItem[], kcal: number, protein: number): string[] {
  const reasons: string[] = [];
  if (protein >= 25) reasons.push(`蛋白質約 ${protein} 公克，比較有飽足感，減脂期不容易餓`);
  if (kcal >= KCAL_RANGE.min && kcal <= KCAL_RANGE.max) {
    reasons.push(`熱量約 ${kcal} 大卡，落在一餐 ${KCAL_RANGE.min}–${KCAL_RANGE.max} 大卡的參考範圍`);
  } else if (kcal < KCAL_RANGE.min) {
    reasons.push(`熱量約 ${kcal} 大卡，偏低，可以當輕食或加點蛋白質`);
  }
  if (!items.some((i) => i.tags.includes("fried"))) reasons.push("沒有油炸品項");
  if (items.some((i) => i.tags.includes("veggie"))) reasons.push("有蔬菜，增加纖維");
  if (items.some((i) => i.tags.includes("whole-grain"))) reasons.push("含全穀或原型澱粉");
  return reasons;
}

export function recommend({ venue, budget, avoid }: RecommendInput, limit = 3): Suggestion[] {
  const pool = available(venue, avoid);
  const mains = pool.filter((i) => i.role === "main");
  const sides: (MenuItem | null)[] = [null, ...pool.filter((i) => i.role === "side")];
  const drinks: (MenuItem | null)[] = [null, ...pool.filter((i) => i.role === "drink")];

  const combos: { items: MenuItem[]; score: number }[] = [];
  for (const main of mains) {
    for (const side of sides) {
      for (const drink of drinks) {
        const items = [main, side, drink].filter((i): i is MenuItem => i !== null);
        const price = totalPrice(items);
        // 已知價格超出預算就不推薦；價格未知的組合保留，但畫面上不宣稱符合預算
        if (price !== null && price > budget) continue;
        combos.push({ items, score: score(items) });
      }
    }
  }
  combos.sort((a, b) => b.score - a.score);

  // 每個主餐只取最好的一種搭配，讓建議彼此不同
  const seenMains = new Set<string>();
  const result: Suggestion[] = [];
  for (const combo of combos) {
    const main = combo.items[0];
    if (seenMains.has(main.id)) continue;
    seenMains.add(main.id);
    const kcal = combo.items.reduce((s, i) => s + i.kcalEst, 0);
    const protein = combo.items.reduce((s, i) => s + i.proteinG, 0);
    result.push({
      items: combo.items,
      totalPrice: totalPrice(combo.items),
      kcalEst: kcal,
      proteinG: protein,
      reasons: reasonsFor(combo.items, kcal, protein),
    });
    if (result.length >= limit) break;
  }
  return result;
}

/** 同一種場合裡，油炸或含糖品項的較佳替換 */
export function swapsFor(venue: Venue, avoid: string[]): Swap[] {
  const pool = available(venue, avoid);
  const swaps: Swap[] = [];
  for (const from of pool.filter((i) => i.tags.includes("fried") || i.tags.includes("sugary"))) {
    const to = pool
      .filter((i) => i.role === from.role && !i.tags.includes("fried") && !i.tags.includes("sugary") && i.kcalEst < from.kcalEst)
      .sort((a, b) => score([b]) - score([a]))[0];
    if (to) swaps.push({ from, to, kcalSaved: from.kcalEst - to.kcalEst });
  }
  return swaps;
}
