import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_TC } from "next/font/google";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./login/actions";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "外食減脂助手",
  description: "依外食場合與預算挑選減脂餐點、記錄每一餐，並和 AI 營養師討論。",
};

async function UserStatus() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="text-sm text-accent">
        登入
      </Link>
    );
  }
  return (
    <form action={logoutAction} className="flex items-center gap-2 text-sm">
      <span className="hidden max-w-40 truncate text-muted sm:inline">{user.email}</span>
      <button type="submit" className="text-muted underline">
        登出
      </button>
    </form>
  );
}

const NAV = [
  { href: "/", label: "選餐" },
  { href: "/log", label: "紀錄" },
  { href: "/chat", label: "AI 營養師" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW" className={`${notoSansTC.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-bold">
              外食減脂助手
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              ))}
            </nav>
            <Suspense fallback={<span className="text-sm text-muted">…</span>}>
              <UserStatus />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-xs text-muted">
          價格、熱量與營養數值皆為估計，僅供參考，不是醫療或營養處方。
        </footer>
      </body>
    </html>
  );
}
