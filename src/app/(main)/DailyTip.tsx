import { generateDailyTip } from "@/lib/ai";
import { AI_NAME } from "@/lib/brand";
import { taipeiDay } from "@/lib/dates";
import { getStore } from "@/lib/store";
import type { MealLog, Profile } from "@/lib/types";

/** 伊緹的每日一句：每人每天產生一次並存起來；AI 失敗時整塊不顯示，不影響首頁 */
export async function DailyTip({ profile, logs }: { profile: Profile; logs: MealLog[] }) {
  const store = await getStore();
  const day = taipeiDay();
  let tip = await store.getDailyTip(profile.userId, day);
  if (!tip) {
    try {
      tip = await generateDailyTip(profile, logs);
      if (tip) await store.saveDailyTip(profile.userId, day, tip.slice(0, 300));
    } catch (error) {
      console.error("Daily tip failed", error);
      return null;
    }
  }
  if (!tip) return null;
  return (
    <section className="rounded-3xl bg-ai-soft p-4 text-sm">
      <p className="font-medium text-ai">✦ {AI_NAME}的今日小建議</p>
      <p className="mt-1 leading-relaxed">{tip}</p>
    </section>
  );
}
