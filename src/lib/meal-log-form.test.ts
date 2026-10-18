import { describe, expect, it } from "vitest";
import { isoToTaipeiLocal, parseMealLogForm, taipeiLocalToIso } from "./meal-log-form";

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

const valid = {
  mealType: "lunch",
  items: ["烤雞腿便當（飯半碗）", "燙青菜"],
  venue: "bento",
  cost: "145",
  kcalEst: "700",
  eatenAt: "2026-10-18T12:30",
  note: "",
};

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
      value: {
        mealType: "lunch",
        items: ["烤雞腿便當（飯半碗）", "燙青菜"],
        venue: "bento",
        cost: 145,
        kcalEst: 700,
        eatenAt: "2026-10-18T04:30:00.000Z",
        note: "",
      },
    });
  });

  it("空白品項會被略過；地點選其他視為 null", () => {
    const r = parseMealLogForm(form({ ...valid, items: ["  ", "燙青菜", ""], venue: "other" }));
    expect(r.ok && r.value).toMatchObject({ items: ["燙青菜"], venue: null });
  });

  it("熱量留白時，品項都在清單裡就自動估算", () => {
    const r = parseMealLogForm(form({ ...valid, kcalEst: "" }));
    expect(r.ok && r.value.kcalEst).toBe(620 + 60);
  });

  it("熱量留白且有清單外的品項時為 null", () => {
    const r = parseMealLogForm(form({ ...valid, items: ["媽媽的愛心便當"], kcalEst: "" }));
    expect(r.ok && r.value.kcalEst).toBeNull();
  });

  it.each([
    [{ mealType: "brunch" }, "請選擇餐別"],
    [{ items: ["  "] }, "請至少填一個品項"],
    [{ items: Array.from({ length: 11 }, (_, i) => `品項${i}`) }, "品項最多 10 個"],
    [{ items: ["x".repeat(51)] }, "每個品項請在 50 字以內"],
    [{ cost: "-5" }, "花費請填 0 以上的整數"],
    [{ cost: "12.5" }, "花費請填 0 以上的整數"],
    [{ kcalEst: "abc" }, "熱量請填 0 以上的整數"],
    [{ eatenAt: "" }, "請填正確的用餐時間"],
    [{ note: "x".repeat(501) }, "備註請在 500 字以內"],
  ])("錯誤輸入 %o", (patch, error) => {
    expect(parseMealLogForm(form({ ...valid, ...patch }))).toEqual({ ok: false, error });
  });
});
