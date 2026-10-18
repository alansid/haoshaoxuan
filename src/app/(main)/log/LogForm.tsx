"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { MAX_ITEMS } from "@/lib/meal-log-form";
import { estimateKcal } from "@/lib/recommend";
import { MEAL_TYPE_LABELS, MEAL_TYPES, VENUE_LABELS, VENUES, type MealLogInput } from "@/lib/types";
import type { ActionState } from "./actions";

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  /** 預填值；eatenAtLocal 是台灣時間的 datetime-local 字串 */
  initial: Omit<MealLogInput, "eatenAt"> & { eatenAtLocal: string };
  title: string;
};

function Chips<T extends string>({ name, options, labels, value, onChange }: {
  name: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | "";
  onChange?: (v: T | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className="chip cursor-pointer border border-border bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium">
          <input type="radio" name={name} value={o} defaultChecked={value === o} onChange={() => onChange?.(o)} className="sr-only" />
          {labels[o]}
        </label>
      ))}
    </div>
  );
}

export function LogForm({ action, initial, title }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [items, setItems] = useState<string[]>(initial.items.length ? initial.items : [""]);
  // 用 key 讓新增的欄位有穩定身分，刪除中間的品項時輸入框不會錯位
  const [keys, setKeys] = useState<number[]>(() => items.map((_, i) => i));
  const [kcalText, setKcalText] = useState(initial.kcalEst === null ? "" : String(initial.kcalEst));
  const autoKcal = estimateKcal(items.filter((i) => i.trim()));

  const update = (i: number, v: string) => setItems((xs) => xs.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => {
    setItems((xs) => xs.filter((_, j) => j !== i));
    setKeys((ks) => ks.filter((_, j) => j !== i));
  };
  const add = () => {
    setItems((xs) => [...xs, ""]);
    setKeys((ks) => [...ks, Math.max(-1, ...ks) + 1]);
  };

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/log" className="text-sm text-muted">
          ‹ 取消
        </Link>
        <h1 className="text-lg font-bold">{title}</h1>
        <button type="submit" disabled={pending} className="text-sm font-medium text-accent disabled:opacity-60">
          {pending ? "儲存中…" : "儲存"}
        </button>
      </div>

      <section className="card space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">餐別</legend>
          <Chips name="mealType" options={MEAL_TYPES} labels={MEAL_TYPE_LABELS} value={initial.mealType} />
        </fieldset>
        <label className="block">
          <span className="text-sm font-medium">時間</span>
          <input name="eatenAt" type="datetime-local" required defaultValue={initial.eatenAtLocal} className="input mt-1" />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">地點</legend>
          <Chips name="venue" options={[...VENUES, "other"] as const} labels={{ ...VENUE_LABELS, other: "其他" }} value={initial.venue ?? "other"} />
        </fieldset>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-medium">品項</h2>
        {items.map((item, i) => (
          <div key={keys[i]} className="flex gap-2">
            <input
              name="items"
              value={item}
              onChange={(e) => update(i, e.target.value)}
              maxLength={50}
              placeholder="例如：雞胸肉沙拉"
              aria-label={`品項 ${i + 1}`}
              className="input"
            />
            {items.length > 1 && (
              <button type="button" onClick={() => remove(i)} aria-label={`刪除品項 ${i + 1}`} className="px-2 text-muted">
                ✕
              </button>
            )}
          </div>
        ))}
        {items.length < MAX_ITEMS && (
          <button type="button" onClick={add} className="text-sm font-medium text-accent">
            ＋ 新增品項
          </button>
        )}
      </section>

      <section className="card grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">花費（元）</span>
          <input name="cost" inputMode="numeric" defaultValue={initial.cost ?? ""} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">熱量（kcal）</span>
          <input
            name="kcalEst"
            inputMode="numeric"
            value={kcalText}
            onChange={(e) => setKcalText(e.target.value)}
            placeholder={autoKcal !== null ? `約 ${autoKcal}` : "選填"}
            className="input mt-1"
          />
        </label>
        <p className="col-span-2 text-xs text-muted">
          {autoKcal !== null && !kcalText ? `熱量約 ${autoKcal} kcal（依清單自動估算）` : "熱量可留白；品項都在推薦清單裡時會自動估算"}
        </p>
        <label className="col-span-2 block">
          <span className="text-sm font-medium">備註（選填）</span>
          <input name="note" maxLength={500} defaultValue={initial.note} className="input mt-1" />
        </label>
      </section>

      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}
