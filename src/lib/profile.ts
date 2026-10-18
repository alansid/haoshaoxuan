import { DEFAULT_MEAL_BUDGET } from "./recommend";
import { GOAL_LABELS, VENUE_LABELS, VENUES, type Goal, type Profile, type ProfileInput, type Venue } from "./types";

/** 每日外食預算預設值（PO 確認：三餐外食 900 元） */
export const DEFAULT_DAILY_BUDGET = 900;

export function defaultProfile(userId: string, displayName: string): Profile {
  return {
    userId,
    displayName,
    goal: "fat-loss",
    mealBudget: DEFAULT_MEAL_BUDGET,
    dailyBudget: DEFAULT_DAILY_BUDGET,
    venues: [...VENUES],
    restrictions: "",
    onboarded: false,
    challenge: null,
  };
}

function budget(raw: FormDataEntryValue | null, label: string): number | string {
  const n = Number(String(raw ?? "").trim());
  return Number.isInteger(n) && n >= 50 && n <= 10_000 ? n : `${label}請填 50–10000 的整數`;
}

/** 解析設定表單；只更新表單上有的欄位，其他沿用 current */
export function parseProfileForm(form: FormData, current: Profile): { ok: true; value: ProfileInput } | { ok: false; error: string } {
  const next: ProfileInput = { ...current };

  if (form.has("displayName")) {
    const name = String(form.get("displayName")).trim();
    if (!name || name.length > 20) return { ok: false, error: "暱稱請填 1–20 個字" };
    next.displayName = name;
  }
  if (form.has("goal")) {
    const goal = String(form.get("goal"));
    if (!(goal in GOAL_LABELS)) return { ok: false, error: "請選擇目標" };
    next.goal = goal as Goal;
  }
  if (form.has("mealBudget")) {
    const b = budget(form.get("mealBudget"), "每餐預算");
    if (typeof b === "string") return { ok: false, error: b };
    next.mealBudget = b;
  }
  if (form.has("dailyBudget")) {
    const b = budget(form.get("dailyBudget"), "每日預算");
    if (typeof b === "string") return { ok: false, error: b };
    next.dailyBudget = b;
  }
  if (form.has("venuesSubmitted")) {
    const venues = form.getAll("venues").map(String).filter((v): v is Venue => v in VENUE_LABELS);
    if (venues.length === 0) return { ok: false, error: "常吃類型至少選一個" };
    next.venues = venues;
  }
  if (form.has("restrictions")) {
    const r = String(form.get("restrictions")).trim();
    if (r.length > 100) return { ok: false, error: "飲食限制請在 100 字以內" };
    next.restrictions = r;
  }
  return { ok: true, value: next };
}
