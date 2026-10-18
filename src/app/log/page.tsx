import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { formatTaipei } from "@/lib/meal-log-form";
import { getStore } from "@/lib/store";
import { taipeiDay } from "@/lib/store/types";
import { VENUE_LABELS, type MealLog } from "@/lib/types";

function summarize(logs: MealLog[]) {
  const weekAgo = Date.now() - 7 * 24 * 3600_000;
  const recent = logs.filter((l) => new Date(l.eatenAt).getTime() >= weekAgo);
  const cost = recent.reduce((s, l) => s + (l.cost ?? 0), 0);
  const costUnknown = recent.some((l) => l.cost === null);
  const days = new Set(recent.map((l) => taipeiDay(new Date(l.eatenAt)))).size;
  return { count: recent.length, cost, costUnknown, days };
}

async function LogList() {
  const user = await requireUser("/log");
  const logs = await (await getStore()).listLogs(user.id);

  if (logs.length === 0) {
    return (
      <p className="card text-sm text-muted">
        還沒有紀錄。可以從 <Link href="/" className="text-accent">選餐</Link> 挑一餐記錄，或直接新增。
      </p>
    );
  }

  const week = summarize(logs);
  return (
    <div className="space-y-4">
      <section className="card text-sm">
        <h2 className="font-medium">最近 7 天</h2>
        <p className="mt-1 text-muted">
          記錄了 {week.days} 天、{week.count} 餐，花費合計 {week.cost} 元
          {week.costUnknown && "（部分餐點沒填花費）"}
        </p>
      </section>
      <ul className="space-y-2">
        {logs.map((log) => (
          <li key={log.id}>
            <Link href={`/log/${log.id}/edit`} className="card block hover:border-accent">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{log.items}</span>
                <span className="shrink-0 text-xs text-muted">{formatTaipei(log.eatenAt)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {[
                  log.venue ? VENUE_LABELS[log.venue] : "其他",
                  log.cost !== null ? `${log.cost} 元` : null,
                  log.kcalEst !== null ? `約 ${log.kcalEst} 大卡` : null,
                  log.note || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LogPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">飲食紀錄</h1>
        <Link href="/log/new" className="btn-primary text-sm">
          新增
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <LogList />
      </Suspense>
    </div>
  );
}
