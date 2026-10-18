import { addDays, taipeiDay, weekStart } from "./dates";
import type { MealLog } from "./types";

export type Badge = { id: string; name: string; description: string; icon: string };

/** 連續紀錄天數：到今天為止（今天還沒記的話算到昨天）每天至少記一餐 */
export function streak(logs: MealLog[], today = taipeiDay()): number {
  const days = new Set(logs.map((l) => taipeiDay(new Date(l.eatenAt))));
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

const STREAK_BADGES = [
  { days: 3, id: "streak-3", name: "三天起步", icon: "🌱" },
  { days: 7, id: "streak-7", name: "一週不間斷", icon: "🏅" },
  { days: 30, id: "streak-30", name: "一個月不間斷", icon: "🏆" },
] as const;

/** 依連續天數，下一個可以拿到的徽章與還差幾天 */
export function nextStreakBadge(current: number): { name: string; daysLeft: number; target: number } | null {
  const next = STREAK_BADGES.find((b) => b.days > current);
  return next ? { name: next.name, daysLeft: next.days - current, target: next.days } : null;
}

export function dailyCosts(logs: MealLog[]): Map<string, number> {
  const costs = new Map<string, number>();
  for (const l of logs) {
    const day = taipeiDay(new Date(l.eatenAt));
    costs.set(day, (costs.get(day) ?? 0) + (l.cost ?? 0));
  }
  return costs;
}

export function badges(logs: MealLog[], dailyBudget: number, today = taipeiDay()): Badge[] {
  const result: Badge[] = [];
  if (logs.length > 0) result.push({ id: "first-log", name: "第一筆紀錄", description: "開始記錄外食", icon: "✏️" });
  const current = streak(logs, today);
  for (const b of STREAK_BADGES) {
    if (current >= b.days) result.push({ id: b.id, name: b.name, description: `連續 ${b.days} 天都有記錄`, icon: b.icon });
  }
  // 最近 7 天至少記 5 天，而且每個有記的日子都沒超過每日預算
  const costs = dailyCosts(logs);
  const recentDays = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).filter((d) => costs.has(d));
  if (recentDays.length >= 5 && recentDays.every((d) => costs.get(d)! <= dailyBudget)) {
    result.push({ id: "budget-keeper", name: "預算守門員", description: "最近一週花費都在預算內", icon: "💰" });
  }
  return result;
}

export type DaySummary = { meals: MealLog[]; cost: number; kcal: number; kcalUnknown: boolean; budgetLeft: number };

export function todaySummary(logs: MealLog[], dailyBudget: number, today = taipeiDay()): DaySummary {
  const meals = logs
    .filter((l) => taipeiDay(new Date(l.eatenAt)) === today)
    .sort((a, b) => a.eatenAt.localeCompare(b.eatenAt));
  const cost = meals.reduce((s, l) => s + (l.cost ?? 0), 0);
  return {
    meals,
    cost,
    kcal: meals.reduce((s, l) => s + (l.kcalEst ?? 0), 0),
    kcalUnknown: meals.some((l) => l.kcalEst === null),
    budgetLeft: dailyBudget - cost,
  };
}

export type WeekSummary = {
  start: string;
  days: { day: string; cost: number; kcal: number; meals: number }[];
  totalCost: number;
  meals: number;
  daysLogged: number;
  daysWithinBudget: number;
  avgKcal: number | null;
};

/** 本週（週一到週日）每天的花費、熱量與餐數 */
export function weekSummary(logs: MealLog[], dailyBudget: number, today = taipeiDay()): WeekSummary {
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    const dayLogs = logs.filter((l) => taipeiDay(new Date(l.eatenAt)) === day);
    return {
      day,
      cost: dayLogs.reduce((s, l) => s + (l.cost ?? 0), 0),
      kcal: dayLogs.reduce((s, l) => s + (l.kcalEst ?? 0), 0),
      meals: dayLogs.length,
    };
  });
  const logged = days.filter((d) => d.meals > 0);
  const withKcal = logged.filter((d) => d.kcal > 0);
  return {
    start,
    days,
    totalCost: days.reduce((s, d) => s + d.cost, 0),
    meals: logged.reduce((s, d) => s + d.meals, 0),
    daysLogged: logged.length,
    daysWithinBudget: logged.filter((d) => d.cost <= dailyBudget).length,
    avgKcal: withKcal.length ? Math.round(withKcal.reduce((s, d) => s + d.kcal, 0) / withKcal.length) : null,
  };
}

const SUGARY_WORDS = ["奶茶", "全糖", "焦糖", "糖漿", "可樂", "汽水"];
const FRIED_WORDS = ["炸", "排骨", "酥"];

/** 依最近 7 天的紀錄，給下週一個小挑戰（規則式，不用 AI） */
export function weeklyChallenge(logs: MealLog[], dailyBudget: number, today = taipeiDay()): string {
  const since = addDays(today, -6);
  const recent = logs.filter((l) => taipeiDay(new Date(l.eatenAt)) >= since);
  const names = recent.flatMap((l) => l.items);
  const sugary = names.filter((n) => SUGARY_WORDS.some((w) => n.includes(w))).length;
  const fried = names.filter((n) => FRIED_WORDS.some((w) => n.includes(w))).length;
  const costs = dailyCosts(recent);
  const overBudget = [...costs.values()].filter((c) => c > dailyBudget).length;
  const daysLogged = costs.size;

  if (daysLogged < 4) return "下週試著記錄 5 天，每天記一餐就好";
  if (sugary >= 2) return `這週喝了 ${sugary} 次含糖飲料，下週試著換成無糖 3 次`;
  if (fried >= 2) return `這週吃了 ${fried} 次油炸，下週試著換成烤的或滷的 3 次`;
  if (overBudget >= 2) return "下週試著讓 5 天的外食花費都在預算內";
  return "下週試試 3 次咖啡廳輕食，換換口味";
}
