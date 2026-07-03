/**
 * 统一错误工厂。所有 service 抛错都走这里，便于 arch 检查和 OpenAPI 标准化。
 */
export class ServerError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const Errors = {
  unauthenticated: (msg = "请先登录") => new ServerError("UNAUTHENTICATED", msg, 401),
  forbidden: (msg = "权限不足") => new ServerError("FORBIDDEN", msg, 403),
  notFound: (msg = "资源不存在") => new ServerError("NOT_FOUND", msg, 404),
  conflict: (msg = "资源已存在") => new ServerError("CONFLICT", msg, 409),
  invalidCredentials: (msg = "邮箱或密码错误") => new ServerError("INVALID_CREDENTIALS", msg, 401),
  invalid: (msg = "参数不合法", details?: unknown) => new ServerError("INVALID", msg, 400, details),
  rateLimited: (resetAt: number | Date) =>
    new ServerError("RATE_LIMITED", "请求过于频繁，请稍后再试", 429, {
      resetAt: typeof resetAt === "number" ? resetAt : resetAt.getTime(),
    }),
  internal: (msg = "服务暂时不可用") => new ServerError("INTERNAL", msg, 500),
};

export function isServerError(error: unknown): error is ServerError {
  return error instanceof ServerError;
}
