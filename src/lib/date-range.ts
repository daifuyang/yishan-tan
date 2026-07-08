/**
 * 日期区间归一化工具。
 *
 * 背景:`DateRangePicker` 选出来的是 `YYYY-MM-DD`(日级粒度),但
 * service 的 `parseDate(value) = new Date(value)` 拿到 `"2026-07-08"`
 * 会解析成 UTC `00:00:00`,导致 `createdTo=2026-07-08` 把整日排除。
 *
 * `normalizeDateRange` 在 `buildListQuery` 把日级区间展开成
 * `T00:00:00.000Z` / `T23:59:59.999Z`,service 收到的就是合法的
 * ISO datetime,语义与"包含整日"一致。
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function startOfDayIso(date: string): string | undefined {
  if (!ISO_DATE.test(date)) return undefined;
  return `${date}T00:00:00.000Z`;
}

export function endOfDayIso(date: string): string | undefined {
  if (!ISO_DATE.test(date)) return undefined;
  return `${date}T23:59:59.999Z`;
}

export function normalizeDateRange(
  range: { start: string | null; end: string | null } | null | undefined,
): { createdFrom: string | undefined; createdTo: string | undefined } {
  if (!range) return { createdFrom: undefined, createdTo: undefined };
  let from = range.start || undefined;
  let to = range.end || undefined;
  if (from && to && from > to) [from, to] = [to, from];
  return {
    createdFrom: from ? startOfDayIso(from) : undefined,
    createdTo: to ? endOfDayIso(to) : undefined,
  };
}
