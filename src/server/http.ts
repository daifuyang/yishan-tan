import { ZodError } from "zod";
import { ServerError, isServerError } from "~/lib/errors";

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

export async function parseJson(request: Request): Promise<unknown> {
  if (!request.body) return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function handleApiError(error: unknown): Response {
  if (isServerError(error)) {
    return json(
      { ok: false, code: error.code, error: error.message, details: error.details },
      { status: error.statusCode },
    );
  }
  if (error instanceof ZodError) {
    return json(
      { ok: false, code: "INVALID", error: "请求参数不合法", details: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof ServerError) {
    return json(
      { ok: false, code: error.code, error: error.message },
      { status: error.statusCode },
    );
  }
  const message = error instanceof Error ? error.message : "服务暂时不可用";
  return json({ ok: false, code: "INTERNAL", error: message }, { status: 500 });
}
