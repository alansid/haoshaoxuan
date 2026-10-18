import { formatTaipei } from "./meal-log-form";
import { VENUE_LABELS, type MealLog } from "./types";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export const MAX_TURNS = 40;
export const MAX_TURN_CHARS = 4000;

export const CHAT_DISCLAIMER = "AI 回覆僅供參考，不是醫療建議；熱量與份量都是估計值。";

export const SYSTEM_PROMPT = `你是「外食減脂助手」網站裡的 AI 營養師，服務對象是在台灣、以外食為主、想要減脂的上班族。請用繁體中文（台灣用語）回答。

你可以做的事：
- 依使用者的用餐場合（便利商店、咖啡廳、便當店等）與預算，建議比較適合減脂的餐點組合與替換方式。
- 估算餐點的熱量與份量，並說明估算依據；數字一律標示為「估計」或「大約」。
- 根據使用者提供的飲食紀錄，指出可以調整的習慣。

界線：
- 你的建議僅供參考，不是醫療或營養處方。使用者提到疾病、懷孕或哺乳、正在服藥、飲食失調，或想用極低熱量、斷食等激烈方式減重時，請溫和提醒先諮詢醫師或營養師，並只給一般性的建議。
- 不要宣稱知道特定店家的即時價格或官方營養標示；價格不確定時直接說不確定。
- 與飲食、作息、減脂無關的問題，簡短說明你只能協助飲食相關的事。

回答方式：先給結論，再列重點。回答盡量精簡，用短段落或簡單的條列，不要用表格。`;

/** 把最近的飲食紀錄整理成給 AI 參考的文字；沒有紀錄時回傳 null */
export function logsContext(logs: MealLog[], limit = 20): string | null {
  if (logs.length === 0) return null;
  const lines = logs.slice(0, limit).map((l) => {
    const parts = [formatTaipei(l.eatenAt), l.venue ? VENUE_LABELS[l.venue] : "其他", l.items];
    if (l.cost !== null) parts.push(`${l.cost} 元`);
    if (l.kcalEst !== null) parts.push(`約 ${l.kcalEst} 大卡`);
    if (l.note) parts.push(`備註：${l.note}`);
    return `- ${parts.join("｜")}`;
  });
  return `以下是使用者最近的飲食紀錄（新到舊，使用者自己填的，可能不完整）。回答時可以參考，但使用者沒問就不用逐筆評論：\n${lines.join("\n")}`;
}

/** 檢查前端送來的對話：角色要一問一答、從使用者開始也以使用者結束，長度有上限 */
export function parseTurns(body: unknown): ChatTurn[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { messages?: unknown }).messages)) return null;
  const raw = (body as { messages: unknown[] }).messages;
  if (raw.length === 0 || raw.length > MAX_TURNS) return null;
  const turns: ChatTurn[] = [];
  for (const [i, m] of raw.entries()) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (role !== expected || typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > MAX_TURN_CHARS) return null;
    turns.push({ role: expected, content: text });
  }
  return turns[turns.length - 1].role === "user" ? turns : null;
}
