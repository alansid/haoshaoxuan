import { describe, expect, it } from "vitest";
import { isoToTaipeiLocal, parseMealLogForm, taipeiLocalToIso } from "./meal-log-form";

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const valid = { items: "烤雞腿便當", venue: "bento", cost: "110", kcalEst: "620", eatenAt: "2026-10-18T12:30", note: "" };

describe("台灣時間轉換", () => {
  it("datetime-local 以 UTC+8 解讀，並可轉回", () => {
    const iso = taipeiLocalToIso("2026-10-18T12:30");
    expect(iso).toBe("2026-10-18T04:30:00.000Z");
    expect(isoToTaipeiLocal(iso!)).toBe("2026-10-18T12:30");
  });

  it("格式不對回傳 null", () => {
    expect(taipeiLocalToIso("2026/10/18 12:30")).toBeNull();
    expect(taipeiLocalToIso("")).toBeNull();
  });
});

describe("parseMealLogForm", () => {
  it("正確的表單", () => {
    expect(parseMealLogForm(form(valid))).toEqual({
      ok: true,
      value: { items: "烤雞腿便當", venue: "bento", cost: 110, kcalEst: 620, eatenAt: "2026-10-18T04:30:00.000Z", note: "" },
    });
  });

  it("花費與熱量可以留白，場合不在清單內視為其他", () => {
    const r = parseMealLogForm(form({ ...valid, cost: "", kcalEst: " ", venue: "night-market" }));
    expect(r.ok && r.value).toMatchObject({ cost: null, kcalEst: null, venue: null });
  });

  it.each([
    [{ items: "  " }, "請填吃了什麼"],
    [{ cost: "-5" }, "花費請填 0 以上的整數"],
    [{ cost: "12.5" }, "花費請填 0 以上的整數"],
    [{ kcalEst: "abc" }, "熱量請填 0 以上的整數"],
    [{ eatenAt: "" }, "請填正確的用餐時間"],
    [{ note: "x".repeat(501) }, "備註請在 500 字以內"],
  ])("錯誤輸入 %o", (patch, error) => {
    expect(parseMealLogForm(form({ ...valid, ...patch }))).toEqual({ ok: false, error });
  });
});
