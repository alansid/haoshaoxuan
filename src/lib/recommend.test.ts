import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { parseAvoid, recommend, swapsFor } from "./recommend";
import type { Venue } from "./types";

const VENUES: Venue[] = ["convenience", "cafe", "bento"];

describe("recommend", () => {
  it.each(VENUES)("%s：預設 300 元預算有建議，且已知價格都在預算內", (venue) => {
    const suggestions = recommend({ venue, budget: 300, avoid: [] });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.items.every((i) => i.venue === venue)).toBe(true);
      if (s.totalPrice !== null) expect(s.totalPrice).toBeLessThanOrEqual(300);
      expect(s.reasons.length).toBeGreaterThan(0);
    }
  });

  it("每個建議的主餐都不同", () => {
    const mains = recommend({ venue: "bento", budget: 300, avoid: [] }).map((s) => s.items[0].id);
    expect(new Set(mains).size).toBe(mains.length);
  });

  it("價格未知的組合 totalPrice 為 null，不算出總價", () => {
    const all = VENUES.flatMap((venue) => recommend({ venue, budget: 300, avoid: [] }, 20));
    for (const s of all) {
      const unknown = s.items.some((i) => i.priceEst === null);
      expect(s.totalPrice === null).toBe(unknown);
    }
  });

  it("排除不想吃的關鍵字", () => {
    const suggestions = recommend({ venue: "bento", budget: 300, avoid: ["雞"] }, 20);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) expect(s.items.some((i) => i.name.includes("雞"))).toBe(false);
  });

  it("預算低到買不起任何已知價格組合時，只剩價格未知的或沒有建議", () => {
    const cheapest = Math.min(...CATALOG.filter((i) => i.role === "main" && i.priceEst !== null).map((i) => i.priceEst!));
    for (const venue of VENUES) {
      for (const s of recommend({ venue, budget: cheapest - 1, avoid: [] })) expect(s.totalPrice).toBeNull();
    }
  });

  it.each(VENUES)("%s：預設預算下，推薦都是價格已知的組合", (venue) => {
    for (const s of recommend({ venue, budget: 300, avoid: [] })) expect(s.totalPrice).not.toBeNull();
  });

  it("減脂排序：便當店第一名不是油炸品", () => {
    const [top] = recommend({ venue: "bento", budget: 300, avoid: [] });
    expect(top.items.some((i) => i.tags.includes("fried"))).toBe(false);
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

describe("parseAvoid", () => {
  it("接受中英文逗號、頓號與空白", () => {
    expect(parseAvoid("牛，香菜、 蝦,  蛋 ")).toEqual(["牛", "香菜", "蝦", "蛋"]);
    expect(parseAvoid("")).toEqual([]);
  });
});
