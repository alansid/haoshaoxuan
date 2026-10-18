import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { taipeiDay } from "@/lib/dates";
import { isoToTaipeiLocal } from "@/lib/meal-log-form";
import { mealTypeAt, suggestionById } from "@/lib/recommend";
import { MEAL_TYPE_LABELS, VENUE_LABELS, type MealType, type Venue } from "@/lib/types";
import { createLogAction } from "../actions";
import { LogForm } from "../LogForm";

const TYPICAL_TIME: Record<MealType, string> = { breakfast: "08:00", lunch: "12:30", dinner: "18:30", snack: "15:30" };

type Params = Awaited<PageProps<"/log/new">["searchParams"]>;

function str(v: Params[string]): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function intOrNull(raw: string | undefined): number | null {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n >= 0 ? n : null;
}

/** 從推薦組合（combo）或 AI 對話的「記成一餐」（items/cost/kcal）帶入表單 */
function prefill(params: Params) {
  const now = new Date();
  const meal = str(params.meal);
  const mealType: MealType = meal && meal in MEAL_TYPE_LABELS ? (meal as MealType) : mealTypeAt(now);
  // 補記今天稍早的餐別時，時間先帶那一餐的常見時刻（例如下午補記午餐 → 12:30）；不會帶入未來的時間
  const nowLocal = isoToTaipeiLocal(now.toISOString());
  const typical = `${taipeiDay(now)}T${TYPICAL_TIME[mealType]}`;
  const eatenAtLocal = mealType !== mealTypeAt(now) && typical < nowLocal ? typical : nowLocal;
  const base = { mealType, note: "", eatenAtLocal };

  const combo = str(params.combo);
  const s = combo ? suggestionById(combo, mealType) : null;
  if (s) {
    return { ...base, venue: s.venue, items: s.items.map((i) => i.name), cost: s.totalPrice, kcalEst: s.kcalEst };
  }
  const venue = str(params.venue);
  const items = str(params.items)
    ?.split(/[＋+、]/)
    .map((i) => i.trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, 10);
  return {
    ...base,
    venue: venue && venue in VENUE_LABELS ? (venue as Venue) : null,
    items: items ?? [],
    cost: intOrNull(str(params.cost)),
    kcalEst: intOrNull(str(params.kcal)),
  };
}

async function NewLog({ searchParams }: PageProps<"/log/new">) {
  const params = await searchParams;
  const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  await requireUser(query ? `/log/new?${query}` : "/log/new");
  const initial = prefill(params);
  // 帶入的內容不同時重新建立表單；否則瀏覽器保留的上一份表單會沿用舊的品項與時間
  return <LogForm key={JSON.stringify(initial)} action={createLogAction} title="記一餐" initial={initial} />;
}

export default function NewLogPage(props: PageProps<"/log/new">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
      <NewLog {...props} />
    </Suspense>
  );
}
