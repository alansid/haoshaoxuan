"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { requestCodeAction, verifyCodeAction, type LoginState } from "./actions";

export function LoginForm({ devMode }: { devMode: boolean }) {
  const next = useSearchParams().get("next") ?? "/";
  const [requestState, requestCode, requesting] = useActionState<LoginState, FormData>(requestCodeAction, { step: "email" });
  const [verifyState, verifyCode, verifying] = useActionState<LoginState, FormData>(verifyCodeAction, requestState);

  const state = verifyState.step === "code" && verifyState.error ? verifyState : requestState;

  if (state.step === "code") {
    return (
      <form action={verifyCode} className="space-y-4">
        <p className="text-sm">驗證碼已寄到 {state.email}，請在 email 裡查看。</p>
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="text-sm font-medium">驗證碼</span>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required className="input mt-1" />
        </label>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button type="submit" disabled={verifying} className="btn-primary w-full">
          {verifying ? "驗證中…" : "登入"}
        </button>
      </form>
    );
  }

  return (
    <form action={requestCode} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" autoComplete="email" required className="input mt-1" />
      </label>
      {devMode && <p className="text-xs text-amber-700">本機開發模式：不會寄驗證碼，輸入任何 email 就能登入。</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={requesting} className="btn-primary w-full">
        {requesting ? "處理中…" : devMode ? "登入" : "寄送驗證碼"}
      </button>
    </form>
  );
}
