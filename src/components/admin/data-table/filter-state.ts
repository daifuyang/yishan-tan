/**
 * 筛选条件的归一化与比较工具。
 *
 * 列表页普遍存在"草稿条件（draft）与已提交条件（filters）"两套状态，
 * 需要一个统一的比较口径，避免重复提交或误判条件是否变化。
 */

/** 归一化筛选值：字符串去掉首尾空白，其余类型原样保留。 */
export function normalizeFilterValues<T extends Record<string, unknown>>(filters: T): T {
  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  ) as T;
}

/** 判断两份筛选条件是否等价（按归一化后的值逐项比较）。 */
export function sameFilterValues<T extends Record<string, unknown>>(left: T, right: T): boolean {
  const normalized = normalizeFilterValues(right);
  return Object.entries(normalizeFilterValues(left)).every(
    ([key, value]) => normalized[key] === value,
  );
}
