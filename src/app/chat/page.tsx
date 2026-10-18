import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { Chat } from "./Chat";

export const metadata = { title: "AI 營養師｜外食減脂助手" };

async function ChatGate() {
  await requireUser("/chat");
  return <Chat />;
}

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI 營養師</h1>
        <p className="mt-1 text-sm text-muted">問外食怎麼選、熱量大概多少，AI 會參考你最近的飲食紀錄回答。</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <ChatGate />
      </Suspense>
    </div>
  );
}
