"use client";

import { useRef, useState } from "react";
import { CHAT_DISCLAIMER, MAX_TURN_CHARS, MAX_TURNS, type ChatTurn } from "@/lib/chat";

const EXAMPLES = ["便利商店 150 元內，晚餐怎麼吃比較不會胖？", "排骨便當大概多少熱量？可以怎麼點比較好？", "我最近一週吃得怎麼樣？"];

export function Chat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 只送最近的對話，保持一問一答、從使用者開始
  function history(all: ChatTurn[]): ChatTurn[] {
    const recent = all.slice(-MAX_TURNS);
    return recent[0]?.role === "assistant" ? recent.slice(1) : recent;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setError(null);
    const next: ChatTurn[] = [...turns, { role: "user", content }];
    setTurns([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history(next) }),
      });
      if (!res.ok || !res.body) {
        const message = await res.text();
        setTurns(next.slice(0, -1));
        setInput(content);
        setError(res.status === 401 ? "請先登入再使用 AI 營養師" : message || "發生錯誤，請稍後再試");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setTurns([...next, { role: "assistant", content: answer }]);
        bottomRef.current?.scrollIntoView({ block: "end" });
      }
      if (!answer.trim()) setTurns([...next, { role: "assistant", content: "（沒有收到回覆，請再試一次。）" }]);
    } catch {
      setTurns(next.slice(0, -1));
      setInput(content);
      setError("連線失敗，請檢查網路後再試");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs">{CHAT_DISCLAIMER}</p>

      {turns.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted">可以這樣問：</p>
          {EXAMPLES.map((q) => (
            <button key={q} type="button" onClick={() => send(q)} className="card block w-full text-left text-sm hover:border-accent">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {turns.map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                t.role === "user" ? "bg-accent text-white" : "border border-border bg-surface"
              }`}
            >
              {t.content || (streaming && i === turns.length - 1 ? "思考中…" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          maxLength={MAX_TURN_CHARS}
          rows={2}
          placeholder="問問 AI 營養師…"
          className="input flex-1 resize-none"
        />
        <button type="submit" disabled={streaming || !input.trim()} className="btn-primary self-end">
          送出
        </button>
      </form>
    </div>
  );
}
