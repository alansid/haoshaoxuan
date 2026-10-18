import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { addDays, dayLabel, greeting, taipeiDay } from "@/lib/dates";
import { VENUE_ICON } from "@/lib/links";
import { formatTime } from "@/lib/meal-log-form";
import { nextStreakBadge, streak, todaySummary } from "@/lib/stats";
import { getStore } from "@/lib/store";
import { MEAL_TYPE_LABELS, VENUE_LABELS, type MealLog, type MealType } from "@/lib/types";
import { DailyTip } from "./DailyTip";

const MAIN_MEALS: MealType[] = ["breakfast", "lunch", "dinner"];

function StreakCard({ logs }: { logs: MealLog[] }) {
  const today = taipeiDay();
  const days = streak(logs, today);
  const next = nextStreakBadge(days);
  const logged = new Set(logs.map((l) => taipeiDay(new Date(l.eatenAt))));
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <section className="rounded-3xl bg-gradient-to-br from-coral to-[#ff9a6b] p-4 text-white shadow-sm">
      <div className="flex items-center gap-4">
        <span className="text-5xl font-bold tabular-nums">{days}</span>
        <div className="text-sm">
          <p className="text-base font-bold">{days > 0 ? `連續記錄 ${days} 天！` : "今天開始記錄吧！"}</p>
          {next && (
            <p className="opacity-90">
              再 {next.daysLeft} 天拿到「{next.name}」徽章
            </p>
          )}
        </div>
      </div>
      <ol className="mt-3 flex gap-2" aria-label="最近 7 天記錄情況">
        {week.map((d) => (
          <li
            key={d}
            title={dayLabel(d)}
            className={`h-4 w-4 rounded-full ${logged.has(d) ? "bg-white" : "bg-white/35"}`}
          />
        ))}
      </ol>
    </section>
  );
}

function ProgressCard({ logs, dailyBudget }: { logs: MealLog[]; dailyBudget: number }) {
  const s = todaySummary(logs, dailyBudget);
  const mainDone = MAIN_MEALS.filter((m) => s.meals.some((l) => l.mealType === m)).length;
  const ratio = Math.min(s.cost / dailyBudget, 1);
  const r = 34;
  const c = 2 * Math.PI * r;

  return (
    <section className="card flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--accent-soft)" strokeWidth="8" />
          {mainDone > 0 && (
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(c * mainDone) / 3} ${c}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{mainDone}/3</span>
          <span className="text-[10px] text-muted">餐已記錄</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 text-sm">
        <p className="flex justify-between">
          <span>今日花費</span>
          <span className="font-medium">{s.cost} 元</span>
        </p>
        <p className="flex justify-between">
          <span>預算剩餘</span>
          <span className={`font-medium ${s.budgetLeft < 0 ? "text-coral" : "text-accent"}`}>
            {s.budgetLeft < 0 ? `超出 ${-s.budgetLeft}` : s.budgetLeft} 元
          </span>
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-sun-soft" aria-hidden>
          <div className={`h-full rounded-full ${s.budgetLeft < 0 ? "bg-coral" : "bg-sun"}`} style={{ width: `${ratio * 100}%` }} />
        </div>
        {s.kcal > 0 && (
          <p className="text-xs text-muted">
            熱量約 {s.kcal} kcal（估算{s.kcalUnknown ? "，部分餐點未估" : ""}）
          </p>
        )}
      </div>
    </section>
  );
}

/** 現在的台灣時間已經過了哪幾餐：已過且沒記的顯示「補記」，下一餐顯示「幫你挑」 */
function mealSlots(meals: MealLog[], now = new Date()) {
  const hour = (now.getUTCHours() + 8) % 24;
  const passed: Record<MealType, boolean> = { breakfast: hour >= 10, lunch: hour >= 15, dinner: hour >= 22, snack: false };
  const missing = MAIN_MEALS.filter((m) => !meals.some((l) => l.mealType === m));
  return {
    backfill: missing.filter((m) => passed[m]),
    next: missing.find((m) => !passed[m]),
  };
}

function MealRow({ log }: { log: MealLog }) {
  return (
    <Link href={`/log/${log.id}/edit`} className="card flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sun-soft text-xl" aria-hidden>
        {log.venue ? VENUE_ICON[log.venue] : "🍴"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">
          {MEAL_TYPE_LABELS[log.mealType]}
          {log.venue && ` · ${VENUE_LABELS[log.venue]}`}
          <span className="ml-1 text-xs font-normal text-muted">{formatTime(log.eatenAt)}</span>
        </span>
        <span className="block truncate text-xs text-muted">{log.items.join("＋")}</span>
      </span>
      {log.cost !== null && <span className="font-medium tabular-nums">{log.cost}</span>}
    </Link>
  );
}

function MealList({ logs }: { logs: MealLog[] }) {
  const s = todaySummary(logs, 0);
  const { backfill, next } = mealSlots(s.meals);

  return (
    <section className="space-y-2">
      {s.meals.length === 0 && <p className="text-center text-sm text-muted">今天還沒記錄，先找一餐吧 🍽️</p>}
      {s.meals.map((l) => (
        <MealRow key={l.id} log={l} />
      ))}
      {backfill.map((m) => (
        <Link key={m} href={`/log/new?meal=${m}`} className="card flex items-center gap-3 text-sm text-muted">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-xl" aria-hidden>
            ＋
          </span>
          <span className="flex-1">{MEAL_TYPE_LABELS[m]}還沒記錄</span>
          <span className="font-medium text-accent">補記 ›</span>
        </Link>
      ))}
      {next && (
        <Link
          href={`/find?meal=${next}`}
          className="block rounded-3xl border-2 border-dashed border-accent/40 py-3 text-center text-sm font-medium text-accent"
        >
          ＋ {MEAL_TYPE_LABELS[next]}吃什麼？幫你挑
        </Link>
      )}
      <Link href="/log/new" className="block py-1 text-center text-sm text-muted underline">
        記其他餐（點心、宵夜或之前的日子）
      </Link>
    </section>
  );
}

async function Today() {
  const { user, profile } = await requireProfile("/");
  const logs = await (await getStore()).listLogs(user.id);
  const today = taipeiDay();

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{dayLabel(today)}</p>
          <h1 className="text-2xl font-bold">
            {greeting()}，{profile.displayName} 👋
          </h1>
        </div>
        <Link href="/me" aria-label="我的" className="flex h-12 w-12 items-center justify-center rounded-full bg-sun-soft text-2xl">
          🥗
        </Link>
      </header>
      {!profile.onboarded && (
        <Link href="/onboarding" className="card flex items-center justify-between text-sm">
          <span>先告訴伊緹你的目標和預算，推薦會更準 ✨</span>
          <span className="text-accent">設定 ›</span>
        </Link>
      )}
      <StreakCard logs={logs} />
      <ProgressCard logs={logs} dailyBudget={profile.dailyBudget} />
      <MealList logs={logs} />
      <Suspense fallback={<div className="h-20 animate-pulse rounded-3xl bg-ai-soft" />}>
        <DailyTip profile={profile} logs={logs} />
      </Suspense>
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
      <Today />
    </Suspense>
  );
}
