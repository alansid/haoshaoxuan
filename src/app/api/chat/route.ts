import Anthropic from "@anthropic-ai/sdk";
import { BASE_PARAMS, CHAT_SYSTEM, hasApiCredentials, logsContext, profileContext } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { chatDailyLimit } from "@/lib/config";
import { defaultProfile } from "@/lib/profile";
import { parseTurns, type ChatTurn } from "@/lib/chat";
import { getStore } from "@/lib/store";

const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

/** 沒有 AI 金鑰時的假回覆，讓前端與流程可以先開發測試 */
function mockStream(turns: ChatTurn[]): ReadableStream<Uint8Array> {
  const question = turns[turns.length - 1].content.slice(0, 50);
  const reply = `（測試模式：尚未設定 AI 金鑰，這是假回覆）\n\n你問的是：「${question}」。有點餓就選有飽足感的！可以試試這組 👇\n[[記錄:烤地瓜（中）＋即食雞胸肉（原味）＋無糖豆漿|140|470]]`;
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const ch of reply) {
        controller.enqueue(encoder.encode(ch));
        await new Promise((r) => setTimeout(r, 3));
      }
      controller.close();
    },
  });
}

function claudeStream(turns: ChatTurn[], context: string): ReadableStream<Uint8Array> {
  const client = new Anthropic();
  const encoder = new TextEncoder();
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: CHAT_SYSTEM },
    { type: "text", text: context },
  ];

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream({ ...BASE_PARAMS, max_tokens: 16000, system, messages: turns });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n（這個問題我沒辦法回答，換個方式問問看？）"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n（回答太長被截斷了，可以請我繼續。）"));
        }
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
          console.error("Claude rate limited", error.status);
        } else if (error instanceof Anthropic.APIError) {
          console.error("Claude API error", error.status, error.message);
        } else {
          console.error("Chat stream failed", error);
        }
        // 前端看到這個標記會顯示錯誤與「重試」
        controller.enqueue(encoder.encode("\n\n[[錯誤]]"));
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("請先登入", { status: 401, headers: TEXT_HEADERS });

  const turns = parseTurns(await request.json().catch(() => null));
  if (!turns) return new Response("訊息格式不正確或太長", { status: 400, headers: TEXT_HEADERS });

  const store = await getStore();
  const limit = chatDailyLimit();
  if (limit !== null && (await store.chatCountToday(user.id)) >= limit) {
    return new Response(`今天的 AI 對話次數已達上限（${limit} 次），明天再來吧。`, { status: 429, headers: TEXT_HEADERS });
  }
  await store.incrementChatCount(user.id);

  if (!hasApiCredentials()) return new Response(mockStream(turns), { headers: TEXT_HEADERS });

  const [profile, logs] = await Promise.all([store.getProfile(user.id), store.listLogs(user.id)]);
  const context = [profileContext(profile ?? defaultProfile(user.id, user.name)), logsContext(logs) ?? "使用者還沒有任何飲食紀錄。"].join(
    "\n\n",
  );
  return new Response(claudeStream(turns, context), { headers: TEXT_HEADERS });
}
