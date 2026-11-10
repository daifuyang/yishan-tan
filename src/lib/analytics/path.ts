/**
 * 分析路径清洗。
 *
 * 规则：只保留路径部分，去掉 query 与 hash，把长 ID 段换成 :id，
 * 再剥掉其余不适合出现在统计里的字符。统计端只允许收到这个结果，
 * 不得收到完整 URL。
 */
export function safeAnalyticsPath(path: string): string {
  return (
    (path.split(/[?#]/)[0] ?? "/")
      .replace(/\/[0-9a-f-]{20,}/gi, "/:id")
      .replace(/[^a-zA-Z0-9/_:.-]/g, "")
      .slice(0, 160) || "/"
  );
}
