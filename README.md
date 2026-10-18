# 外食減脂助手（首版）

給以外食為主、想減脂的上班族使用的網站：

- **選餐**：選擇便利商店／咖啡廳／便當店與預算（預設 300 元），推薦適合減脂的組合、說明理由，並提供油炸、含糖品項的替換建議。
- **紀錄**：記錄每一餐的內容、花費、熱量與時間，可修改、刪除，並看最近 7 天的摘要。
- **AI 營養師**：用 Claude 回答外食選擇、熱量與份量估算等問題，會參考使用者最近的飲食紀錄。
- **登入**：email 驗證碼登入（Supabase），紀錄存在雲端、可跨裝置。

餐點價格、熱量、蛋白質都是內建的估計值（`src/lib/catalog.ts`），不是店家官方資料；價格未知的組合不會宣稱符合預算。

## 技術

Next.js 16（App Router）、TypeScript、Tailwind CSS、Supabase（資料庫與登入）、Anthropic Claude API、Vitest。

## 本機開發

```bash
npm install
cp .env.example .env.local   # 先不填也可以
npm run dev                  # http://localhost:3000
npm test
```

`.env.local` 沒填 Supabase 時會進入**本機開發模式**：資料存在 `.data/store.json`，登入只要輸入任何 email、不寄驗證碼。沒填 `ANTHROPIC_API_KEY` 時，AI 營養師回測試用的假回覆。兩者都只適合開發，正式環境一定要設定。

## 設定 Supabase

1. 在 Supabase 建立專案。
2. 在 SQL Editor 執行 `supabase/migrations/0001_init.sql`（建立 `meal_logs`、`chat_usage` 資料表與 RLS）。
3. Authentication → Providers → Email：開啟 Email 登入。Email Templates 的 Magic Link 範本要包含 `{{ .Token }}`，使用者才會收到數字驗證碼。
4. 把 Project URL 與 anon key 填到 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。

## 部署（Netlify）

`netlify.toml` 已設定建置指令。在 Netlify 匯入 GitHub repo 後，到 Site configuration → Environment variables 填入 `.env.example` 列出的變數。

## 環境變數

見 `.env.example`。`CHAT_DAILY_LIMIT` 可設定每人每日 AI 對話上限，預設不限。
