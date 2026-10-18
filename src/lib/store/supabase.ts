import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealLog, MealLogInput, Venue } from "@/lib/types";
import { taipeiDay, type Store } from "./types";

type Row = {
  id: string;
  user_id: string;
  venue: Venue | null;
  items: string;
  cost: number | null;
  kcal_est: number | null;
  eaten_at: string;
  note: string;
  created_at: string;
  updated_at: string;
};

function fromRow(r: Row): MealLog {
  return {
    id: r.id,
    userId: r.user_id,
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

function toRow(input: MealLogInput) {
  return {
    venue: input.venue,
    items: input.items,
    cost: input.cost,
    kcal_est: input.kcalEst,
    eaten_at: input.eatenAt,
    note: input.note,
  };
}

/**
 * 用登入使用者自己的 session 存取資料庫，權限由資料表的 RLS 把關；
 * userId 參數只用來多加一層過濾，不是唯一的保護。
 */
export class SupabaseStore implements Store {
  constructor(private readonly db: SupabaseClient) {}

  async listLogs(userId: string): Promise<MealLog[]> {
    const { data, error } = await this.db
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .order("eaten_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(fromRow);
  }

  async getLog(userId: string, id: string): Promise<MealLog | null> {
    const { data, error } = await this.db.from("meal_logs").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Row) : null;
  }

  async createLog(userId: string, input: MealLogInput): Promise<MealLog> {
    const { data, error } = await this.db
      .from("meal_logs")
      .insert({ ...toRow(input), user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    return fromRow(data as Row);
  }

  async updateLog(userId: string, id: string, input: MealLogInput): Promise<MealLog | null> {
    const { data, error } = await this.db
      .from("meal_logs")
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Row) : null;
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
}
