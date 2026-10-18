import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { mealTypeAt } from "@/lib/recommend";
import { todaySummary } from "@/lib/stats";
import { getStore } from "@/lib/store";
import { MEAL_TYPE_LABELS, type MealType } from "@/lib/types";
import { FindForm } from "./FindForm";

async function Find({ searchParams }: PageProps<"/find">) {
  const { meal } = await searchParams;
  const { user, profile } = await requireProfile("/find");
  const logs = await (await getStore()).listLogs(user.id);
  const mealType: MealType = typeof meal === "string" && meal in MEAL_TYPE_LABELS ? (meal as MealType) : mealTypeAt(new Date());

  return (
    <>
      <h1 className="text-2xl font-bold">{MEAL_TYPE_LABELS[mealType]}吃什麼？</h1>
      <FindForm
        initialVenue={profile.venues[0] ?? "convenience"}
        initialMeal={mealType}
        mealBudget={profile.mealBudget}
        budgetLeftToday={todaySummary(logs, profile.dailyBudget).budgetLeft}
        restrictions={profile.restrictions}
      />
    </>
  );
}

export default function FindPage(props: PageProps<"/find">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <Find {...props} />
      </Suspense>
    </div>
  );
}
