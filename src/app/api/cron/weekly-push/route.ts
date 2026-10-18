import { timingSafeEqual } from "node:crypto";
import { sendWeeklyPush } from "@/lib/push";
import { getAdminStore } from "@/lib/store";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(given);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// 由排程（netlify/functions/weekly-push.mts）每週日晚上呼叫
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await sendWeeklyPush(getAdminStore());
    return Response.json(result);
  } catch (error) {
    console.error("Weekly push failed", error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
