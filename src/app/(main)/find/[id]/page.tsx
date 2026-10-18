import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { mealRange } from "@/lib/energy";
import { DISCLAIMER } from "@/lib/brand";
import { suggestionById } from "@/lib/recommend";
import { MEAL_TYPE_LABELS, VENUE_LABELS, type MealType } from "@/lib/types";
import { logHref, VENUE_ICON } from "@/lib/links";
import { AiSwaps } from "./AiSwaps";

async function Detail({ params, searchParams }: PageProps<"/find/[id]">) {
  const [{ id }, { meal }] = await Promise.all([params, searchParams]);
  const comboId = decodeURIComponent(id);
  const { profile } = await requireProfile(`/find/${id}`);
  const mealType: MealType = typeof meal === "string" && meal in MEAL_TYPE_LABELS ? (meal as MealType) : "lunch";
  const s = suggestionById(comboId, mealType, mealRange(profile.body, profile.goal, mealType));
  if (!s) notFound();

  const question = `${VENUE_LABELS[s.venue]}的「${s.items.map((i) => i.name).join("＋")}」適合我嗎？可以怎麼調整？`;

  return (
    <div className="space-y-4">
      <Link href={`/find?meal=${mealType}`} className="text-sm text-muted">
        ‹ 返回
      </Link>
      <header className="space-y-1">
        <p className="text-4xl" aria-hidden>
          {VENUE_ICON[s.venue]}
        </p>
        <h1 className="text-xl font-bold">{s.items.map((i) => i.name).join(" ＋ ")}</h1>
        <p className="text-sm text-muted">
          {VENUE_LABELS[s.venue]} · 約 {s.totalPrice} 元 · 約 {s.kcalEst} kcal · 蛋白質約 {s.proteinG} g
        </p>
      </header>

      <section className="card space-y-2 text-sm">
        <h2 className="font-medium">品項</h2>
        <ul className="space-y-1">
          {s.items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>{i.name}</span>
              <span className="text-muted">
                約 {i.priceEst} 元 · 約 {i.kcalEst} kcal
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2 text-sm">
        <h2 className="font-medium">為什麼推薦</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          {s.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <AiSwaps combo={s.id} />

      <p className="text-center text-xs text-muted">熱量與價格皆為估算，{DISCLAIMER}</p>

      <div className="grid grid-cols-2 gap-3">
        <Link href={logHref(s, mealType)} className="btn-primary text-center">
          記到今天
        </Link>
        <Link href={`/chat?q=${encodeURIComponent(question)}`} className="btn-secondary text-center">
          問 AI
        </Link>
      </div>
    </div>
  );
}

export default function DetailPage(props: PageProps<"/find/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
      <Detail {...props} />
    </Suspense>
  );
}
