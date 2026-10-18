"use client";

import Link from "next/link";
import { useActionState } from "react";
import { VENUE_LABELS, type MealLogInput } from "@/lib/types";
import type { ActionState } from "./actions";

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  /** 預填值；eatenAtLocal 是台灣時間的 datetime-local 字串 */
  initial: Omit<MealLogInput, "eatenAt"> & { eatenAtLocal: string };
  submitLabel: string;
};

export function LogForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="card space-y-4">
      <label className="block">
        <span className="text-sm font-medium">吃了什麼</span>
        <textarea name="items" required maxLength={500} rows={2} defaultValue={initial.items} className="input mt-1" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">場合</span>
          <select name="venue" defaultValue={initial.venue ?? ""} className="input mt-1">
            <option value="">其他</option>
            {Object.entries(VENUE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">用餐時間</span>
          <input name="eatenAt" type="datetime-local" required defaultValue={initial.eatenAtLocal} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">花費（元，選填）</span>
          <input name="cost" inputMode="numeric" defaultValue={initial.cost ?? ""} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">估計熱量（大卡，選填）</span>
          <input name="kcalEst" inputMode="numeric" defaultValue={initial.kcalEst ?? ""} className="input mt-1" />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium">備註（選填）</span>
        <input name="note" maxLength={500} defaultValue={initial.note} className="input mt-1" />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "儲存中…" : submitLabel}
        </button>
        <Link href="/log" className="btn-secondary">
          取消
        </Link>
      </div>
    </form>
  );
}
