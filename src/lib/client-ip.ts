/**
 * 客户端 IP 解析（限流 / 风控共用的唯一入口）。
 *
 * 与登录日志里那种「直接取 XFF 第一个值」的写法有三点不同，
 * 都是因为这里要用它做配额边界：
 *
 * 1. `X-Forwarded-For` 由代理逐跳追加，**最左边**是客户端自己写进去的值，
 *    任何调用方都能凭空伪造；只有最右边一跳是最近的代理写的。因此优先信
 *    `x-real-ip`（代理单值覆盖，客户端无法追加），退而取 XFF 最后一跳。
 * 2. 取不到时返回 `null` 而不是 `"127.0.0.1"`。落到同一个常量桶会让所有人
 *    共用一份配额——一个脚本就能把全体真实用户挡在门外。识别不到就不做
 *    按 IP 限流，由全局预算兜底。
 * 3. 端口要剥掉：`1.2.3.4:56` / `[::1]:56` 不是合法 IP，直接拼进 Redis key
 *    会让同一客户端算出不同的分桶。
 */

/** 去掉 `1.2.3.4:56` / `[::1]:56` 里的端口。 */
function stripPort(value: string): string {
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(value);
  if (bracketed?.[1]) return bracketed[1];
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(value);
  if (v4?.[1]) return v4[1];
  return value;
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

/**
 * IPv6 只做宽松形态校验。
 *
 * 目的是保证这个值能安全地拼进 Redis key，不是做地址分类；
 * 严格校验留给真正需要判断网段的地方。
 */
function isIpv6(value: string): boolean {
  if (value.length < 2 || value.length > 45) return false;
  if (!/^[0-9a-f:.]+$/i.test(value)) return false;
  return value.includes(":");
}

function normalize(value: string): string | null {
  const bare = stripPort(value.trim());
  if (isIpv4(bare) || isIpv6(bare)) return bare;
  return null;
}

/**
 * 可选：部署在 CDN / 网关之后时，用 `TRUSTED_CLIENT_IP_HEADER` 指定由可信边缘
 * 单值覆盖写入的头（如 CDN 的真实 IP 头）。仅在该头存在且可解析时使用；
 * 配置了却取不到值时返回 null，不回退到可被客户端影响的头。
 *
 * 特例：配置为 `x-forwarded-for` 时取**最后一跳**（最近的代理追加的值，客户端无法覆盖；
 * 最左边是客户端自己写的，可伪造）。
 */
function trustedHeaderName(): string | null {
  const name = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  return name || null;
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const trusted = trustedHeaderName();
  if (trusted) {
    const value = headers.get(trusted);
    if (!value) return null;
    if (trusted === "x-forwarded-for") {
      const last = value
        .split(",")
        .map((hop) => hop.trim())
        .filter(Boolean)
        .at(-1);
      return last ? normalize(last) : null;
    }
    return normalize(value);
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    const parsed = normalize(realIp);
    if (parsed) return parsed;
    // x-real-ip 存在但不可解析时不回退到 XFF：那说明上游配置已经变了，
    // 此时代理追加的「最后一跳」也不再可信。
    return null;
  }

  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const hops = forwarded
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  const last = hops.at(-1);
  return last ? normalize(last) : null;
}

/**
 * 网络分组键：IPv4 取 /24，IPv6 取前 3 段（/48）。
 * 只用于“同一网络短时间集群注册”的弱信号，不做封禁依据。
 */
export function ipNetworkKey(ip: string): string {
  if (isIpv4(ip)) return `${ip.split(".").slice(0, 3).join(".")}.0/24`;
  const groups = ip.toLowerCase().split(":");
  return `${groups.slice(0, 3).join(":")}::/48`;
}
