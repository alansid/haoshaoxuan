import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isoToTaipeiLocal } from "@/lib/meal-log-form";
import { VENUE_LABELS, type Venue } from "@/lib/types";
import { createLogAction } from "../actions";
import { LogForm } from "../LogForm";

function intOrNull(raw: string | string[] | undefined): number | null {
  const n = Number(raw);
  return typeof raw === "string" && raw !== "" && Number.isInteger(n) && n >= 0 ? n : null;
}

async function NewLog({ searchParams }: PageProps<"/log/new">) {
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
  ).toString();
  await requireUser(query ? `/log/new?${query}` : "/log/new");

  const venue = typeof params.venue === "string" && params.venue in VENUE_LABELS ? (params.venue as Venue) : null;
  return (
    <LogForm
      action={createLogAction}
      submitLabel="儲存紀錄"
      initial={{
        venue,
        items: typeof params.items === "string" ? params.items.slice(0, 500) : "",
        cost: intOrNull(params.cost),
        kcalEst: intOrNull(params.kcal),
        note: "",
        eatenAtLocal: isoToTaipeiLocal(new Date().toISOString()),
      }}
    />
  );
}

export default function NewLogPage(props: PageProps<"/log/new">) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">記錄一餐</h1>
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <NewLog {...props} />
      </Suspense>
    </div>
  );
}
