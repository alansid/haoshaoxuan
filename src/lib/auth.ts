import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_USER_COOKIE } from "./auth-cookie";
import { isDevMode } from "./config";
import { defaultProfile } from "./profile";
import { getStore } from "./store";
import { createSupabaseServerClient } from "./supabase/server";
import type { Profile } from "./types";

export type CurrentUser = { id: string; email: string; name: string };

export { DEV_USER_COOKIE };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDevMode()) {
    const email = (await cookies()).get(DEV_USER_COOKIE)?.value;
    return email ? { id: `dev:${email}`, email, name: email.split("@")[0] } : null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase!.auth.getUser();
  if (!data.user) return null;
  const meta = data.user.user_metadata as { full_name?: string; name?: string };
  const email = data.user.email ?? "";
  return { id: data.user.id, email, name: meta.full_name || meta.name || email.split("@")[0] };
}

/** 沒登入就導到登入頁，登入後回到 next 指定的頁面 */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** 登入使用者與個人設定；還沒有設定時給預設值（尚未完成初次設定） */
export async function requireProfile(next: string): Promise<{ user: CurrentUser; profile: Profile }> {
  const user = await requireUser(next);
  const profile = (await (await getStore()).getProfile(user.id)) ?? defaultProfile(user.id, user.name.slice(0, 20));
  return { user, profile };
}

/** 登入後要去的頁面：還沒做過初次設定就先去設定，設定完再回到 next */
export async function afterLoginPath(userId: string, next: string): Promise<string> {
  const profile = await (await getStore()).getProfile(userId);
  return profile?.onboarded ? next : `/onboarding?next=${encodeURIComponent(next)}`;
}
