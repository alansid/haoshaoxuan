"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AI_NAME, DISCLAIMER } from "@/lib/brand";
import { extractMealTags, MAX_TURN_CHARS, MAX_TURNS, type ChatTurn, type MealTag } from "@/lib/chat";

const SUGGESTIONS = ["晚餐超商 150 元內吃什麼？", "便當怎麼點比較好？", "今天還能吃多少？"];
const ERROR_MARK = "[[錯誤]]";

function mealHref(m: MealTag): string {
  const params = new URLSearchParams({ items: m.items.join("＋") });
  if (m.price !== null) params.set("cost", String(m.price));
  if (m.kcal !== null) params.set("kcal", String(m.kcal));
  return `/log/new?${params}`;
}

/** 串流中還沒收完的標記（例如結尾的「[[記錄:烤地」）先不顯示 */
function hidePartialTag(text: string): string {
  const open = text.lastIndexOf("[[");
  return open !== -1 && !text.slice(open).includes("]]") ? text.slice(0, open) : text;
}

function AssistantBubble({ content, streaming }: { content: string; streaming: boolean }) {
  const { text, meals } = extractMealTags(hidePartialTag(content));
  return (
    <div className="flex gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ai-soft text-sm" aria-hidden>
        🌿
      </span>
      <div className="max-w-[85%] space-y-2 rounded-3xl rounded-tl-md bg-surface px-4 py-3 text-sm shadow-[0_1px_3px_rgba(60,50,30,0.06)]">
        <p className="whitespace-pre-wrap leading-relaxed">{text || (streaming ? `${AI_NAME}想一下…` : "")}</p>
        {meals.map((m) => (
          <div key={m.items.join("+")} className="flex items-center gap-3 rounded-2xl bg-accent-soft p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{m.items.join(" ＋ ")}</p>
              <p className="text-xs text-muted">
                {[m.price !== null && `約 ${m.price} 元`, m.kcal !== null && `約 ${m.kcal} kcal`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Link href={mealHref(m)} className="btn-primary shrink-0 px-3 py-1.5 text-xs">
              記成一餐
            </Link>
          </div>
        ))}
        {!streaming && text && <p className="text-[11px] text-muted">{DISCLAIMER}</p>}
      </div>
    </div>
  );
}

export function Chat({ initialQuestion }: { initialQuestion: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState(initialQuestion);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; retry: string | null } | null>(null);
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
    const fail = (message: string) => {
      setTurns(turns);
      setError({ message, retry: content });
    };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history(next) }),
      });
      if (!res.ok || !res.body) {
        const message = await res.text();
        if (res.status === 429) setError({ message, retry: null });
        else fail(res.status === 401 ? "請先登入再使用" : message || `${AI_NAME}暫時無法回應，請稍後再試`);
        if (res.status === 429) setTurns(turns);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setTurns([...next, { role: "assistant", content: answer.replace(ERROR_MARK, "").trimEnd() }]);
        bottomRef.current?.scrollIntoView({ block: "end" });
      }
      if (answer.includes(ERROR_MARK)) {
        const partial = answer.replace(ERROR_MARK, "").trim();
        if (partial) {
          setTurns([...next, { role: "assistant", content: partial }]);
          setError({ message: "回答到一半中斷了", retry: null });
        } else {
          fail(`${AI_NAME}暫時無法回應，請稍後再試`);
        }
      } else if (!answer.trim()) {
        fail("沒有收到回覆，請再試一次");
      }
    } catch {
      fail("連線失敗，請檢查網路後再試");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="flex-1 space-y-4">
        {turns.length === 0 && (
          <div className="card text-sm">
            <p className="font-medium">嗨，我是{AI_NAME} 🌿</p>
            <p className="mt-1 text-muted">外食怎麼選、熱量大概多少、預算怎麼抓，都可以問我。我會參考你的紀錄和設定回答。</p>
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-tr-md bg-accent px-4 py-3 text-sm text-white">{t.content}</p>
            </div>
          ) : (
            <AssistantBubble key={i} content={t.content} streaming={streaming && i === turns.length - 1} />
          ),
        )}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-coral-soft px-4 py-3 text-sm">
            <span>{error.message}</span>
            {error.retry && (
              <button type="button" onClick={() => send(error.retry!)} className="shrink-0 font-medium text-coral">
                重試
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-20 space-y-2 bg-background pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((q) => (
            <button key={q} type="button" onClick={() => send(q)} disabled={streaming} className="chip shrink-0 border border-border bg-surface">
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
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
            rows={1}
            placeholder={`問${AI_NAME}任何外食問題…`}
            className="input flex-1 resize-none rounded-3xl"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            aria-label="送出"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-50"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
