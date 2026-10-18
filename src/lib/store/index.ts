import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LocalStore } from "./local";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

const localStore = new LocalStore();

export async function getStore(): Promise<Store> {
  const supabase = await createSupabaseServerClient();
  return supabase ? new SupabaseStore(supabase) : localStore;
}

export type { Store } from "./types";
