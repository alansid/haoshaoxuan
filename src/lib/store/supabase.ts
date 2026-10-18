import type { SupabaseClient } from "@supabase/supabase-js";
import { taipeiDay } from "@/lib/dates";
import type { Activity, Goal, MealLog, MealLogInput, MealType, Profile, ProfileInput, Sex, Venue } from "@/lib/types";
import type { AdminStore, PushSubscriptionJSON, Store } from "./types";

type LogRow = {
  id: string;
  user_id: string;
  meal_type: MealType;
  venue: Venue | null;
  items: string[];
  cost: number | null;
  kcal_est: number | null;
  eaten_at: string;
  note: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
  goal: Goal;
  meal_budget: number;
  daily_budget: number;
  venues: Venue[];
  restrictions: string;
  onboarded: boolean;
  challenge: Profile["challenge"];
  height_cm: number | null;
  weight_kg: number | null;
  sex: Sex | null;
  age: number | null;
  activity: Activity | null;
};

function logFromRow(r: LogRow): MealLog {
  return {
    id: r.id,
    userId: r.user_id,
    mealType: r.meal_type,
    venue: r.venue,
    items: r.items,
    cost: r.cost,
    kcalEst: r.kcal_est,
    eatenAt: r.eaten_at,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function logToRow(input: MealLogInput) {
  return {
    meal_type: input.mealType,
    venue: input.venue,
    items: input.items,
    cost: input.cost,
    kcal_est: input.kcalEst,
    eaten_at: input.eatenAt,
    note: input.note,
  };
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function profileFromRow(r: ProfileRow): Profile {
  return {
    userId: r.user_id,
    displayName: r.display_name,
    goal: r.goal,
    mealBudget: r.meal_budget,
    dailyBudget: r.daily_budget,
    venues: r.venues,
    restrictions: r.restrictions,
    onboarded: r.onboarded,
    challenge: r.challenge,
    body: {
      // numeric 欄位從資料庫回來可能是字串；欄位不存在（migration 未套用）時是 undefined，一律當作沒填
      heightCm: toNumberOrNull(r.height_cm),
      weightKg: toNumberOrNull(r.weight_kg),
      sex: r.sex ?? null,
      age: toNumberOrNull(r.age),
      activity: r.activity ?? null,
    },
  };
}

async function selectProfile(db: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? profileFromRow(data as ProfileRow) : null;
}

async function selectLogs(db: SupabaseClient, userId: string): Promise<MealLog[]> {
  const { data, error } = await db.from("meal_logs").select("*").eq("user_id", userId).order("eaten_at", { ascending: false });
  if (error) throw error;
  return (data as LogRow[]).map(logFromRow);
}

/**
 * 用登入使用者自己的 session 存取資料庫，權限由資料表的 RLS 把關；
 * userId 參數只用來多加一層過濾，不是唯一的保護。
 */
export class SupabaseStore implements Store {
  constructor(private readonly db: SupabaseClient) {}

  getProfile(userId: string): Promise<Profile | null> {
    return selectProfile(this.db, userId);
  }

  async saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
    const { data, error } = await this.db
      .from("profiles")
      .upsert({
        user_id: userId,
        display_name: input.displayName,
        goal: input.goal,
        meal_budget: input.mealBudget,
        daily_budget: input.dailyBudget,
        venues: input.venues,
        restrictions: input.restrictions,
        onboarded: input.onboarded,
        challenge: input.challenge,
        height_cm: input.body.heightCm,
        weight_kg: input.body.weightKg,
        sex: input.body.sex,
        age: input.body.age,
        activity: input.body.activity,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return profileFromRow(data as ProfileRow);
  }

  listLogs(userId: string): Promise<MealLog[]> {
    return selectLogs(this.db, userId);
  }

  async getLog(userId: string, id: string): Promise<MealLog | null> {
    const { data, error } = await this.db.from("meal_logs").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? logFromRow(data as LogRow) : null;
  }

  async createLog(userId: string, input: MealLogInput): Promise<MealLog> {
    const { data, error } = await this.db
      .from("meal_logs")
      .insert({ ...logToRow(input), user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    return logFromRow(data as LogRow);
  }

  async updateLog(userId: string, id: string, input: MealLogInput): Promise<MealLog | null> {
    const { data, error } = await this.db
      .from("meal_logs")
      .update({ ...logToRow(input), updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? logFromRow(data as LogRow) : null;
  }

  async deleteLog(userId: string, id: string): Promise<boolean> {
    const { data, error } = await this.db.from("meal_logs").delete().eq("user_id", userId).eq("id", id).select("id");
    if (error) throw error;
    return data.length > 0;
  }

  async chatCountToday(userId: string): Promise<number> {
    const { data, error } = await this.db
      .from("chat_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("day", taipeiDay())
      .maybeSingle();
    if (error) throw error;
    return (data as { count: number } | null)?.count ?? 0;
  }

  async incrementChatCount(): Promise<number> {
    const { data, error } = await this.db.rpc("increment_chat_usage");
    if (error) throw error;
    return data as number;
  }

  async getDailyTip(userId: string, day: string): Promise<string | null> {
    const { data, error } = await this.db.from("daily_tips").select("text").eq("user_id", userId).eq("day", day).maybeSingle();
    if (error) throw error;
    return (data as { text: string } | null)?.text ?? null;
  }

  async saveDailyTip(userId: string, day: string, text: string): Promise<void> {
    const { error } = await this.db.from("daily_tips").upsert({ user_id: userId, day, text });
    if (error) throw error;
  }

  async savePushSubscription(userId: string, sub: PushSubscriptionJSON): Promise<void> {
    const { error } = await this.db
      .from("push_subscriptions")
      .upsert({ endpoint: sub.endpoint, user_id: userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
    if (error) throw error;
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<void> {
    const { error } = await this.db.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
    if (error) throw error;
  }

  async hasPushSubscription(userId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from("push_subscriptions")
      .select("endpoint", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }
}

/** 用 service role 金鑰的 client（不受 RLS 限制），只給排程推播使用 */
export class SupabaseAdminStore implements AdminStore {
  constructor(private readonly db: SupabaseClient) {}

  async listPushSubscriptions() {
    const { data, error } = await this.db.from("push_subscriptions").select("endpoint, user_id, p256dh, auth");
    if (error) throw error;
    return (data as { endpoint: string; user_id: string; p256dh: string; auth: string }[]).map((r) => ({
      userId: r.user_id,
      subscription: { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
    }));
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    const { error } = await this.db.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
  }

  listLogs(userId: string): Promise<MealLog[]> {
    return selectLogs(this.db, userId);
  }

  getProfile(userId: string): Promise<Profile | null> {
    return selectProfile(this.db, userId);
  }
}
