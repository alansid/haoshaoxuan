import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LocalStore } from "./local";
import { SupabaseAdminStore, SupabaseStore } from "./supabase";
import type { AdminStore, Store } from "./types";

const localStore = new LocalStore();

export async function getStore(): Promise<Store> {
  const supabase = await createSupabaseServerClient();
  return supabase ? new SupabaseStore(supabase) : localStore;
}

/** 排程推播用；正式環境需要 SUPABASE_SERVICE_ROLE_KEY */
export function getAdminStore(): AdminStore {
  const config = supabaseConfig();
  if (!config) return localStore;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY 未設定");
  return new SupabaseAdminStore(createClient(config.url, serviceKey, { auth: { persistSession: false } }));
}

export type { AdminStore, PushSubscriptionJSON, Store } from "./types";
