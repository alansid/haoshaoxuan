import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_USER_COOKIE } from "./auth-cookie";
import { isDevMode } from "./config";
import { createSupabaseServerClient } from "./supabase/server";

export type CurrentUser = { id: string; email: string };

export { DEV_USER_COOKIE };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDevMode()) {
    const email = (await cookies()).get(DEV_USER_COOKIE)?.value;
    return email ? { id: `dev:${email}`, email } : null;
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase!.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
}

/** 沒登入就導到登入頁，登入後回到 next 指定的頁面 */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
