import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AI_TITLE } from "@/lib/brand";
import { Chat } from "./Chat";

export const metadata = { title: AI_TITLE };

async function ChatGate({ searchParams }: PageProps<"/chat">) {
  const { q } = await searchParams;
  await requireUser("/chat");
  return <Chat initialQuestion={typeof q === "string" ? q.slice(0, 500) : ""} />;
}

export default function ChatPage(props: PageProps<"/chat">) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        {AI_TITLE} <span className="text-sm font-normal text-ai">✦ AI</span>
      </h1>
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <ChatGate {...props} />
      </Suspense>
    </div>
  );
}
