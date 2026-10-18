import { Suspense } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { isDevMode } from "@/lib/config";
import { LoginForm } from "./LoginForm";

export const metadata = { title: `登入｜${APP_NAME}` };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-10 px-6 py-10 text-center">
      <div className="space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-accent text-4xl shadow-sm" aria-hidden>
          🌿
        </div>
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        <p className="text-muted">{APP_TAGLINE}</p>
      </div>
      <Suspense>
        <LoginForm devMode={isDevMode()} />
      </Suspense>
      <p className="text-xs text-muted">登入即表示同意服務條款與隱私權政策</p>
    </main>
  );
}
