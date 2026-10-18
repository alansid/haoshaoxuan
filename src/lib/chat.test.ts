import { describe, expect, it } from "vitest";
import { extractMealTags, MAX_TURN_CHARS, MAX_TURNS, parseTurns } from "./chat";

describe("parseTurns", () => {
  it("接受一問一答、以使用者結尾的對話", () => {
    const messages = [
      { role: "user", content: " 嗨 " },
      { role: "assistant", content: "你好" },
      { role: "user", content: "晚餐吃什麼？" },
    ];
    expect(parseTurns({ messages })).toEqual([
      { role: "user", content: "嗨" },
      { role: "assistant", content: "你好" },
      { role: "user", content: "晚餐吃什麼？" },
    ]);
  });

  it.each([
    ["不是物件", null],
    ["沒有 messages", {}],
    ["空陣列", { messages: [] }],
    ["從 assistant 開始", { messages: [{ role: "assistant", content: "a" }, { role: "user", content: "b" }] }],
    ["以 assistant 結尾", { messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }] }],
    ["角色不交替", { messages: [{ role: "user", content: "a" }, { role: "user", content: "b" }] }],
    ["system 角色", { messages: [{ role: "system", content: "a" }] }],
    ["空白內容", { messages: [{ role: "user", content: "   " }] }],
    ["內容過長", { messages: [{ role: "user", content: "x".repeat(MAX_TURN_CHARS + 1) }] }],
    ["則數過多", { messages: Array.from({ length: MAX_TURNS + 1 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "a" })) }],
  ])("拒絕：%s", (_label, body) => {
    expect(parseTurns(body)).toBeNull();
  });
});

describe("extractMealTags", () => {
  it("取出標記並從文字中移除", () => {
    const r = extractMealTags("推薦這組 👇\n[[記錄:烤地瓜＋雞胸肉＋無糖綠茶|140|450]]\n其他問題再問我");
    expect(r.meals).toEqual([{ items: ["烤地瓜", "雞胸肉", "無糖綠茶"], price: 140, kcal: 450 }]);
    expect(r.text).toBe("推薦這組 👇\n\n其他問題再問我");
  });

  it("價格或熱量寫成「約 140 元」也能解析；空白或非數字為 null", () => {
    expect(extractMealTags("[[記錄:飯糰+豆漿|約 70 元|]]").meals).toEqual([{ items: ["飯糰", "豆漿"], price: 70, kcal: null }]);
    expect(extractMealTags("[[記錄:沙拉|不確定|abc]]").meals).toEqual([{ items: ["沙拉"], price: null, kcal: null }]);
  });

  it("可以有多個標記；沒有標記時原文不變", () => {
    expect(extractMealTags("[[記錄:A|1|2]] 或 [[記錄:B|3|4]]").meals).toHaveLength(2);
    expect(extractMealTags("沒有推薦")).toEqual({ text: "沒有推薦", meals: [] });
  });
});
