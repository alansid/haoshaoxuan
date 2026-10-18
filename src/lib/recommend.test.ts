import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { estimateKcal, KCAL_RANGES, mealTypeAt, parseAvoid, recommend, suggestionById, swapsFor } from "./recommend";
import { MEAL_TYPES, VENUES } from "./types";

describe("recommend", () => {
  it.each(VENUES)("%s：預設 300 元預算有建議，且都在預算內", (venue) => {
    const suggestions = recommend({ venue, budget: 300, mealType: "lunch", avoid: [] });
    expect(suggestions.length).toBe(3);
    for (const s of suggestions) {
      expect(s.items.every((i) => i.venue === venue)).toBe(true);
      expect(s.totalPrice).toBeLessThanOrEqual(300);
      expect(s.reasons.length).toBeGreaterThan(0);
      expect(s.highlight).toBe(s.reasons[0]);
    }
  });

  it("每個建議的主餐都不同", () => {
    const mains = recommend({ venue: "bento", budget: 300, mealType: "lunch", avoid: [] }, 10).map((s) => s.items[0].id);
    expect(new Set(mains).size).toBe(mains.length);
  });

  it("排除不想吃的關鍵字", () => {
    const suggestions = recommend({ venue: "bento", budget: 300, mealType: "lunch", avoid: ["雞"] }, 20);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) expect(s.items.some((i) => i.name.includes("雞"))).toBe(false);
  });

  it("預算低於最便宜的主餐時沒有建議", () => {
    const cheapest = Math.min(...CATALOG.filter((i) => i.role === "main").map((i) => i.priceEst));
    for (const venue of VENUES) expect(recommend({ venue, budget: cheapest - 1, mealType: "lunch", avoid: [] })).toEqual([]);
  });

  it("減脂排序：便當店第一名不是油炸品", () => {
    const [top] = recommend({ venue: "bento", budget: 300, mealType: "lunch", avoid: [] });
    expect(top.items.some((i) => i.tags.includes("fried"))).toBe(false);
  });

  it("點心的推薦熱量比午餐低", () => {
    const [snack] = recommend({ venue: "convenience", budget: 300, mealType: "snack", avoid: [] });
    const [lunch] = recommend({ venue: "convenience", budget: 300, mealType: "lunch", avoid: [] });
    expect(snack.kcalEst).toBeLessThan(lunch.kcalEst);
    expect(snack.kcalEst).toBeLessThanOrEqual(KCAL_RANGES.snack.max + 100);
  });
});

describe("個人熱量範圍", () => {
  it("範圍越低，推薦的熱量越低，理由寫「你這餐的建議範圍」", () => {
    const [low] = recommend({ venue: "bento", budget: 300, mealType: "lunch", avoid: [], kcalRange: { min: 350, max: 450 } });
    const [high] = recommend({ venue: "bento", budget: 300, mealType: "lunch", avoid: [], kcalRange: { min: 750, max: 900 } });
    expect(low.kcalEst).toBeLessThan(high.kcalEst);
    const inRange = recommend({ venue: "convenience", budget: 300, mealType: "lunch", avoid: [], kcalRange: { min: 400, max: 600 } }, 10);
    expect(inRange.some((s) => s.reasons.some((r) => r.includes("你這餐") && r.includes("建議範圍")))).toBe(true);
  });
});

describe("suggestionById", () => {
  it("可以從組合代號還原同一個組合", () => {
    for (const s of recommend({ venue: "cafe", budget: 300, mealType: "lunch", avoid: [] })) {
      expect(suggestionById(s.id)).toEqual(s);
    }
  });

  it.each([["不存在-品項"], ["cv-chicken-breast+bt-tofu"], [""], ["a+b+c+d+e+f"]])("無效代號 %s 回傳 null", (id) => {
    expect(suggestionById(id)).toBeNull();
  });
});

describe("swapsFor", () => {
  it("把油炸或含糖品項換成同類、熱量較低的品項", () => {
    for (const venue of VENUES) {
      for (const sw of swapsFor(venue, [])) {
        expect(sw.from.tags.some((t) => t === "fried" || t === "sugary")).toBe(true);
        expect(sw.to.role).toBe(sw.from.role);
        expect(sw.to.venue).toBe(venue);
        expect(sw.kcalSaved).toBeGreaterThan(0);
      }
    }
  });
});

describe("estimateKcal", () => {
  it("品項都在清單裡才加總", () => {
    expect(estimateKcal(["茶葉蛋 ×2", "無糖豆漿"])).toBe(150 + 110);
    expect(estimateKcal(["茶葉蛋 ×2", "神秘料理"])).toBeNull();
    expect(estimateKcal([])).toBeNull();
  });
});

describe("mealTypeAt", () => {
  it.each([
    ["2026-10-18T00:30:00Z", "breakfast"],
    ["2026-10-18T04:30:00Z", "lunch"],
    ["2026-10-18T11:00:00Z", "dinner"],
    ["2026-10-18T15:00:00Z", "snack"],
  ])("%s（UTC）→ %s", (iso, meal) => {
    expect(mealTypeAt(new Date(iso))).toBe(meal);
  });

  it("只回傳合法餐別", () => {
    for (let h = 0; h < 24; h++) expect(MEAL_TYPES).toContain(mealTypeAt(new Date(Date.UTC(2026, 9, 18, h))));
  });
});

describe("parseAvoid", () => {
  it("接受中英文逗號、頓號與空白", () => {
    expect(parseAvoid("牛，香菜、 蝦,  蛋 ")).toEqual(["牛", "香菜", "蝦", "蛋"]);
    expect(parseAvoid("")).toEqual([]);
  });
});
