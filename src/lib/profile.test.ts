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

describe("個人化資料", () => {
  const body = (fields: Record<string, string>) => parseProfileForm(form({ bodySubmitted: "1", ...fields }), base);

  it("全部留白就是不提供", () => {
    expect(body({ heightCm: "", weightKg: "", age: "" })).toEqual({ ok: true, value: base });
  });

  it("正確的資料；身高體重可以有小數", () => {
    const r = body({ heightCm: "172.5", weightKg: "68.25", age: "30", sex: "female", activity: "light" });
    expect(r.ok && r.value.body).toEqual({ heightCm: 172.5, weightKg: 68.3, age: 30, sex: "female", activity: "light" });
  });

  it("不在選項內的性別、活動量視為未填", () => {
    const r = body({ sex: "robot", activity: "extreme" });
    expect(r.ok && r.value.body).toMatchObject({ sex: null, activity: null });
  });

  it.each([
    [{ heightCm: "80" }, "身高請填 100–250 之間的數字"],
    [{ weightKg: "abc" }, "體重請填 25–300 之間的數字"],
    [{ age: "12" }, "年齡請填 13–100 的整數"],
    [{ age: "30.5" }, "年齡請填 13–100 的整數"],
  ])("錯誤輸入 %o", (fields, error) => {
    expect(body(fields)).toEqual({ ok: false, error });
  });

  it("沒有 bodySubmitted 時不動個人資料", () => {
    const withBody = { ...base, body: { heightCm: 170, weightKg: 60, age: 25, sex: null, activity: null } };
    const r = parseProfileForm(form({ mealBudget: "200" }), withBody);
    expect(r.ok && r.value.body).toEqual(withBody.body);
  });
});
