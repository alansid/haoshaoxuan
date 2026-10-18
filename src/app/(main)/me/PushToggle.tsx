"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "not-configured" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on" | "working";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIosBrowserTab(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!vapidPublicKey) return setStatus("not-configured");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus(isIosBrowserTab() ? "ios-needs-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      setStatus((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, [vapidPublicKey]);

  async function enable() {
    setError(null);
    setStatus("working");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setStatus("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!) });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
      if (!res.ok) throw new Error();
      setStatus("on");
    } catch {
      setError("開啟失敗，請稍後再試");
      setStatus("off");
    }
  }

  async function disable() {
    setError(null);
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("關閉失敗，請稍後再試");
      setStatus("on");
    }
  }

  const note: Partial<Record<Status, string>> = {
    "not-configured": "通知功能還在準備中，敬請期待",
    unsupported: "這個瀏覽器不支援通知",
    "ios-needs-install": "iPhone 請先用 Safari 的「分享 → 加入主畫面」，再從主畫面打開才能開啟通知",
    denied: "通知被瀏覽器封鎖了，請到瀏覽器設定裡允許通知",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-medium">每週回顧通知</p>
        <p className="text-xs text-muted">{note[status] ?? "每週日晚上 8 點，伊緹幫你回顧這一週"}</p>
        {error && <p className="text-xs text-coral">{error}</p>}
      </div>
      {(status === "on" || status === "off" || status === "working") && (
        <button
          type="button"
          role="switch"
          aria-checked={status === "on"}
          aria-label="每週回顧通知"
          disabled={status === "working"}
          onClick={status === "on" ? disable : enable}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${status === "on" ? "bg-accent" : "bg-border"} disabled:opacity-60`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${status === "on" ? "left-6" : "left-1"}`} />
        </button>
      )}
    </div>
  );
}
