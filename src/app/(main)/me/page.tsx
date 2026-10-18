import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { AI_NAME, DISCLAIMER } from "@/lib/brand";
import { isDevMode } from "@/lib/config";
import { badges } from "@/lib/stats";
import { getStore } from "@/lib/store";
import { dailyRange } from "@/lib/energy";
import { logoutAction } from "../../login/actions";
import { clearBodyAction } from "./actions";
import { BodyFields } from "./BodyFields";
import { ProfileFields } from "./ProfileFields";
import { PushToggle } from "./PushToggle";
import { SettingsForm } from "./SettingsForm";

async function Me() {
  const { user, profile } = await requireProfile("/me");
  const logs = await (await getStore()).listLogs(user.id);
  const earned = badges(logs, profile.dailyBudget);
  const range = dailyRange(profile.body, profile.goal);
  const hasBody = Object.values(profile.body).some((v) => v !== null);

  return (
    <div className="space-y-4">
      <section className="card flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sun-soft text-2xl" aria-hidden>
          🙂
        </span>
        <div className="min-w-0">
          <p className="font-bold">{profile.displayName}</p>
          <p className="truncate text-xs text-muted">
            {isDevMode() ? "測試帳號" : "Google 帳號"} · {user.email}
          </p>
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-medium">我的徽章</h2>
        {earned.length === 0 ? (
          <p className="mt-2 text-sm text-muted">記下第一餐就能拿到第一個徽章 ✏️</p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-3 text-center">
            {earned.map((b) => (
              <li key={b.id} className="rounded-2xl bg-sun-soft p-2" title={b.description}>
                <span className="text-2xl" aria-hidden>
                  {b.icon}
                </span>
                <p className="mt-1 text-xs font-medium">{b.name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <PushToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      </section>

      <SettingsForm>
        <ProfileFields profile={profile} showName />
      </SettingsForm>

      <section className="space-y-3">
        <div>
          <h2 className="font-bold">個人資料</h2>
          <p className="text-sm text-muted">
            {range ? `依你的資料，每日建議約 ${range.min}–${range.max} kcal（估算，${DISCLAIMER}）` : "填身高、體重、年齡，伊緹就能估算你的每日建議熱量"}
          </p>
        </div>
        {/* 清除或儲存後依新資料重新建立表單，避免輸入框留著舊值 */}
        <SettingsForm key={JSON.stringify(profile.body)} submitLabel="儲存個人資料">
          <BodyFields body={profile.body} />
        </SettingsForm>
        {hasBody && (
          <form action={clearBodyAction} className="text-center">
            <button type="submit" className="text-sm text-coral underline">
              清除個人資料
            </button>
          </form>
        )}
      </section>

      <details className="card text-sm">
        <summary className="cursor-pointer font-medium">關於與免責聲明</summary>
        <p className="mt-2 leading-relaxed text-muted">
          {AI_NAME}和推薦清單提供的價格、熱量與營養數值都是估計值，{DISCLAIMER}。有疾病、懷孕或特殊飲食需求時，請先諮詢醫師或營養師。
        </p>
      </details>

      <form action={logoutAction}>
        <button type="submit" className="btn-secondary w-full">
          登出
        </button>
      </form>
    </div>
  );
}

export default function MePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">我的</h1>
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <Me />
      </Suspense>
    </div>
  );
}
