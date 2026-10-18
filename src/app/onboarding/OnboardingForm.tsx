"use client";

import { useActionState } from "react";
import { finishOnboardingAction, type ProfileState } from "../(main)/me/actions";

export function OnboardingForm({ children, next }: { children: React.ReactNode; next: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(finishOnboardingAction, {});
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next} />
      {children}
      {state.error && <p className="text-sm text-coral">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "儲存中…" : "開始使用"}
      </button>
    </form>
  );
}

export function SkipButton({ next }: { next: string }) {
  const [, action, pending] = useActionState<ProfileState, FormData>(finishOnboardingAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="skip" value="1" />
      <input type="hidden" name="next" value={next} />
      <button type="submit" disabled={pending} className="text-sm text-muted">
        略過 ›
      </button>
    </form>
  );
}
