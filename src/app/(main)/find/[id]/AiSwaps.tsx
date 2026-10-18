"use client";

import { useEffect, useState } from "react";

type State = { status: "loading" } | { status: "ok"; swaps: string[] } | { status: "error" };

export function AiSwaps({ combo }: { combo: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/swaps?combo=${encodeURIComponent(combo)}`, { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json()) as { swaps?: string[] };
        setState(res.ok && data.swaps ? { status: "ok", swaps: data.swaps } : { status: "error" });
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [combo]);

  return (
    <section className="rounded-3xl bg-ai-soft p-4 text-sm">
      <h2 className="font-medium text-ai">✦ AI 替換建議</h2>
      {state.status === "loading" && <p className="mt-2 animate-pulse text-muted">伊緹想一下…</p>}
      {state.status === "error" && <p className="mt-2 text-muted">替換建議暫時無法載入</p>}
      {state.status === "ok" && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {state.swaps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
