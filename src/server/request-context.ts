import { auth } from "~/lib/auth.server";
import { Errors } from "~/lib/errors";
import { assertSameOriginRequest } from "~/lib/same-origin.server";
import type { ServiceContext } from "~/lib/service-context";

/** 会改变状态的请求方法：这些方法必须过同源校验（CSRF 防护）。 */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 把请求头解析为 ServiceContext。
 * - 优先 session cookie (Web 入口)。
 * - 其次 x-api-key (自动化/CLI)。
 * - 解析失败返回 null，由调用方决定抛错或降级为匿名。
 */
function toHeaders(input: Headers | Request): Headers {
  return input instanceof Request ? input.headers : input;
}

export async function contextFromRequest(input: Headers | Request): Promise<ServiceContext | null> {
  const headers = toHeaders(input);
  // 写操作统一做同源校验：cookie 会话能被跨站请求带上，必须确认来源是本站。
  // 只带 x-api-key 的服务端客户端不带 Origin，不受影响。
  if (input instanceof Request && MUTATING_METHODS.has(input.method.toUpperCase())) {
    assertSameOriginRequest(input);
  }
  const session = await auth.api.getSession({ headers });
  if (session?.user?.id) {
    const role =
      session.user.role === "admin" || session.user.role === "member" ? session.user.role : null;
    return { userId: session.user.id, headers, authKind: "session", role };
  }

  const apiKey = headers.get("x-api-key");
  if (apiKey) {
    const verified = (await auth.api.verifyApiKey({
      body: { key: apiKey },
    })) as { valid: boolean; key?: { referenceId?: string } | null };
    if (verified?.valid && verified.key?.referenceId) {
      return {
        userId: verified.key.referenceId,
        headers,
        authKind: "apiKey",
        role: null,
      };
    }
  }

  return null;
}

export function requireUserContext(ctx: ServiceContext | null): ServiceContext {
  if (!ctx) throw Errors.unauthenticated();
  return ctx;
}

export function requireRequestContext(input: Headers | Request): Promise<ServiceContext> {
  return contextFromRequest(input).then((ctx) => requireUserContext(ctx));
}
