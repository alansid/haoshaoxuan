"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { afterLoginPath, DEV_USER_COOKIE } from "@/lib/auth";
import { isDevMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 登入狀態改變後，清掉瀏覽器保留的舊頁面，避免導回時顯示未登入時的畫面 */
function refreshAllPages() {
  revalidatePath("/", "layout");
}

/** 只允許站內相對路徑，避免被拿來導向外部網站 */
function safeNext(raw: FormDataEntryValue | null): string {
  const next = String(raw ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function googleLoginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const next = safeNext(form.get("next"));
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "尚未設定登入服務" };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return { error: "登入失敗，請再試一次" };
  redirect(data.url);
}

/** 本機開發模式：沒有 Google 登入，輸入任何 email 就當作已登入 */
export async function devLoginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!isDevMode()) return { error: "只有本機開發模式可以使用" };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "請輸入正確的 email" };
  (await cookies()).set(DEV_USER_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/" });
  refreshAllPages();
  redirect(await afterLoginPath(`dev:${email}`, safeNext(form.get("next"))));
}

export async function logoutAction(): Promise<void> {
  if (isDevMode()) {
    (await cookies()).delete(DEV_USER_COOKIE);
  } else {
    await (await createSupabaseServerClient())!.auth.signOut();
  }
  refreshAllPages();
  redirect("/login");
}
