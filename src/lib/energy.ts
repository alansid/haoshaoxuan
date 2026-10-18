import type { KcalRange } from "./recommend";
import type { Activity, Body, Goal, MealType } from "./types";

// 個人每日建議熱量：Mifflin-St Jeor 公式估算基礎代謝，乘上活動係數，再依目標調整。
// 這是一般性的估算，不是醫療或營養處方；畫面上一律標示「估算，僅供參考」。

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const GOAL_FACTOR: Record<Goal, number> = {
  "fat-loss": 0.85,
  maintain: 1,
  gain: 1.1,
};

/** 不論公式算出多少，每日建議都不低於這個值，避免建議過度節食 */
export const MIN_DAILY_KCAL = 1200;

/** 各餐占一天的比例 */
const MEAL_SHARE: Record<MealType, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };


const round50 = (n: number) => Math.round(n / 50) * 50;

/** 身高、體重、年齡都有填才能估算；性別不透露時取男女公式的平均，活動量沒填當作久坐 */
export function dailyTarget(body: Body, goal: Goal): number | null {
  const { heightCm, weightKg, age, sex, activity } = body;
  if (heightCm === null || weightKg === null || age === null) return null;
  const sexOffset = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;
  const tdee = bmr * ACTIVITY_FACTOR[activity ?? "sedentary"];
  return Math.max(MIN_DAILY_KCAL, Math.round(tdee * GOAL_FACTOR[goal]));
}

/** 每日建議範圍：目標值上下約 10%，取整到 50 */
export function dailyRange(body: Body, goal: Goal): KcalRange | null {
  const target = dailyTarget(body, goal);
  if (target === null) return null;
  return { min: Math.max(MIN_DAILY_KCAL, round50(target * 0.9)), max: round50(target * 1.1) };
}

/** 某一餐的建議範圍；沒有個人資料時回傳 null，呼叫端改用一般參考範圍 */
export function mealRange(body: Body, goal: Goal, meal: MealType): KcalRange | null {
  const day = dailyRange(body, goal);
  if (!day) return null;
  const share = MEAL_SHARE[meal];
  return { min: round50(day.min * share), max: round50(day.max * share) };
}
