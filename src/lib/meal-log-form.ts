import { VENUE_LABELS, type MealLogInput, type Venue } from "./types";

export type FormResult = { ok: true; value: MealLogInput } | { ok: false; error: string };

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

export function formatTaipei(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function parseMealLogForm(form: FormData): FormResult {
  const items = String(form.get("items") ?? "").trim();
  if (!items) return { ok: false, error: "請填吃了什麼" };
  if (items.length > 500) return { ok: false, error: "餐點內容請在 500 字以內" };

  const venueRaw = String(form.get("venue") ?? "");
  const venue = venueRaw in VENUE_LABELS ? (venueRaw as Venue) : null;

  const cost = optionalInt(form.get("cost"), "花費");
  if (typeof cost === "string") return { ok: false, error: cost };
  const kcalEst = optionalInt(form.get("kcalEst"), "熱量");
  if (typeof kcalEst === "string") return { ok: false, error: kcalEst };

  const eatenAt = taipeiLocalToIso(String(form.get("eatenAt") ?? ""));
  if (!eatenAt) return { ok: false, error: "請填正確的用餐時間" };

  const note = String(form.get("note") ?? "").trim();
  if (note.length > 500) return { ok: false, error: "備註請在 500 字以內" };

  return { ok: true, value: { venue, items, cost, kcalEst, eatenAt, note } };
}
