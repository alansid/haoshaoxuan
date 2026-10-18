import { describe, expect, it } from "vitest";
import { logsContext, MAX_TURN_CHARS, MAX_TURNS, parseTurns } from "./chat";
import type { MealLog } from "./types";

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

describe("logsContext", () => {
  const log: MealLog = {
    id: "1",
    userId: "u",
    venue: "bento",
    items: "烤雞腿便當",
    cost: 110,
    kcalEst: 620,
    eatenAt: "2026-10-18T04:30:00.000Z",
    note: "飯半碗",
    createdAt: "",
    updatedAt: "",
  };

  it("沒有紀錄回傳 null", () => {
    expect(logsContext([])).toBeNull();
  });

  it("每筆紀錄一行，包含場合、內容、花費、熱量與備註", () => {
    const text = logsContext([log, { ...log, id: "2", venue: null, cost: null, kcalEst: null, note: "" }])!;
    const lines = text.split("\n").filter((l) => l.startsWith("- "));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("便當店｜烤雞腿便當｜110 元｜約 620 大卡｜備註：飯半碗");
    expect(lines[1]).toContain("其他｜烤雞腿便當");
    expect(lines[1]).not.toContain("元");
  });

  it("最多取 limit 筆", () => {
    const logs = Array.from({ length: 30 }, (_, i) => ({ ...log, id: String(i) }));
    expect(logsContext(logs, 5)!.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(5);
  });
});
