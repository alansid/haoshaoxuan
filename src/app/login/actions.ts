"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_USER_COOKIE } from "@/lib/auth";
import { isDevMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { step: "email"; error?: string } | { step: "code"; email: string; error?: string };

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

export async function requestCodeAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { step: "email", error: "請輸入正確的 email" };

  if (isDevMode()) {
    // 本機開發模式：不寄驗證碼，直接登入
    (await cookies()).set(DEV_USER_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/" });
    refreshAllPages();
    redirect(safeNext(form.get("next")));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase!.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) return { step: "email", error: "寄送驗證碼失敗，請稍後再試" };
  return { step: "code", email };
}

export async function verifyCodeAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const token = String(form.get("code") ?? "").trim();
  if (!/^\d{6,10}$/.test(token)) return { step: "code", email, error: "請輸入 email 收到的數字驗證碼" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase!.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "code", email, error: "驗證碼錯誤或已過期" };
  refreshAllPages();
  redirect(safeNext(form.get("next")));
}

export async function logoutAction(): Promise<void> {
  if (isDevMode()) {
    (await cookies()).delete(DEV_USER_COOKIE);
  } else {
    await (await createSupabaseServerClient())!.auth.signOut();
  }
  refreshAllPages();
  redirect("/");
}
