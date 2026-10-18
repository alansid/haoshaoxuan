export type Venue = "convenience" | "cafe" | "bento";

export const VENUE_LABELS: Record<Venue, string> = {
  convenience: "便利商店",
  cafe: "咖啡廳",
  bento: "便當店",
};

export type ItemRole = "main" | "side" | "drink";

export type MenuItem = {
  id: string;
  venue: Venue;
  role: ItemRole;
  name: string;
  /** 估計價格（新台幣）；null 表示價格未知 */
  priceEst: number | null;
  /** 估計熱量（大卡） */
  kcalEst: number;
  /** 估計蛋白質（公克） */
  proteinG: number;
  tags: ItemTag[];
};

export type ItemTag = "fried" | "sugary" | "high-protein" | "veggie" | "whole-grain";

export type MealLog = {
  id: string;
  userId: string;
  venue: Venue | null;
  items: string;
  /** 實際花費（新台幣）；null 表示沒記 */
  cost: number | null;
  kcalEst: number | null;
  eatenAt: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type MealLogInput = Pick<MealLog, "venue" | "items" | "cost" | "kcalEst" | "eatenAt" | "note">;
