import { CATALOG } from "./catalog";
import type { MealType, MenuItem, Venue } from "./types";

export const DEFAULT_MEAL_BUDGET = 300;

/** 各餐別的參考熱量區間（大卡），僅作排序參考，不是個人處方 */
export const KCAL_RANGES: Record<MealType, { min: number; max: number }> = {
  breakfast: { min: 300, max: 500 },
  lunch: { min: 400, max: 650 },
  dinner: { min: 400, max: 650 },
  snack: { min: 100, max: 250 },
};

export type RecommendInput = {
  venue: Venue;
  budget: number;
  mealType: MealType;
  /** 不想吃的食物關鍵字，品名包含任一關鍵字就排除 */
  avoid: string[];
  /** 個人這餐的建議熱量範圍；沒有時用 KCAL_RANGES 的一般參考 */
  kcalRange?: KcalRange | null;
};

export type KcalRange = { min: number; max: number };

export type Suggestion = {
  /** 組合代號，例如 "cv-salad-chicken+cv-tea-egg"，用於組合詳情頁網址 */
  id: string;
  venue: Venue;
  items: MenuItem[];
  totalPrice: number;
  kcalEst: number;
  proteinG: number;
  /** 一句話重點，顯示在推薦卡片上 */
  highlight: string;
  reasons: string[];
  tags: string[];
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

const sum = (items: MenuItem[], key: "priceEst" | "kcalEst" | "proteinG") => items.reduce((s, i) => s + i[key], 0);
const hasTag = (items: MenuItem[], tag: MenuItem["tags"][number]) => items.some((i) => i.tags.includes(tag));

function score(items: MenuItem[], mealType: MealType, range: KcalRange = KCAL_RANGES[mealType]): number {
  const target = (range.min + range.max) / 2;
  const kcal = sum(items, "kcalEst");
  const protein = sum(items, "proteinG");
  // 熱量落在參考區間內不扣分，超出越多扣越多；超過上限比低於下限扣得重
  const kcalPenalty = kcal > range.max ? (kcal - range.max) / 3 : kcal < range.min ? (range.min - kcal) / 6 : 0;
  // 蛋白質加分有上限，避免一直疊加高蛋白配菜
  const proteinCap = mealType === "snack" ? 15 : 40;
  let s = Math.min(protein, proteinCap) * 1.5 - kcalPenalty - Math.abs(kcal - target) / 50;
  if (hasTag(items, "fried")) s -= 30;
  if (hasTag(items, "sugary")) s -= 25;
  if (hasTag(items, "veggie")) s += 8;
  if (hasTag(items, "whole-grain")) s += 5;
  return s;
}

function describe(items: MenuItem[], mealType: MealType, range: KcalRange, personal: boolean) {
  const kcal = sum(items, "kcalEst");
  const protein = sum(items, "proteinG");
  const reasons: string[] = [];
  const tags: string[] = [];
  if (protein >= (mealType === "snack" ? 10 : 25)) {
    reasons.push(`蛋白質約 ${protein} 公克，比較有飽足感，減脂期不容易餓`);
    tags.push("高蛋白");
  }
  if (kcal >= range.min && kcal <= range.max) {
    reasons.push(`熱量約 ${kcal} 大卡，落在${personal ? "你" : ""}這餐 ${range.min}–${range.max} 大卡的${personal ? "建議" : "參考"}範圍`);
    tags.push("份量剛好");
  } else if (kcal < range.min) {
    reasons.push(`熱量約 ${kcal} 大卡，偏輕，餓的話可以加一份蛋白質`);
    tags.push("輕食");
  }
  if (!hasTag(items, "fried")) {
    reasons.push("沒有油炸品項");
    tags.push("低油");
  }
  if (hasTag(items, "veggie")) {
    reasons.push("有蔬菜，增加纖維");
    tags.push("有蔬菜");
  }
  if (hasTag(items, "whole-grain")) reasons.push("含全穀或原型澱粉");
  if (sum(items, "priceEst") <= 120) tags.push("省錢");
  const highlight = reasons[0] ?? "均衡的一餐";
  return { reasons, tags: tags.slice(0, 3), highlight };
}

function toSuggestion(items: MenuItem[], mealType: MealType, kcalRange?: KcalRange | null): Suggestion {
  return {
    id: items.map((i) => i.id).join("+"),
    venue: items[0].venue,
    items,
    totalPrice: sum(items, "priceEst"),
    kcalEst: sum(items, "kcalEst"),
    proteinG: sum(items, "proteinG"),
    ...describe(items, mealType, kcalRange ?? KCAL_RANGES[mealType], Boolean(kcalRange)),
  };
}

export function recommend({ venue, budget, mealType, avoid, kcalRange }: RecommendInput, limit = 3): Suggestion[] {
  const pool = available(venue, avoid);
  const mains = pool.filter((i) => i.role === "main");
  const sides: (MenuItem | null)[] = [null, ...pool.filter((i) => i.role === "side")];
  const drinks: (MenuItem | null)[] = [null, ...pool.filter((i) => i.role === "drink")];

  const combos: { items: MenuItem[]; score: number }[] = [];
  for (const main of mains) {
    for (const side of sides) {
      for (const drink of drinks) {
        const items = [main, side, drink].filter((i): i is MenuItem => i !== null);
        if (sum(items, "priceEst") > budget) continue;
        combos.push({ items, score: score(items, mealType, kcalRange ?? undefined) });
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
    result.push(toSuggestion(combo.items, mealType, kcalRange));
    if (result.length >= limit) break;
  }
  return result;
}

/** 由組合代號還原組合；代號無效（品項不存在、混了不同場合）時回傳 null */
export function suggestionById(id: string, mealType: MealType = "lunch", kcalRange?: KcalRange | null): Suggestion | null {
  const ids = id.split("+");
  if (ids.length === 0 || ids.length > 5) return null;
  const items = ids.map((x) => CATALOG.find((i) => i.id === x));
  if (items.some((i) => !i)) return null;
  const found = items as MenuItem[];
  if (new Set(found.map((i) => i.venue)).size !== 1) return null;
  return toSuggestion(found, mealType, kcalRange);
}

/** 同一種場合裡，油炸或含糖品項的較佳替換 */
export function swapsFor(venue: Venue, avoid: string[]): Swap[] {
  const pool = available(venue, avoid);
  const swaps: Swap[] = [];
  for (const from of pool.filter((i) => i.tags.includes("fried") || i.tags.includes("sugary"))) {
    const to = pool
      .filter((i) => i.role === from.role && !i.tags.includes("fried") && !i.tags.includes("sugary") && i.kcalEst < from.kcalEst)
      .sort((a, b) => score([b], "lunch") - score([a], "lunch"))[0];
    if (to) swaps.push({ from, to, kcalSaved: from.kcalEst - to.kcalEst });
  }
  return swaps;
}

/** 依品名估算熱量：每個品項都能在清單裡找到時才回傳總和，否則回傳 null */
export function estimateKcal(itemNames: string[]): number | null {
  if (itemNames.length === 0) return null;
  let total = 0;
  for (const name of itemNames) {
    const item = CATALOG.find((i) => i.name === name.trim());
    if (!item) return null;
    total += item.kcalEst;
  }
  return total;
}

/** 依台灣時間的時刻猜餐別 */
export function mealTypeAt(date: Date): MealType {
  const hour = (date.getUTCHours() + 8) % 24;
  if (hour >= 4 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}
