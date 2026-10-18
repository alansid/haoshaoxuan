"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { devLoginAction, googleLoginAction, type LoginState } from "./actions";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginForm({ devMode }: { devMode: boolean }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [googleState, googleLogin, googlePending] = useActionState<LoginState, FormData>(googleLoginAction, {});
  const [devState, devLogin, devPending] = useActionState<LoginState, FormData>(devLoginAction, {});
  const callbackFailed = params.get("error") === "1";

  if (devMode) {
    return (
      <form action={devLogin} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          本機測試模式：還沒設定 Google 登入，輸入任何 email 就能登入。
        </p>
        <label className="block text-left">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" autoComplete="email" required className="input mt-1" />
        </label>
        {devState.error && <p className="text-sm text-coral">{devState.error}</p>}
        <button type="submit" disabled={devPending} className="btn-primary w-full">
          {devPending ? "登入中…" : "登入（測試）"}
        </button>
      </form>
    );
  }

  return (
    <form action={googleLogin} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        disabled={googlePending}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 font-medium shadow-sm disabled:opacity-60"
      >
        <GoogleMark />
        {googlePending ? "前往 Google…" : "使用 Google 登入"}
      </button>
      {(googleState.error || callbackFailed) && (
        <p className="text-sm text-coral">{googleState.error ?? "登入失敗，請再試一次"}</p>
      )}
    </form>
  );
}
