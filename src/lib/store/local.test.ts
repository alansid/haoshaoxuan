import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MealLogInput } from "@/lib/types";
import { LocalStore } from "./local";

const input: MealLogInput = {
  venue: "convenience",
  items: "雞胸肉＋無糖豆漿",
  cost: 95,
  kcalEst: 240,
  eatenAt: "2026-10-18T04:30:00.000Z",
  note: "",
};

describe("LocalStore", () => {
  let dir: string;
  let store: LocalStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "store-test-"));
    store = new LocalStore(path.join(dir, "store.json"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("新增、讀取、修改、刪除", async () => {
    const created = await store.createLog("u1", input);
    expect(await store.getLog("u1", created.id)).toEqual(created);

    const updated = await store.updateLog("u1", created.id, { ...input, cost: 100 });
    expect(updated?.cost).toBe(100);

    expect(await store.deleteLog("u1", created.id)).toBe(true);
    expect(await store.getLog("u1", created.id)).toBeNull();
    expect(await store.deleteLog("u1", created.id)).toBe(false);
  });

  it("使用者之間互相看不到、改不到", async () => {
    const mine = await store.createLog("u1", input);
    expect(await store.listLogs("u2")).toEqual([]);
    expect(await store.getLog("u2", mine.id)).toBeNull();
    expect(await store.updateLog("u2", mine.id, input)).toBeNull();
    expect(await store.deleteLog("u2", mine.id)).toBe(false);
    expect(await store.listLogs("u1")).toHaveLength(1);
  });

  it("列表依用餐時間新到舊", async () => {
    await store.createLog("u1", { ...input, items: "早", eatenAt: "2026-10-18T00:00:00.000Z" });
    await store.createLog("u1", { ...input, items: "晚", eatenAt: "2026-10-18T12:00:00.000Z" });
    await store.createLog("u1", { ...input, items: "午", eatenAt: "2026-10-18T05:00:00.000Z" });
    expect((await store.listLogs("u1")).map((l) => l.items)).toEqual(["晚", "午", "早"]);
  });

  it("同時寫入不會互相覆蓋", async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => store.createLog("u1", { ...input, items: `第${i}餐` })));
    expect(await store.listLogs("u1")).toHaveLength(20);
  });

  it("AI 對話次數依使用者分開計算", async () => {
    expect(await store.chatCountToday("u1")).toBe(0);
    await store.incrementChatCount("u1");
    expect(await store.incrementChatCount("u1")).toBe(2);
    expect(await store.chatCountToday("u1")).toBe(2);
    expect(await store.chatCountToday("u2")).toBe(0);
  });
});
