import { describe, expect, it } from "vitest";
import { dailyRange, dailyTarget, mealRange, MIN_DAILY_KCAL } from "./energy";
import { EMPTY_BODY, MEAL_TYPES, type Body } from "./types";

const body: Body = { heightCm: 175, weightKg: 70, age: 30, sex: "male", activity: "sedentary" };

describe("dailyTarget", () => {
  it("Mifflin-St Jeor：男性久坐、維持", () => {
    // BMR = 10*70 + 6.25*175 - 5*30 + 5 = 1648.75；×1.2 = 1978.5
    expect(dailyTarget(body, "maintain")).toBe(1979);
  });

  it("女性與不透露性別使用不同常數", () => {
    const female = dailyTarget({ ...body, sex: "female" }, "maintain")!;
    const undisclosed = dailyTarget({ ...body, sex: "undisclosed" }, "maintain")!;
    expect(female).toBeLessThan(undisclosed);
    expect(undisclosed).toBeLessThan(1979);
  });

  it("減脂少約 15%，增肌多約 10%，活動量越高越多", () => {
    expect(dailyTarget(body, "fat-loss")).toBe(Math.round(1978.5 * 0.85));
    expect(dailyTarget(body, "gain")).toBe(Math.round(1978.5 * 1.1));
    expect(dailyTarget({ ...body, activity: "active" }, "maintain")!).toBeGreaterThan(1979);
  });

  it("活動量沒填當作久坐", () => {
    expect(dailyTarget({ ...body, activity: null }, "maintain")).toBe(1979);
  });

  it("身高、體重、年齡缺一就不估算", () => {
    expect(dailyTarget(EMPTY_BODY, "maintain")).toBeNull();
    expect(dailyTarget({ ...body, age: null }, "maintain")).toBeNull();
    expect(dailyTarget({ ...body, heightCm: null }, "maintain")).toBeNull();
    expect(dailyTarget({ ...body, weightKg: null }, "maintain")).toBeNull();
  });

  it("不會建議低於下限的熱量", () => {
    const tiny: Body = { heightCm: 145, weightKg: 38, age: 70, sex: "female", activity: "sedentary" };
    expect(dailyTarget(tiny, "fat-loss")).toBe(MIN_DAILY_KCAL);
    expect(dailyRange(tiny, "fat-loss")!.min).toBeGreaterThanOrEqual(MIN_DAILY_KCAL);
  });
});

describe("dailyRange / mealRange", () => {
  it("每日範圍約 ±10%，取整到 50", () => {
    expect(dailyRange(body, "maintain")).toEqual({ min: 1800, max: 2200 });
  });

  it("各餐範圍依比例分配，加總約等於一天", () => {
    const ranges = MEAL_TYPES.map((m) => mealRange(body, "maintain", m)!);
    const sumMax = ranges.reduce((s, r) => s + r.max, 0);
    expect(Math.abs(sumMax - 2200)).toBeLessThanOrEqual(100);
    expect(mealRange(body, "maintain", "lunch")!.max).toBeGreaterThan(mealRange(body, "maintain", "snack")!.max);
    expect(mealRange(EMPTY_BODY, "maintain", "lunch")).toBeNull();
  });
});
