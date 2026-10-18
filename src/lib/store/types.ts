import type { MealLog, MealLogInput, Profile, ProfileInput } from "@/lib/types";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** 以登入使用者身分存取資料；每個方法都只碰得到該使用者自己的資料 */
export interface Store {
  getProfile(userId: string): Promise<Profile | null>;
  saveProfile(userId: string, input: ProfileInput): Promise<Profile>;

  listLogs(userId: string): Promise<MealLog[]>;
  getLog(userId: string, id: string): Promise<MealLog | null>;
  createLog(userId: string, input: MealLogInput): Promise<MealLog>;
  updateLog(userId: string, id: string, input: MealLogInput): Promise<MealLog | null>;
  deleteLog(userId: string, id: string): Promise<boolean>;

  /** 今天（台灣時間）的 AI 對話次數 */
  chatCountToday(userId: string): Promise<number>;
  /** 對話次數 +1，回傳新的次數 */
  incrementChatCount(userId: string): Promise<number>;

  getDailyTip(userId: string, day: string): Promise<string | null>;
  saveDailyTip(userId: string, day: string, text: string): Promise<void>;

  savePushSubscription(userId: string, sub: PushSubscriptionJSON): Promise<void>;
  deletePushSubscription(userId: string, endpoint: string): Promise<void>;
  hasPushSubscription(userId: string): Promise<boolean>;
}

/** 排程推播用：跨使用者讀取，只能在伺服器端、以管理權限使用 */
export interface AdminStore {
  listPushSubscriptions(): Promise<{ userId: string; subscription: PushSubscriptionJSON }[]>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<void>;
  listLogs(userId: string): Promise<MealLog[]>;
  getProfile(userId: string): Promise<Profile | null>;
}
