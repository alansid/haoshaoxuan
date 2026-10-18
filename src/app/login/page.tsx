import { Suspense } from "react";
import { isDevMode } from "@/lib/config";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "登入｜外食減脂助手" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-bold">登入</h1>
        <p className="mt-1 text-sm text-muted">登入後，飲食紀錄會存在雲端，換手機或電腦也看得到。</p>
      </div>
      <Suspense>
        <LoginForm devMode={isDevMode()} />
      </Suspense>
    </div>
  );
}
