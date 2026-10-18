import { GOAL_LABELS, VENUE_LABELS, VENUES, type Goal, type Profile } from "@/lib/types";

/** 初次設定與「我的」共用的設定欄位 */
export function ProfileFields({ profile, showName }: { profile: Profile; showName?: boolean }) {
  return (
    <div className="space-y-5">
      {showName && (
        <label className="block">
          <span className="text-sm font-medium">暱稱</span>
          <input name="displayName" maxLength={20} required defaultValue={profile.displayName} className="input mt-1" />
        </label>
      )}
      <fieldset>
        <legend className="text-sm font-medium">你的目標</legend>
        <div className="mt-2 flex gap-2">
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <label key={g} className="chip cursor-pointer border border-border bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium">
              <input type="radio" name="goal" value={g} defaultChecked={profile.goal === g} className="sr-only" />
              {GOAL_LABELS[g]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">每餐預算（元）</span>
          <input name="mealBudget" inputMode="numeric" required defaultValue={profile.mealBudget} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">每日外食預算（元）</span>
          <input name="dailyBudget" inputMode="numeric" required defaultValue={profile.dailyBudget} className="input mt-1" />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">常吃哪裡（可複選）</legend>
        <input type="hidden" name="venuesSubmitted" value="1" />
        <div className="mt-2 flex gap-2">
          {VENUES.map((v) => (
            <label key={v} className="chip cursor-pointer border border-border bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium">
              <input type="checkbox" name="venues" value={v} defaultChecked={profile.venues.includes(v)} className="sr-only" />
              {VENUE_LABELS[v]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm font-medium">飲食限制（選填）</span>
        <input name="restrictions" maxLength={100} placeholder="例：不吃牛、乳糖不耐" defaultValue={profile.restrictions} className="input mt-1" />
        <span className="mt-1 block text-xs text-muted">推薦時會排除品名含這些字的品項，用逗號分隔</span>
      </label>
    </div>
  );
}
