"use client";

import Link from "next/link";
import { useState } from "react";
import { logHref, VENUE_ICON } from "@/lib/links";
import { parseAvoid, recommend } from "@/lib/recommend";
import { MEAL_TYPE_LABELS, MEAL_TYPES, VENUE_LABELS, VENUES, type MealType, type Venue } from "@/lib/types";

const CARD_BG = ["bg-accent-soft", "bg-sun-soft", "bg-coral-soft"];

type Props = {
  initialVenue: Venue;
  initialMeal: MealType;
  mealBudget: number;
  budgetLeftToday: number;
  restrictions: string;
};

export function FindForm({ initialVenue, initialMeal, mealBudget, budgetLeftToday, restrictions }: Props) {
  const [venue, setVenue] = useState<Venue>(initialVenue);
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [budgetText, setBudgetText] = useState(String(mealBudget));
  const [limit, setLimit] = useState(3);

  const budget = Number(budgetText);
  const budgetValid = Number.isInteger(budget) && budget > 0 && budget <= 10_000;
  const suggestions = budgetValid ? recommend({ venue, budget, mealType: meal, avoid: parseAvoid(restrictions) }, limit) : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="用餐地點">
        {VENUES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setVenue(v);
              setLimit(3);
            }}
            aria-pressed={venue === v}
            className={`chip ${venue === v ? "bg-foreground font-medium text-background" : "bg-surface"}`}
          >
            <span aria-hidden>{VENUE_ICON[v]}</span>
            {VENUE_LABELS[v]}
          </button>
        ))}
      </div>

      <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          預算 ≤
          <input
            className="input w-20 py-1 text-center"
            inputMode="numeric"
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            aria-label="這餐預算（元）"
          />
          元
        </label>
        <label className="flex items-center gap-2">
          餐別
          <select className="input w-auto py-1" value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {MEAL_TYPE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <p className="w-full text-muted">
          今天外食預算還剩{" "}
          <span className={budgetLeftToday < 0 ? "font-medium text-coral" : "font-medium text-accent"}>{budgetLeftToday} 元</span>
        </p>
        {!budgetValid && <p className="w-full text-xs text-coral">預算請輸入 1–10000 的整數</p>}
      </div>

      {budgetValid && suggestions.length === 0 && (
        <p className="card text-center text-sm text-muted">這個預算找不到組合，試試調高預算或換類型</p>
      )}

      {suggestions.map((s, i) => (
        <article key={s.id} className="overflow-hidden rounded-3xl bg-surface shadow-[0_1px_3px_rgba(60,50,30,0.06)]">
          <Link href={`/find/${encodeURIComponent(s.id)}?meal=${meal}`} className="block">
            <div className={`flex h-24 items-center justify-center text-5xl ${CARD_BG[i % CARD_BG.length]}`} aria-hidden>
              {VENUE_ICON[s.venue]}
            </div>
            <div className="space-y-2 p-4 pb-2">
              <h2 className="font-bold">{s.items.map((it) => it.name).join(" ＋ ")}</h2>
              <div className="flex flex-wrap gap-1.5">
                {s.tags.map((t) => (
                  <span key={t} className="tag bg-accent-soft text-accent">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted">{s.highlight}</p>
            </div>
          </Link>
          <div className="flex items-center justify-between px-4 pb-4">
            <p>
              <span className="text-lg font-bold">約 {s.totalPrice} 元</span>
              <span className="text-sm text-muted"> · 約 {s.kcalEst} kcal</span>
            </p>
            <Link href={logHref(s, meal)} className="btn-primary px-3 py-1.5 text-sm">
              ＋ 記錄
            </Link>
          </div>
        </article>
      ))}

      {suggestions.length === limit && (
        <button type="button" onClick={() => setLimit((n) => n + 3)} className="btn-secondary w-full">
          看更多
        </button>
      )}
      <p className="text-center text-xs text-muted">價格與熱量皆為估算，僅供參考</p>
    </div>
  );
}
