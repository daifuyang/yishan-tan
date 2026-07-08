/**
 * DatePicker / DateRangePicker 共享工具。
 *
 * 抽出理由:DateRangePicker 与 DatePicker 共用 ISO 字符串序列化、
 * 月份导航、周一开头网格等逻辑;集中在此避免两份独立实现漂移。
 */
export const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"] as const;

export const DISPLAY_FORMAT = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export const HEADER_FORMAT = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function toIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

/**
 * 生成 6×7=42 天的网格;周一开头。
 * `view` 是 UTC 当月 1 号。
 */
export function getMonthGrid(view: Date): Date[] {
  const first = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth(), 1));
  // 0=Sun..6=Sat; 周一开头 → 把 Sun 当作"上周"
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
}
