import type { Config } from "@netlify/functions";

// 每週日 20:00（台灣時間）＝ 12:00 UTC，請網站送出每週回顧推播
const weeklyPush = async () => {
  const site = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!site || !secret) {
    console.error("weekly-push: URL 或 CRON_SECRET 未設定");
    return;
  }
  const res = await fetch(`${site}/api/cron/weekly-push`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log("weekly-push", res.status, await res.text());
};

export default weeklyPush;

export const config: Config = {
  schedule: "0 12 * * 0",
};
