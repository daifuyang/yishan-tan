/**
 * 路由白名单：`next` / `redirect` 只允许目标产品真实存在的前缀下的站内相对路径，
 * 否则落到默认页。
 *
 * 目标仓库（yishan-tan）真实存在的顶层路由：
 *   - `/`        首页（src/routes/index.tsx）
 *   - `/login`   登录页（src/routes/login.tsx）
 *   - `/admin/*` 管理后台（src/routes/admin/*）
 * 因此安全前缀只保留 `/admin`；`/` 不能作为前缀——以 `/` 开头的字符串会匹配
 * 任何站内路径，等于白名单失效。
 *
 * 判定口径（比“startsWith('/admin')”严格得多）：
 *   1. 必须是站内相对路径：以单个 `/` 开头；`//host`（协议相对）拒绝。
 *   2. 拒绝反斜杠、控制字符、`..` 路径穿越。
 *   3. 拒绝 `scheme:` 形态（`javascript:`、`https:`）以及 `/javascript:…` 这类伪装。
 *   4. URL 编码变体（`%2f`、`%2e%2e`）解码后同样要过以上判定，
 *      否则 `/admin%2f..%2fevil` 之类的输入会被放行。
 *   5. 最后再套白名单前缀。
 */

/** 默认回跳目标（登录后未携带合法 next 时的落点）。 */
export const SAFE_NEXT_PREFIX = "/admin";
export const SAFE_NEXT_PREFIXES = ["/admin"] as const;

/** 明显不可信或会造成循环跳转的输入。 */
export const SAFE_NEXT_BLOCK_PATTERNS: RegExp[] = [
  /^\/login(\/|$)/,
  /^\/admin\/login(?:[/?#]|$)/,
  /\/\/+/,
  /^javascript:/i,
];

/** 是否含控制字符（不含普通空格）：路径里出现即视为构造出来的输入。 */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** 形如 `/javascript:…` 的伪装（路径首段是 scheme）。 */
const SCHEME_LIKE_AFTER_SLASH = /^\/[a-z][a-z0-9+.-]*:/i;

/** 最多解码 3 轮，足够覆盖 `%252f` 这类双层编码。 */
function decodeRepeatedly(value: string): string {
  let current = value;
  for (let i = 0; i < 3; i++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return current;
    }
    if (next === current) return current;
    current = next;
  }
  return current;
}

/** 是否存在 `..` 路径穿越段（同时兼容反斜杠分隔）。 */
function hasTraversal(value: string): boolean {
  return value.split(/[\\/]/).some((segment) => segment === "..");
}

/** 是否是一条安全的站内相对路径。 */
function isSafeRelativePath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;
  if (hasControlChars(value)) return false;
  if (hasTraversal(value)) return false;
  if (SCHEME_LIKE_AFTER_SLASH.test(value)) return false;
  return true;
}

/**
 * 把同源绝对 URL 归一成站内相对路径；非同源或无法解析时返回 null。
 *
 * 只有显式给出 `origin`（当前站点 origin）时才允许绝对 URL：调用方要能说清
 * “同源”的判定基准，否则一律拒绝。
 */
function toSameOriginPath(input: string, origin?: string): string | null {
  if (!origin) return null;
  let parsed: URL;
  let base: URL;
  try {
    parsed = new URL(input);
    base = new URL(origin);
  } catch {
    return null;
  }
  if (parsed.origin !== base.origin) return null;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * 清洗 `next` 参数：只放行白名单前缀下的站内相对路径，其余落到 fallback。
 *
 * @param input  待清洗的原始参数
 * @param fallback 非法时的落点
 * @param origin 可选的当前站点 origin；给出时允许「同源绝对 URL」被归一为相对路径
 */
export function sanitizeNext(
  input: string | undefined | null,
  fallback = "/",
  origin?: string,
): string {
  if (typeof input !== "string") return fallback;
  const raw = input.trim();
  if (!raw) return fallback;

  let candidate = raw;
  if (!candidate.startsWith("/")) {
    // 绝对 URL：只有同源才允许转换成站内相对路径。
    const sameOriginPath = toSameOriginPath(candidate, origin);
    if (!sameOriginPath) return fallback;
    candidate = sameOriginPath;
  }

  const decoded = decodeRepeatedly(candidate);
  for (const value of decoded === candidate ? [candidate] : [candidate, decoded]) {
    if (!isSafeRelativePath(value)) return fallback;
  }
  if (SAFE_NEXT_BLOCK_PATTERNS.some((re) => re.test(candidate) || re.test(decoded)))
    return fallback;

  const allowed = SAFE_NEXT_PREFIXES.some(
    (prefix) =>
      candidate === prefix ||
      candidate.startsWith(`${prefix}/`) ||
      candidate.startsWith(`${prefix}?`),
  );
  if (!allowed) return fallback;
  return candidate;
}

/**
 * 清洗管理后台回跳地址：即使入参合法，也必须落在 `/admin` 下。
 */
export function sanitizeAdminNext(input: string | undefined | null, origin?: string): string {
  const target = sanitizeNext(input, "/admin", origin);
  return target === "/admin" || target.startsWith("/admin/") || target.startsWith("/admin?")
    ? target
    : "/admin";
}
