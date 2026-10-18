import { describe, expect, it } from "vitest";
import { addDays, dayLabel, weekStart } from "./dates";
import { badges, nextStreakBadge, streak, todaySummary, weekSummary, weeklyChallenge } from "./stats";
import type { MealLog } from "./types";

const TODAY = "2026-10-18"; // 週日

let seq = 0;
function log(day: string, patch: Partial<MealLog> = {}): MealLog {
  seq++;
  return {
    id: String(seq),
    userId: "u",
    mealType: "lunch",
    venue: "bento",
    items: ["烤雞腿便當（飯半碗）"],
    cost: 100,
    kcalEst: 600,
    // 台灣時間中午 12 點
    eatenAt: `${day}T04:00:00.000Z`,
    note: "",
    createdAt: "",
    updatedAt: "",
    ...patch,
  };
}

const daysBack = (n: number) => Array.from({ length: n }, (_, i) => addDays(TODAY, -i));

describe("dates", () => {
  it("週一為一週開始", () => {
    expect(weekStart("2026-10-18")).toBe("2026-10-12");
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
    expect(dayLabel("2026-10-18")).toBe("10/18（日）");
  });
});

describe("streak", () => {
  it("連續天數算到今天", () => {
    expect(streak(daysBack(5).map((d) => log(d)), TODAY)).toBe(5);
  });

  it("今天還沒記的話算到昨天，不會歸零", () => {
    expect(streak(daysBack(4).slice(1).map((d) => log(d)), TODAY)).toBe(3);
  });

  it("中間斷一天就重算", () => {
    const logs = [log(TODAY), log(addDays(TODAY, -1)), log(addDays(TODAY, -3))];
    expect(streak(logs, TODAY)).toBe(2);
  });

  it("同一天多餐只算一天；沒有紀錄是 0", () => {
    expect(streak([log(TODAY), log(TODAY, { mealType: "dinner" })], TODAY)).toBe(1);
    expect(streak([], TODAY)).toBe(0);
  });

  it("台灣時間凌晨的紀錄算在當天", () => {
    // 台灣 10/18 00:30 ＝ UTC 10/17 16:30
    expect(streak([log(TODAY, { eatenAt: "2026-10-17T16:30:00.000Z" })], TODAY)).toBe(1);
  });
});

describe("badges", () => {
  it("依連續天數給徽章", () => {
    const ids = badges(daysBack(7).map((d) => log(d)), 600, TODAY).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(["first-log", "streak-3", "streak-7"]));
    expect(ids).not.toContain("streak-30");
  });

  it("預算守門員：最近一週記 5 天以上且都沒超支", () => {
    expect(badges(daysBack(5).map((d) => log(d)), 600, TODAY).map((b) => b.id)).toContain("budget-keeper");
    const over = [...daysBack(5).map((d) => log(d)), log(TODAY, { cost: 600 })];
    expect(badges(over, 600, TODAY).map((b) => b.id)).not.toContain("budget-keeper");
  });

  it("下一個徽章與差幾天", () => {
    expect(nextStreakBadge(5)).toEqual({ name: "一週不間斷", daysLeft: 2, target: 7 });
    expect(nextStreakBadge(30)).toBeNull();
  });
});

describe("todaySummary", () => {
  it("只算今天，熱量未知會標示", () => {
    const s = todaySummary([log(TODAY), log(TODAY, { cost: 85, kcalEst: null }), log(addDays(TODAY, -1))], 300, TODAY);
    expect(s.meals).toHaveLength(2);
    expect(s.cost).toBe(185);
    expect(s.budgetLeft).toBe(115);
    expect(s.kcal).toBe(600);
    expect(s.kcalUnknown).toBe(true);
  });
});

describe("weekSummary", () => {
  it("週一到週日各一格，統計花費與預算內天數", () => {
    const logs = [log("2026-10-12", { cost: 700 }), log("2026-10-14"), log("2026-10-14", { kcalEst: 400 }), log("2026-10-11")];
    const w = weekSummary(logs, 600, TODAY);
    expect(w.start).toBe("2026-10-12");
    expect(w.days.map((d) => d.cost)).toEqual([700, 0, 200, 0, 0, 0, 0]);
    expect(w.totalCost).toBe(900);
    expect(w.meals).toBe(3);
    expect(w.daysLogged).toBe(2);
    expect(w.daysWithinBudget).toBe(1);
    expect(w.avgKcal).toBe(Math.round((600 + 1000) / 2));
  });
});

describe("weeklyChallenge", () => {
  it("記錄太少時鼓勵多記", () => {
    expect(weeklyChallenge([log(TODAY)], 600, TODAY)).toContain("記錄 5 天");
  });

  it("含糖飲料多時建議換無糖", () => {
    const logs = daysBack(5).map((d) => log(d, { items: ["瓶裝奶茶"] }));
    expect(weeklyChallenge(logs, 600, TODAY)).toContain("無糖");
  });

  it("油炸多時建議換烤或滷", () => {
    const logs = daysBack(5).map((d) => log(d, { items: ["排骨便當"] }));
    expect(weeklyChallenge(logs, 600, TODAY)).toContain("油炸");
  });

  it("超支天數多時建議守預算", () => {
    const logs = daysBack(5).map((d) => log(d, { cost: 700 }));
    expect(weeklyChallenge(logs, 600, TODAY)).toContain("預算內");
  });
});
