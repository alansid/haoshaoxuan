import webpush from "web-push";
import { AI_NAME } from "./brand";
import { addDays, taipeiDay } from "./dates";
import { weekSummary, weeklyChallenge } from "./stats";
import type { AdminStore, PushSubscriptionJSON } from "./store";
import type { MealLog, Profile } from "./types";

export function vapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

export function isPushSubscription(x: unknown): x is PushSubscriptionJSON {
  if (!x || typeof x !== "object") return false;
  const s = x as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return (
    typeof s.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    s.endpoint.length <= 1000 &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string"
  );
}

/** 每週回顧推播的內容：回顧剛結束的這一週（週日晚上送出） */
export function weeklyMessage(profile: Profile, logs: MealLog[], today = taipeiDay()): { title: string; body: string } {
  const week = weekSummary(logs, profile.dailyBudget, today);
  if (week.meals === 0) {
    return { title: `${AI_NAME}想你了 🌿`, body: "這週還沒有紀錄，下週從記一餐開始吧！" };
  }
  const challenge = weeklyChallenge(logs, profile.dailyBudget, today);
  return {
    title: `${AI_NAME}的每週回顧 🎉`,
    body: `這週記了 ${week.meals} 餐、外食花費 ${week.totalCost} 元。下週小挑戰：${challenge}`,
  };
}

export type WeeklyPushResult = { sent: number; removed: number; failed: number };

/** 送出每週回顧給所有訂閱者；訂閱已失效（404/410）就刪掉 */
export async function sendWeeklyPush(store: AdminStore, today = taipeiDay()): Promise<WeeklyPushResult> {
  const vapid = vapidConfig();
  if (!vapid) throw new Error("VAPID 金鑰未設定");
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const result: WeeklyPushResult = { sent: 0, removed: 0, failed: 0 };
  const subs = await store.listPushSubscriptions();
  const byUser = new Map<string, PushSubscriptionJSON[]>();
  for (const s of subs) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s.subscription]);

  for (const [userId, userSubs] of byUser) {
    const profile = await store.getProfile(userId);
    if (!profile) continue;
    const logs = (await store.listLogs(userId)).filter((l) => taipeiDay(new Date(l.eatenAt)) >= addDays(today, -13));
    const payload = JSON.stringify({ ...weeklyMessage(profile, logs, today), url: "/log" });
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(sub, payload, { TTL: 24 * 3600 });
        result.sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await store.deletePushSubscriptionByEndpoint(sub.endpoint);
          result.removed++;
        } else {
          console.error("Push failed", status);
          result.failed++;
        }
      }
    }
  }
  return result;
}
