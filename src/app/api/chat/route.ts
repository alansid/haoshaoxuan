import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { logsContext, parseTurns, SYSTEM_PROMPT, type ChatTurn } from "@/lib/chat";
import { chatDailyLimit } from "@/lib/config";
import { getStore } from "@/lib/store";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

function hasApiCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** 沒有 AI 金鑰時的假回覆，讓前端與流程可以先開發測試 */
function mockStream(turns: ChatTurn[]): ReadableStream<Uint8Array> {
  const question = turns[turns.length - 1].content.slice(0, 50);
  const reply = `（測試模式：尚未設定 AI 金鑰，這是假回覆）\n\n你問的是：「${question}」。設定 ANTHROPIC_API_KEY 之後，這裡會由 AI 營養師回答。`;
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const ch of reply) {
        controller.enqueue(encoder.encode(ch));
        await new Promise((r) => setTimeout(r, 5));
      }
      controller.close();
    },
  });
}

function claudeStream(turns: ChatTurn[], context: string | null): ReadableStream<Uint8Array> {
  const client = new Anthropic();
  const encoder = new TextEncoder();
  const system: Anthropic.Beta.BetaTextBlockParam[] = [{ type: "text", text: SYSTEM_PROMPT }];
  if (context) system.push({ type: "text", text: context });

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 16000,
          output_config: { effort: "low" },
          // 被安全分類器擋下時，由伺服器自動改用建議的備援模型重跑
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system,
          messages: turns,
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n（這個問題 AI 無法回答，請換個方式問問看。）"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n（回答太長被截斷了，可以請 AI 繼續。）"));
        }
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
          console.error("Claude rate limited", error.status);
          controller.enqueue(encoder.encode("\n\n（目前使用的人比較多，請稍後再試。）"));
        } else if (error instanceof Anthropic.APIError) {
          console.error("Claude API error", error.status, error.message);
          controller.enqueue(encoder.encode("\n\n（AI 暫時無法回應，請稍後再試。）"));
        } else {
          console.error("Chat stream failed", error);
          controller.enqueue(encoder.encode("\n\n（連線中斷，請稍後再試。）"));
        }
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

  const context = logsContext(await store.listLogs(user.id));
  return new Response(claudeStream(turns, context), { headers: TEXT_HEADERS });
}
