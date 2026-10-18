// 有設定 Supabase 就用 Supabase 存資料與登入；沒有就進入「本機開發模式」：
// 資料寫在專案的 .data/ 資料夾，登入只要填 email，不寄驗證碼。
// 本機開發模式只給開發與測試用，正式環境一定要設定 Supabase。
export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isDevMode(): boolean {
  return supabaseConfig() === null;
}

/** 每人每日 AI 對話上限；沒設定或 0 代表不限 */
export function chatDailyLimit(): number | null {
  const n = Number(process.env.CHAT_DAILY_LIMIT);
  return Number.isInteger(n) && n > 0 ? n : null;
}
