import { generateSwapSuggestions } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { defaultProfile } from "@/lib/profile";
import { suggestionById } from "@/lib/recommend";
import { getStore } from "@/lib/store";

// 組合詳情頁的「AI 替換建議」
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });

  const combo = new URL(request.url).searchParams.get("combo") ?? "";
  const suggestion = suggestionById(combo);
  if (!suggestion) return Response.json({ error: "找不到這個組合" }, { status: 404 });

  const profile = (await (await getStore()).getProfile(user.id)) ?? defaultProfile(user.id, user.name);
  try {
    const swaps = await generateSwapSuggestions(suggestion, profile);
    if (!swaps) return Response.json({ error: "替換建議暫時無法載入" }, { status: 502 });
    return Response.json({ swaps }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Swap suggestions failed", error);
    return Response.json({ error: "替換建議暫時無法載入" }, { status: 502 });
  }
}
