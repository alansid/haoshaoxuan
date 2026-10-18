export type Venue = "convenience" | "cafe" | "bento";

export const VENUE_LABELS: Record<Venue, string> = {
  convenience: "超商",
  cafe: "咖啡廳",
  bento: "便當",
};

export const VENUES = Object.keys(VENUE_LABELS) as Venue[];

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
};

export const MEAL_TYPES = Object.keys(MEAL_TYPE_LABELS) as MealType[];

export type ItemRole = "main" | "side" | "drink";

export type ItemTag = "fried" | "sugary" | "high-protein" | "veggie" | "whole-grain";

export type MenuItem = {
  id: string;
  venue: Venue;
  role: ItemRole;
  name: string;
  /** 估計價格（新台幣），畫面上一律顯示「約」 */
  priceEst: number;
  /** 估計熱量（大卡） */
  kcalEst: number;
  /** 估計蛋白質（公克） */
  proteinG: number;
  tags: ItemTag[];
};

export type MealLog = {
  id: string;
  userId: string;
  mealType: MealType;
  venue: Venue | null;
  items: string[];
  /** 實際花費（新台幣）；null 表示沒記 */
  cost: number | null;
  kcalEst: number | null;
  eatenAt: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type MealLogInput = Pick<MealLog, "mealType" | "venue" | "items" | "cost" | "kcalEst" | "eatenAt" | "note">;

export type Goal = "fat-loss" | "maintain" | "gain";

export const GOAL_LABELS: Record<Goal, string> = {
  "fat-loss": "減脂",
  maintain: "維持",
  gain: "增肌",
};

export type Profile = {
  userId: string;
  displayName: string;
  goal: Goal;
  /** 每餐預算（元） */
  mealBudget: number;
  /** 每日外食預算（元） */
  dailyBudget: number;
  venues: Venue[];
  restrictions: string;
  onboarded: boolean;
  /** 已接受的每週挑戰；week 是該週週一的日期（台灣時間） */
  challenge: { week: string; text: string } | null;
};

export type ProfileInput = Omit<Profile, "userId">;
