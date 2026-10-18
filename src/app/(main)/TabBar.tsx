"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "今日", icon: "🏠" },
  { href: "/find", label: "找外食", icon: "🍽️" },
  { href: "/log", label: "紀錄", icon: "📒" },
  { href: "/chat", label: "問 AI", icon: "💬" },
  { href: "/me", label: "我的", icon: "🙂" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function CurrentTabBar() {
  return <TabBar pathname={usePathname()} />;
}

/** 底部分頁；pathname 為 null 時（預先產生的外框）不標示目前分頁 */
export function TabBar(props: { pathname?: string | null }) {
  if (props.pathname === undefined) return <CurrentTabBar />;
  const { pathname } = props;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur" aria-label="主要分頁">
      <ul className="mx-auto grid max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = pathname !== null && isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "font-medium text-accent" : "text-muted"}`}
              >
                <span className={`text-xl ${active ? "" : "opacity-60 grayscale"}`} aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
