// 日期一律以台灣時間（UTC+8，無日光節約）切日，格式 YYYY-MM-DD

const OFFSET_MS = 8 * 3600_000;
const DAY_MS = 24 * 3600_000;

export function taipeiDay(date = new Date()): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = 週一 … 6 = 週日 */
export function weekdayIndex(day: string): number {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** 該日所在週的週一 */
export function weekStart(day: string): string {
  return addDays(day, -weekdayIndex(day));
}

export const WEEKDAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"];

/** 例如「10/18（六）」 */
export function dayLabel(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}/${Number(d)}（${WEEKDAY_SHORT[weekdayIndex(day)]}）`;
}

/** 依台灣時間的時刻打招呼 */
export function greeting(date = new Date()): string {
  const hour = (date.getUTCHours() + 8) % 24;
  if (hour >= 5 && hour < 11) return "早安";
  if (hour >= 11 && hour < 18) return "午安";
  return "晚安";
}
