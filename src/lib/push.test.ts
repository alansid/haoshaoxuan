import { describe, expect, it } from "vitest";
import { defaultProfile } from "./profile";
import { isPushSubscription, weeklyMessage } from "./push";
import type { MealLog } from "./types";

describe("isPushSubscription", () => {
  it("檢查格式", () => {
    expect(isPushSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a", auth: "b" } })).toBe(true);
    expect(isPushSubscription({ endpoint: "http://insecure/x", keys: { p256dh: "a", auth: "b" } })).toBe(false);
    expect(isPushSubscription({ endpoint: "https://x" })).toBe(false);
    expect(isPushSubscription(null)).toBe(false);
  });
});

describe("weeklyMessage", () => {
  const profile = defaultProfile("u", "小明");
  it("沒有紀錄時鼓勵開始", () => {
    expect(weeklyMessage(profile, [], "2026-10-18").body).toContain("下週從記一餐開始");
  });

  it("有紀錄時給本週統計與下週挑戰", () => {
    const log: MealLog = {
      id: "1", userId: "u", mealType: "lunch", venue: "bento", items: ["便當"], cost: 120, kcalEst: 600,
      eatenAt: "2026-10-15T04:00:00.000Z", note: "", createdAt: "", updatedAt: "",
    };
    const m = weeklyMessage(profile, [log], "2026-10-18");
    expect(m.title).toContain("伊緹");
    expect(m.body).toContain("記了 1 餐");
    expect(m.body).toContain("120 元");
    expect(m.body).toContain("下週小挑戰");
  });
});

describe("sendWeeklyPush", () => {
  it("送給每個訂閱；失效的訂閱（410）會被刪除", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    const sent: string[] = [];
    vi.doMock("web-push", () => ({
      default: {
        setVapidDetails: () => {},
        sendNotification: async (sub: { endpoint: string }, payload: string) => {
          if (sub.endpoint.endsWith("gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
          sent.push(`${sub.endpoint} ${JSON.parse(payload).title}`);
        },
      },
    }));
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    const { sendWeeklyPush } = await import("./push");

    const removed: string[] = [];
    const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "p", auth: "a" } });
    const store = {
      listPushSubscriptions: async () => [
        { userId: "u1", subscription: sub("https://push.example/ok") },
        { userId: "u1", subscription: sub("https://push.example/gone") },
        { userId: "no-profile", subscription: sub("https://push.example/other") },
      ],
      deletePushSubscriptionByEndpoint: async (e: string) => {
        removed.push(e);
      },
      listLogs: async () => [],
      getProfile: async (id: string) => (id === "u1" ? defaultProfile("u1", "小明") : null),
    };

    const result = await sendWeeklyPush(store, "2026-10-18");
    expect(result).toEqual({ sent: 1, removed: 1, failed: 0 });
    expect(sent).toEqual(["https://push.example/ok 伊緹想你了 🌿"]);
    expect(removed).toEqual(["https://push.example/gone"]);
    vi.doUnmock("web-push");
  });
});

describe("profileContext", () => {
  it("每日一句這類會被存起來的內容不帶暱稱", async () => {
    const { profileContext } = await import("./ai");
    const profile = defaultProfile("u", "小明");
    expect(profileContext(profile)).toContain("小明");
    expect(profileContext(profile, { includeName: false })).not.toContain("小明");
  });
});
