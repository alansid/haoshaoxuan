import type { MealLog, MealLogInput } from "@/lib/types";

export interface Store {
  listLogs(userId: string): Promise<MealLog[]>;
  getLog(userId: string, id: string): Promise<MealLog | null>;
  createLog(userId: string, input: MealLogInput): Promise<MealLog>;
  updateLog(userId: string, id: string, input: MealLogInput): Promise<MealLog | null>;
  deleteLog(userId: string, id: string): Promise<boolean>;
  /** 今天（台灣時間）的 AI 對話次數 */
  chatCountToday(userId: string): Promise<number>;
  /** 對話次數 +1，回傳新的次數 */
  incrementChatCount(userId: string): Promise<number>;
}

/** 以台灣時間（UTC+8）切日 */
export function taipeiDay(date = new Date()): string {
  return new Date(date.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}
