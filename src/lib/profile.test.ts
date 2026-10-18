import { describe, expect, it } from "vitest";
import { defaultProfile, parseProfileForm } from "./profile";

const base = defaultProfile("u1", "小明");

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

describe("parseProfileForm", () => {
  it("只更新表單上有的欄位", () => {
    const r = parseProfileForm(form({ mealBudget: "200" }), base);
    expect(r).toEqual({ ok: true, value: { ...base, mealBudget: 200 } });
  });

  it("完整設定", () => {
    const r = parseProfileForm(
      form({ displayName: " 阿明 ", goal: "maintain", mealBudget: "250", dailyBudget: "500", venuesSubmitted: "1", venues: ["cafe", "bento"], restrictions: "不吃牛" }),
      base,
    );
    expect(r.ok && r.value).toMatchObject({ displayName: "阿明", goal: "maintain", mealBudget: 250, dailyBudget: 500, venues: ["cafe", "bento"], restrictions: "不吃牛" });
  });

  it.each([
    [{ displayName: "" }, "暱稱請填 1–20 個字"],
    [{ goal: "bulk" }, "請選擇目標"],
    [{ mealBudget: "10" }, "每餐預算請填 50–10000 的整數"],
    [{ dailyBudget: "abc" }, "每日預算請填 50–10000 的整數"],
    [{ venuesSubmitted: "1" }, "常吃類型至少選一個"],
    [{ venuesSubmitted: "1", venues: "night-market" }, "常吃類型至少選一個"],
    [{ restrictions: "x".repeat(101) }, "飲食限制請在 100 字以內"],
  ])("錯誤輸入 %o", (fields, error) => {
    expect(parseProfileForm(form(fields), base)).toEqual({ ok: false, error });
  });
});
