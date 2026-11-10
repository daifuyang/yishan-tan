import { Errors } from "~/lib/errors";
import { logger } from "~/lib/logger.server";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function isPrivateLanHost(hostname: string): boolean {
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  const match = /^172\.(\d+)\.\d+\.\d+$/.exec(hostname);
  return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
}

function isLocalHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname) || isPrivateLanHost(hostname);
}

function sameOriginOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * 开发环境允许本机来源的端口/主机名差异：
 * 本地 dev 可能用 127.0.0.1 或局域网 IP 打开，而 `APP_BASE_URL` 通常固定为
 * `http://localhost:3200`。仅当配置来源本身就是本机/内网时才放宽，
 * 生产环境（NODE_ENV=production）不生效。
 */
function isLocalDevOrigin(origin: string, expectedOrigin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const candidate = sameOriginOf(origin);
  const expected = sameOriginOf(expectedOrigin);
  if (!candidate || !expected) return false;
  return isLocalHost(new URL(candidate).hostname) && isLocalHost(new URL(expected).hostname);
}

let warnedMissingBaseUrl = false;

/**
 * 读取显式配置的 `APP_BASE_URL`（站点对外 origin）。
 *
 * 取值形式：`https://tan.example.com`（可带路径，路径会被忽略，只取 origin）。
 * 未配置或不是合法 URL 时返回 null——此时退化为「以请求自身的 origin 为准」。
 */
export function configuredAppOrigin(): string | null {
  const raw = process.env.APP_BASE_URL?.trim();
  if (!raw) return null;
  const origin = sameOriginOf(raw);
  if (!origin) {
    logger.warn({ appBaseUrl: raw }, "APP_BASE_URL 不是合法 URL，同源校验已忽略该配置");
    return null;
  }
  return origin;
}

/**
 * 本次请求被允许的 origin 集合：
 *   - 显式配置的 `APP_BASE_URL`（对外域名；反向代理把 Host 改写成内网域名时靠它兜底）；
 *   - 请求自身的 origin（浏览器发起的请求里，Origin 头必须等于访问本站用的 origin）。
 *
 * 两者都取不到时只剩「请求自身 origin」这一条，行为与未配置时一致。
 */
export function allowedOrigins(request: Request): string[] {
  const origins = new Set<string>();
  const configured = configuredAppOrigin();
  if (configured) origins.add(configured);
  const selfOrigin = sameOriginOf(request.url);
  if (selfOrigin) origins.add(selfOrigin);
  if (!configured && !warnedMissingBaseUrl) {
    warnedMissingBaseUrl = true;
    logger.warn(
      "未配置 APP_BASE_URL：同源校验退化为「请求自身 origin」。反向代理/自定义域名部署请配置 APP_BASE_URL",
    );
  }
  return [...origins];
}

/**
 * 同源校验（写接口共用）。
 *
 * 未显式配置 `APP_BASE_URL` 时以请求自身的 origin 为准，不采信任何转发头。
 */
export function assertSameOriginRequest(request: Request, message = "请求来源无效"): void {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw Errors.forbidden(message);
  }
  const origin = request.headers.get("origin");
  // 非浏览器客户端（服务端 agent、curl）不带 Origin，登录态另行校验。
  if (!origin) return;

  const allowed = allowedOrigins(request);
  const normalized = sameOriginOf(origin);
  if (normalized && allowed.includes(normalized)) return;
  if (allowed.some((expected) => isLocalDevOrigin(origin, expected))) return;
  throw Errors.forbidden(message);
}
