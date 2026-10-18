import Anthropic from "@anthropic-ai/sdk";
import { AI_NAME_FULL } from "./brand";
import type { Suggestion } from "./recommend";
import { dailyRange, mealRange } from "./energy";
import { ACTIVITY_LABELS, GOAL_LABELS, MEAL_TYPE_LABELS, MEAL_TYPES, SEX_LABELS, VENUE_LABELS, type MealLog, type Profile } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export function hasApiCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** 共用的請求設定：聊天類用低 effort；被安全分類器擋下時由伺服器改用建議的備援模型 */
export const BASE_PARAMS = {
  model: MODEL,
  output_config: { effort: "low" },
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
} satisfies Partial<Anthropic.Beta.MessageCreateParams>;

/** includeName=false 用在會被存起來重複顯示的內容（例如每日一句），避免改暱稱後還看到舊名字 */
export function profileContext(profile: Profile, { includeName = true } = {}): string {
  const lines = [
    ...(includeName ? [`暱稱：${profile.displayName}`] : []),
    `目標：${GOAL_LABELS[profile.goal]}`,
    `每餐預算：約 ${profile.mealBudget} 元；每日外食預算：約 ${profile.dailyBudget} 元`,
    `常吃：${profile.venues.map((v) => VENUE_LABELS[v]).join("、")}`,
  ];
  if (profile.restrictions) lines.push(`飲食限制：${profile.restrictions}`);
  const b = profile.body;
  const bodyParts = [
    b.heightCm !== null && `身高 ${b.heightCm} cm`,
    b.weightKg !== null && `體重 ${b.weightKg} kg`,
    b.age !== null && `${b.age} 歲`,
    b.sex !== null && `性別 ${SEX_LABELS[b.sex]}`,
    b.activity !== null && `活動量 ${ACTIVITY_LABELS[b.activity]}`,
  ].filter(Boolean);
  if (bodyParts.length) lines.push(`個人資料：${bodyParts.join("、")}`);
  const range = dailyRange(b, profile.goal);
  if (range) {
    const meals = MEAL_TYPES.map((m) => {
      const r = mealRange(b, profile.goal, m)!;
      return `${MEAL_TYPE_LABELS[m]} ${r.min}–${r.max}`;
    }).join("、");
    lines.push(`估算的每日建議熱量：約 ${range.min}–${range.max} 大卡（各餐約：${meals}）。給份量建議時以此為參考，並說明是估算`);
  } else {
    lines.push("沒有足夠的個人資料估算熱量需求，請給一般性的份量建議");
  }
  return `使用者的設定：\n${lines.join("\n")}`;
}

export function logsContext(logs: MealLog[], limit = 20): string | null {
  if (logs.length === 0) return null;
  const fmt = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", weekday: "short" });
  const lines = logs.slice(0, limit).map((l) => {
    const parts = [fmt.format(new Date(l.eatenAt)), MEAL_TYPE_LABELS[l.mealType], l.venue ? VENUE_LABELS[l.venue] : "其他", l.items.join("＋")];
    if (l.cost !== null) parts.push(`${l.cost} 元`);
    if (l.kcalEst !== null) parts.push(`約 ${l.kcalEst} 大卡`);
    if (l.note) parts.push(`備註：${l.note}`);
    return `- ${parts.join("｜")}`;
  });
  return `使用者最近的飲食紀錄（新到舊，使用者自己填的，可能不完整）：\n${lines.join("\n")}`;
}

const PERSONA = `你是「${AI_NAME_FULL}」（中文名伊緹），一位專業又溫暖的營養師，陪伴在台灣、以外食為主的上班族。用繁體中文（台灣用語），語氣像值得信任的朋友：先肯定，再給一個具體可做的小建議，不說教、不用熱量數字壓人。你的建議僅供參考，不是醫療處方；不要宣稱知道特定店家的即時價格，價格一律說「約」。`;

async function shortText(system: string, prompt: string): Promise<string | null> {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    ...BASE_PARAMS,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") return null;
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return text || null;
}

/** 首頁的每日一句建議；沒有金鑰時回傳固定句子 */
export async function generateDailyTip(profile: Profile, logs: MealLog[]): Promise<string | null> {
  if (!hasApiCredentials()) return "（測試模式）今天也記得多喝水，午餐選有蛋白質的主餐會比較不容易餓喔！";
  const context = [profileContext(profile, { includeName: false }), logsContext(logs, 10) ?? "使用者還沒有任何紀錄。"].join("\n\n");
  return shortText(
    `${PERSONA}\n\n請寫「今日小建議」：一句話，40 字以內，具體、正向、跟使用者最近的飲食有關，不要稱呼使用者的名字。只輸出那一句話，不要引號或其他說明。`,
    context,
  );
}

/** 組合詳情頁的 AI 替換建議：最多 3 點，每點一行 */
export async function generateSwapSuggestions(suggestion: Suggestion, profile: Profile): Promise<string[] | null> {
  if (!hasApiCredentials()) {
    return ["（測試模式）飲料換成無糖茶，約可少 100 大卡", "加一顆茶葉蛋，蛋白質更足"];
  }
  const combo = suggestion.items.map((i) => `${i.name}（約 ${i.priceEst} 元、約 ${i.kcalEst} 大卡）`).join("、");
  const text = await shortText(
    `${PERSONA}\n\n使用者在${VENUE_LABELS[suggestion.venue]}看中一個組合，請給 2–3 個替換或加點建議，讓它更適合使用者的目標，並估計價格或熱量的變化。每個建議一行、20–35 字，以「・」開頭，不要其他說明。`,
    `${profileContext(profile)}\n\n組合：${combo}`,
  );
  if (!text) return null;
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[・•\-\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  return lines.length ? lines : null;
}

export const CHAT_SYSTEM = `${PERSONA}

你可以做的事：
- 依使用者的用餐場合（超商、咖啡廳、便當店等）與預算，建議適合使用者目標的餐點組合與替換方式。
- 估算餐點的熱量與份量，說明估算依據；數字一律標示「約」。
- 根據使用者的飲食紀錄，指出可以調整的習慣。

界線：使用者提到疾病、懷孕或哺乳、正在服藥、飲食失調，或想用極低熱量、斷食等激烈方式減重時，請溫和提醒先諮詢醫師或營養師，只給一般性建議。與飲食、作息無關的問題，簡短說明你只能協助飲食相關的事。

回答方式：先給結論，回答精簡，用短段落或「- 」開頭的簡單條列；畫面不支援 Markdown，不要用 **、# 或表格，可以用一兩個 emoji。
當你推薦一個具體的餐點組合時，在該段最後另起一行加上標記，讓使用者可以一鍵記錄：
[[記錄:品項1＋品項2|約價格數字|約熱量數字]]
例如：[[記錄:烤地瓜＋雞胸肉＋無糖綠茶|140|450]]。一則回覆最多 2 個標記，沒有推薦具體組合就不要加。`;
