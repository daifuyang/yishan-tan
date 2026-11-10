/**
 * 金额格式化工具（管理后台报表口径）。
 *
 * 项目约定：
 *   - 金额以 fen（人民币分）整数存储。
 *   - 供应商成本以 micro-yuan（1 fen = 10000 micros）整数存储。
 *   - 所有算术用 bigint；浮点仅在最后一刻的格式化时使用。
 *
 * 不要把 micros 当作 float 算总额再四舍五入——按位精度会丢，财务对账对不上。
 */

const MICROS_PER_FEN = 10_000n;
const MICROS_PER_YUAN = 1_000_000n;

export type FormatMicrosOptions = {
  /** 最小小数位数；默认 2（到分）。 */
  minDecimals?: number;
  /** 最大小数位数；默认 2。 */
  maxDecimals?: number;
  /** 正数但不足 1 分时附注。默认 true（费用明细不要把 ¥0.00 当成真零）。 */
  markSubFen?: boolean;
};

/**
 * 把 micro-yuan 整数格式化为人民币字符串。1 元 = 1_000_000 微元，与 fen/100 同口径。
 * 例：
 *   formatMicrosAsFen(16_000_000n) → "¥16.00"
 *   formatMicrosAsFen(99_000_000n) → "¥99.00"
 *   formatMicrosAsFen(944n)        → "¥0.00（不足 ¥0.01）"
 *   formatMicrosAsFen(0n)          → "¥0.00"
 *   formatMicrosAsFen(null)        → "—"
 *
 * 负数场景：管理后台毛利可能为负；按 loss 显示，在调用方决定样式。
 */
export function formatMicrosAsFen(
  micros: bigint | number | string | null | undefined,
  opts: FormatMicrosOptions = {},
): string {
  if (micros === null || micros === undefined) return "—";
  const big = typeof micros === "bigint" ? micros : BigInt(micros);
  const sign = big < 0n ? "-" : "";
  const abs = big < 0n ? -big : big;
  const yuanInt = Number(abs / MICROS_PER_YUAN);
  const yuanFrac = Number(abs % MICROS_PER_YUAN) / Number(MICROS_PER_YUAN);
  const total = yuanInt + yuanFrac;
  const minDecimals = opts.minDecimals ?? 2;
  const maxDecimals = opts.maxDecimals ?? 2;
  const formatter = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
  const formatted = `${sign}¥${formatter.format(total)}`;
  const markSubFen = opts.markSubFen ?? true;
  if (markSubFen && abs > 0n && abs < MICROS_PER_FEN) {
    return `${formatted}（不足 ¥0.01）`;
  }
  return formatted;
}

/**
 * fen 整数转人民币字符串。
 */
export function formatFen(fen: bigint | number | string | null | undefined): string {
  if (fen === null || fen === undefined) return "—";
  const n = typeof fen === "bigint" ? Number(fen) : Number(fen);
  return `¥${(n / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 积分字符串 / 整数 → 千分位显示。仅用于展示，不参与计算。
 */
export function formatCreditsBigint(value: bigint | number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const big = typeof value === "bigint" ? value : BigInt(value);
  return big.toLocaleString("zh-CN");
}
