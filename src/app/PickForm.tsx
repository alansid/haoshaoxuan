"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_BUDGET, parseAvoid, recommend, swapsFor, type Suggestion } from "@/lib/recommend";
import { VENUE_LABELS, type Venue } from "@/lib/types";

const VENUES = Object.keys(VENUE_LABELS) as Venue[];

function logHref(venue: Venue, s: Suggestion): string {
  const params = new URLSearchParams({
    venue,
    items: s.items.map((i) => i.name).join("、"),
    kcal: String(s.kcalEst),
  });
  if (s.totalPrice !== null) params.set("cost", String(s.totalPrice));
  return `/log/new?${params}`;
}

function PriceLine({ s, budget }: { s: Suggestion; budget: number }) {
  if (s.totalPrice === null) {
    return <span className="text-amber-700">部分品項價格未知，無法確認是否在 {budget} 元預算內</span>;
  }
  return (
    <span>
      估計 {s.totalPrice} 元<span className="text-muted">（預算 {budget} 元內）</span>
    </span>
  );
}

export function PickForm() {
  const [venue, setVenue] = useState<Venue>("convenience");
  const [budgetText, setBudgetText] = useState(String(DEFAULT_BUDGET));
  const [avoidText, setAvoidText] = useState("");

  const budget = Number(budgetText);
  const budgetValid = Number.isInteger(budget) && budget > 0 && budget <= 10_000;
  const avoid = parseAvoid(avoidText);
  const suggestions = budgetValid ? recommend({ venue, budget, avoid }) : [];
  const swaps = swapsFor(venue, avoid);

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <fieldset>
          <legend className="text-sm font-medium">在哪裡吃？</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {VENUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVenue(v)}
                aria-pressed={venue === v}
                className={`rounded-lg border px-3 py-2 text-sm ${venue === v ? "border-accent bg-accent-soft font-medium" : "border-border"}`}
              >
                {VENUE_LABELS[v]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">這餐預算（元）</span>
            <input
              className="input mt-1"
              inputMode="numeric"
              value={budgetText}
              onChange={(e) => setBudgetText(e.target.value)}
            />
            {!budgetValid && <span className="text-xs text-red-600">請輸入 1–10000 的整數</span>}
          </label>
          <label className="block">
            <span className="text-sm font-medium">不想吃的（選填，用逗號分隔）</span>
            <input
              className="input mt-1"
              placeholder="例如：牛、香菜"
              value={avoidText}
              onChange={(e) => setAvoidText(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">推薦組合</h2>
        {budgetValid && suggestions.length === 0 && (
          <p className="card text-sm text-muted">這個預算和條件下找不到合適的組合，試著提高預算或減少不想吃的項目。</p>
        )}
        {suggestions.map((s) => (
          <article key={s.items.map((i) => i.id).join("+")} className="card space-y-2">
            <h3 className="font-medium">{s.items.map((i) => i.name).join(" ＋ ")}</h3>
            <p className="text-sm">
              <PriceLine s={s} budget={budget} />
              <span className="text-muted">
                {" "}
                · 約 {s.kcalEst} 大卡 · 蛋白質約 {s.proteinG} 公克（估計）
              </span>
            </p>
            <ul className="list-disc pl-5 text-sm text-muted">
              {s.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <Link href={logHref(venue, s)} className="inline-block text-sm font-medium text-accent">
              記錄這餐 →
            </Link>
          </article>
        ))}
      </section>

      {swaps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">想吃這些？可以這樣換</h2>
          <ul className="card space-y-2 text-sm">
            {swaps.map((sw) => (
              <li key={sw.from.id}>
                {sw.from.name} → <span className="font-medium">{sw.to.name}</span>
                <span className="text-muted">，約少 {sw.kcalSaved} 大卡</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
