import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_USER_COOKIE } from "@/lib/auth-cookie";
import { supabaseConfig } from "@/lib/config";

/** 不用登入就能看的頁面；其餘頁面都要登入（頁面與 Server Action 裡仍會再檢查一次） */
const PUBLIC = ["/login", "/auth"];

function isProtected(pathname: string): boolean {
  return !PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function toLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

// 1. 未登入就進需要登入的頁面時，在渲染前直接導到登入頁
// 2. 有設定 Supabase 時，順便更新登入 session（換發過期的 token）
export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  if (!config) {
    if (isProtected(request.nextUrl.pathname) && !request.cookies.get(DEV_USER_COOKIE)) return toLogin(request);
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user && isProtected(request.nextUrl.pathname)) return toLogin(request);
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
