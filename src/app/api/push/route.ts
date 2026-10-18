import { getCurrentUser } from "@/lib/auth";
import { isPushSubscription } from "@/lib/push";
import { getStore } from "@/lib/store";

// 使用者在「我的」開啟／關閉每週回顧通知
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!isPushSubscription(body)) return Response.json({ error: "訂閱資料不正確" }, { status: 400 });
  await (await getStore()).savePushSubscription(user.id, body);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return Response.json({ error: "缺少 endpoint" }, { status: 400 });
  await (await getStore()).deletePushSubscription(user.id, body.endpoint);
  return Response.json({ ok: true });
}
