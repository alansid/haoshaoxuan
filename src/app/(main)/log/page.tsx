import Link from "next/link";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { addDays, dayLabel, taipeiDay, WEEKDAY_SHORT, weekStart } from "@/lib/dates";
import { VENUE_ICON } from "@/lib/links";
import { badges, streak, weekSummary, weeklyChallenge, type WeekSummary } from "@/lib/stats";
import { getStore } from "@/lib/store";
import { MEAL_TYPE_LABELS, type MealLog, type Profile } from "@/lib/types";
import { acceptChallengeAction } from "../me/actions";

function HeroBadge({ logs, profile }: { logs: MealLog[]; profile: Profile }) {
  const earned = badges(logs, profile.dailyBudget);
  const top = earned[earned.length - 1];
  const days = streak(logs);
  return (
    <section className="rounded-3xl bg-gradient-to-br from-sun to-[#ffcb6b] p-5 text-center text-foreground shadow-sm">
      <p className="text-4xl" aria-hidden>
        {top?.icon ?? "🌱"}
      </p>
      <p className="mt-1 text-lg font-bold">{top?.name ?? "準備出發"}</p>
      <p className="text-sm">{days > 0 ? `已連續記錄 ${days} 天，繼續保持！` : "記下第一餐，就能拿到第一個徽章"}</p>
    </section>
  );
}

function CostChart({ week, dailyBudget }: { week: WeekSummary; dailyBudget: number }) {
  const max = Math.max(dailyBudget, ...week.days.map((d) => d.cost));
  const today = taipeiDay();
  return (
    <section className="card">
      <p className="text-sm">
        <span className="font-medium">每日花費</span>
        <span className="text-muted">
          {" "}
          在預算內的天數 {week.daysWithinBudget}/{week.daysLogged}
        </span>
      </p>
      <div className="mt-3 flex items-end gap-2" role="img" aria-label={`本週每日花費，每日預算 ${dailyBudget} 元`}>
        {week.days.map((d, i) => {
          const over = d.cost > dailyBudget;
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-accent-soft">
                <div
                  className={`w-full rounded-lg ${over ? "bg-coral" : "bg-accent"} ${d.day > today ? "opacity-0" : ""}`}
                  style={{ height: `${(d.cost / max) * 100}%` }}
                  title={`${dayLabel(d.day)} ${d.cost} 元`}
                />
              </div>
              <span className={`text-xs ${d.day === today ? "font-bold" : "text-muted"}`}>{WEEKDAY_SHORT[i]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Challenge({ logs, profile }: { logs: MealLog[]; profile: Profile }) {
  const thisWeek = weekStart(taipeiDay());
  const accepted = profile.challenge?.week === thisWeek ? profile.challenge.text : null;
  return (
    <section className="space-y-3">
      <div className="rounded-3xl bg-ai-soft p-4 text-sm">
        <p className="font-medium text-ai">🎯 {accepted ? "本週挑戰" : "下週小挑戰"}</p>
        <p className="mt-1">{accepted ?? weeklyChallenge(logs, profile.dailyBudget)}</p>
      </div>
      {!accepted && (
        <form action={acceptChallengeAction}>
          <button type="submit" className="btn-primary w-full">
            接受挑戰
          </button>
        </form>
      )}
    </section>
  );
}

function History({ logs }: { logs: MealLog[] }) {
  const byDay = new Map<string, MealLog[]>();
  for (const l of [...logs].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt))) {
    const day = taipeiDay(new Date(l.eatenAt));
    byDay.set(day, [...(byDay.get(day) ?? []), l]);
  }
  return (
    <section className="space-y-4">
      {[...byDay.entries()].slice(0, 30).map(([day, dayLogs]) => (
        <div key={day} className="space-y-2">
          <h3 className="flex justify-between text-sm font-medium">
            <span>{dayLabel(day)}</span>
            <span className="text-muted">{dayLogs.reduce((s, l) => s + (l.cost ?? 0), 0)} 元</span>
          </h3>
          {[...dayLogs].reverse().map((l) => (
            <Link key={l.id} href={`/log/${l.id}/edit`} className="card flex items-center gap-3 py-3">
              <span aria-hidden>{l.venue ? VENUE_ICON[l.venue] : "🍴"}</span>
              <span className="w-8 shrink-0 text-xs text-muted">{MEAL_TYPE_LABELS[l.mealType]}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{l.items.join("＋")}</span>
              {l.cost !== null && <span className="text-sm tabular-nums">{l.cost} 元</span>}
              <span className="text-muted" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
}

function WeekNav({ start, current }: { start: string; current: string }) {
  const prev = addDays(start, -7);
  const next = addDays(start, 7);
  const [, m1, d1] = start.split("-");
  const [, m2, d2] = addDays(start, 6).split("-");
  return (
    <nav className="flex items-center justify-between" aria-label="切換週次">
      <Link href={`/log?week=${prev}`} className="chip bg-surface" aria-label="上一週">
        ‹
      </Link>
      <h2 className="text-lg font-bold">
        {start === current ? "這週的你 🎉" : `${Number(m1)}/${Number(d1)}–${Number(m2)}/${Number(d2)}`}
      </h2>
      {start < current ? (
        <Link href={next === current ? "/log" : `/log?week=${next}`} className="chip bg-surface" aria-label="下一週">
          ›
        </Link>
      ) : (
        <span className="chip invisible" aria-hidden>
          ›
        </span>
      )}
    </nav>
  );
}

async function LogReview({ searchParams }: PageProps<"/log">) {
  const { week: weekParam } = await searchParams;
  const { user, profile } = await requireProfile("/log");
  const logs = await (await getStore()).listLogs(user.id);

  if (logs.length === 0) {
    return (
      <p className="card text-center text-sm text-muted">
        還沒有紀錄。可以從 <Link href="/find" className="text-accent">找外食</Link> 挑一餐記錄，或直接新增。
      </p>
    );
  }

  const current = weekStart(taipeiDay());
  const requested = typeof weekParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekStart(weekParam) : current;
  const start = requested > current ? current : requested;
  const isCurrent = start === current;
  const week = weekSummary(logs, profile.dailyBudget, isCurrent ? taipeiDay() : addDays(start, 6));
  return (
    <div className="space-y-4">
      <WeekNav start={start} current={current} />
      {isCurrent && <HeroBadge logs={logs} profile={profile} />}
      <CostChart week={week} dailyBudget={profile.dailyBudget} />
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold tabular-nums">{week.totalCost.toLocaleString()} 元</p>
          <p className="text-xs text-muted">{isCurrent ? "本週" : "這週"}外食花費</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold tabular-nums">{week.meals} 餐</p>
          <p className="text-xs text-muted">已記錄{week.avgKcal ? ` · 日均約 ${week.avgKcal} kcal` : ""}</p>
        </div>
      </div>
      {isCurrent && <Challenge logs={logs} profile={profile} />}
      <h2 className="pt-2 text-lg font-bold">所有紀錄</h2>
      <History logs={logs} />
    </div>
  );
}

export default function LogPage(props: PageProps<"/log">) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">紀錄</h1>
        <Link href="/log/new" className="btn-primary text-sm">
          ＋ 記一餐
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <LogReview {...props} />
      </Suspense>
    </div>
  );
}
