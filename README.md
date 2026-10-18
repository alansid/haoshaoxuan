# 營養師 AI 助手

給以外食為主、想減脂的上班族使用的網站，視覺依 C-266「溫暖陪伴」風格。底部五個分頁：

- **今日**：連續記錄天數、今天記了幾餐、花費與每日預算剩餘、營養師伊緹的每日一句建議。
- **找外食**：選超商／咖啡廳／便當、餐別與預算，從固定品項清單推薦組合（價格與熱量一律標「約」）；組合詳情有伊緹的 AI 替換建議。
- **紀錄**：每週回顧（徽章、每日花費圖、本週總計、下週小挑戰）與所有紀錄；可新增、編輯、刪除，品項在清單內時自動估算熱量。
- **問 AI**：和伊緹對話，回覆中的具體組合可一鍵「記成一餐」。
- **我的**：目標、每餐／每日預算、常吃類型、飲食限制、徽章、每週回顧推播開關。

登入只用 Google（Supabase Auth）。第一次登入會進入初次設定（可略過）。

## 技術

Next.js 16（App Router、Cache Components）、TypeScript、Tailwind CSS 4、Supabase、Anthropic Claude API、Web Push、Vitest。

## 本機開發

```bash
npm install
npm run dev      # http://localhost:3000
npm test
```

`.env.local` 沒填 Supabase 時是**測試模式**：不需資料庫（資料存 `.data/store.json`），登入頁輸入任何 email 即可；沒填 `ANTHROPIC_API_KEY` 時伊緹回測試用的假回覆。正式環境一定要設定 Supabase。

## 設定 Supabase（資料庫＋Google 登入）

1. 建立 Supabase 專案，在 SQL Editor 執行 `supabase/migrations/0001_init.sql`。
2. Google Cloud Console 建立 OAuth 用戶端（網頁應用程式），已授權的重新導向 URI 填 `https://<專案>.supabase.co/auth/v1/callback`。
3. Supabase → Authentication → Providers → Google：填入上一步的 Client ID 與 Secret 並啟用。
4. Supabase → Authentication → URL Configuration：Site URL 填網站網址，Redirect URLs 加入 `https://<網站>/auth/callback`（本機測試再加 `http://localhost:3000/auth/callback`）。
5. 把 Project URL、anon key、service role key 填到環境變數。

## 每週回顧推播

1. `npx web-push generate-vapid-keys` 產生金鑰，填 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_SUBJECT`。
2. 設定 `CRON_SECRET`。Netlify 會依 `netlify/functions/weekly-push.mts` 在每週日 20:00（台灣時間）呼叫 `/api/cron/weekly-push`。
3. iPhone 需先「加入主畫面」，從主畫面開啟網站才能開啟通知。

## 部署（Netlify）

`netlify.toml` 已設定建置指令。匯入 GitHub repo 後，在 Site configuration → Environment variables 填入 `.env.example` 列出的變數。
