import { NextResponse, type NextRequest } from "next/server";
import { SupabaseStore } from "@/lib/store/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Google 登入完成後，Supabase 會帶著一次性的 code 導回這裡，換成登入 session
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await createSupabaseServerClient();
  if (code && supabase) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 用剛登入的同一個 client 讀設定，第一次登入就先去初次設定
      const profile = await new SupabaseStore(supabase).getProfile(data.user.id);
      const target = profile?.onboarded ? next : `/onboarding?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(new URL(target, origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=1", origin));
}
