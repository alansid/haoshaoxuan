export type ChatTurn = { role: "user" | "assistant"; content: string };

export const MAX_TURNS = 40;
export const MAX_TURN_CHARS = 4000;

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

export type MealTag = { items: string[]; price: number | null; kcal: number | null };

const MEAL_TAG_RE = /\[\[記錄:([^|\]]+)\|([^|\]]*)\|([^\]]*)\]\]/g;

/** 從 AI 回覆中取出「記成一餐」標記，並回傳去掉標記後的文字 */
export function extractMealTags(text: string): { text: string; meals: MealTag[] } {
  const meals: MealTag[] = [];
  const cleaned = text.replace(MEAL_TAG_RE, (_m, items: string, price: string, kcal: string) => {
    const toInt = (s: string) => {
      const n = Number(s.replace(/[^\d]/g, ""));
      return s.trim() && Number.isInteger(n) && n > 0 ? n : null;
    };
    const names = items
      .split(/[＋+、]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (names.length) meals.push({ items: names, price: toInt(price), kcal: toInt(kcal) });
    return "";
  });
  return { text: cleaned.replace(/\n{3,}/g, "\n\n").trim(), meals };
}
