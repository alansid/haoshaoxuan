import { estimateKcal } from "./recommend";
import { MEAL_TYPE_LABELS, VENUE_LABELS, type MealLogInput, type MealType, type Venue } from "./types";

export type FormResult = { ok: true; value: MealLogInput } | { ok: false; error: string };

export const MAX_ITEMS = 10;

function optionalInt(raw: FormDataEntryValue | null, label: string): number | null | string {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0 || n > 100_000) return `${label}請填 0 以上的整數`;
  return n;
}

/** 表單用的是台灣時間（datetime-local，例如 2026-10-18T12:30），轉成帶時區的 ISO 字串 */
export function taipeiLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+08:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isoToTaipeiLocal(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

export function parseMealLogForm(form: FormData): FormResult {
  const mealTypeRaw = String(form.get("mealType") ?? "");
  if (!(mealTypeRaw in MEAL_TYPE_LABELS)) return { ok: false, error: "請選擇餐別" };
  const mealType = mealTypeRaw as MealType;

  const items = form
    .getAll("items")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (items.length === 0) return { ok: false, error: "請至少填一個品項" };
  if (items.length > MAX_ITEMS) return { ok: false, error: `品項最多 ${MAX_ITEMS} 個` };
  if (items.some((i) => i.length > 50)) return { ok: false, error: "每個品項請在 50 字以內" };

  const venueRaw = String(form.get("venue") ?? "");
  const venue = venueRaw in VENUE_LABELS ? (venueRaw as Venue) : null;

  const cost = optionalInt(form.get("cost"), "花費");
  if (typeof cost === "string") return { ok: false, error: cost };
  const kcalInput = optionalInt(form.get("kcalEst"), "熱量");
  if (typeof kcalInput === "string") return { ok: false, error: kcalInput };
  // 沒有手動填熱量時，品項都在清單裡就自動估算
  const kcalEst = kcalInput ?? estimateKcal(items);

  const eatenAt = taipeiLocalToIso(String(form.get("eatenAt") ?? ""));
  if (!eatenAt) return { ok: false, error: "請填正確的用餐時間" };

  const note = String(form.get("note") ?? "").trim();
  if (note.length > 500) return { ok: false, error: "備註請在 500 字以內" };

  return { ok: true, value: { mealType, venue, items, cost, kcalEst, eatenAt, note } };
}
