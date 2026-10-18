import type { Suggestion } from "./recommend";
import type { MealType, Venue } from "./types";

export const VENUE_ICON: Record<Venue, string> = { convenience: "🏪", cafe: "☕", bento: "🍱" };

/** 從推薦組合直接去「記一餐」，表單會自動帶入 */
export function logHref(s: Suggestion, meal: MealType): string {
  return `/log/new?${new URLSearchParams({ combo: s.id, meal })}`;
}
