"use client";

import { useActionState } from "react";
import { saveProfileAction, type ProfileState } from "./actions";

export function SettingsForm({ children, submitLabel = "儲存設定" }: { children: React.ReactNode; submitLabel?: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfileAction, {});
  return (
    <form action={action} className="card space-y-5">
      {children}
      {state.error && <p className="text-sm text-coral">{state.error}</p>}
      {state.saved && !pending && <p className="text-sm text-accent">已儲存 ✓</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "儲存中…" : submitLabel}
      </button>
    </form>
  );
}
