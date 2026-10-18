import { ACTIVITY_LABELS, SEX_LABELS, type Activity, type Body, type Sex } from "@/lib/types";

export const BODY_PRIVACY_NOTE = "這些資料只用來讓伊緹給你個人化的份量建議，不會公開，也不會提供給其他人。全部選填，隨時可以清除。";

/** 個人化資料欄位（初次設定與「我的」共用），全部選填 */
export function BodyFields({ body }: { body: Body }) {
  return (
    <div className="space-y-4">
      <input type="hidden" name="bodySubmitted" value="1" />
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm font-medium">身高（cm）</span>
          <input name="heightCm" inputMode="decimal" defaultValue={body.heightCm ?? ""} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">體重（kg）</span>
          <input name="weightKg" inputMode="decimal" defaultValue={body.weightKg ?? ""} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">年齡</span>
          <input name="age" inputMode="numeric" defaultValue={body.age ?? ""} className="input mt-1" />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">性別</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(SEX_LABELS) as Sex[]).map((s) => (
            <label key={s} className="chip cursor-pointer border border-border bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium">
              <input type="radio" name="sex" value={s} defaultChecked={body.sex === s} className="sr-only" />
              {SEX_LABELS[s]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">活動量</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
            <label key={a} className="chip cursor-pointer border border-border bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium">
              <input type="radio" name="activity" value={a} defaultChecked={body.activity === a} className="sr-only" />
              {ACTIVITY_LABELS[a]}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">久坐：辦公室為主；輕度：每週運動 1–3 次；中度：3–5 次；高度：幾乎每天</p>
      </fieldset>
      <p className="rounded-2xl bg-ai-soft px-3 py-2 text-xs leading-relaxed">🔒 {BODY_PRIVACY_NOTE}</p>
    </div>
  );
}
