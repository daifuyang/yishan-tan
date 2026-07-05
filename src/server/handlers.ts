import type { z } from "zod";
import { requireAdmin } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import { requireRequestContext } from "./request-context";

export async function ensureAdmin(request: Request): Promise<void> {
  const ctx = await requireRequestContext(request);
  await requireAdmin(ctx);
}

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown = {};
  try {
    if (request.body) body = await request.json();
  } catch {
    throw Errors.invalid("请求体不是合法 JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw Errors.invalid("请求参数不合法", result.error.issues);
  }
  return result.data;
}

export async function parseQuery<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const url = new URL(request.url);
  const obj: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    obj[k] = v;
  }
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw Errors.invalid("查询参数不合法", result.error.issues);
  }
  return result.data;
}

export function parseParams<T>(schema: z.ZodType<T>, raw: Record<string, string | undefined>): T {
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") obj[k] = v;
  }
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw Errors.invalid("路径参数不合法", result.error.issues);
  }
  return result.data;
}
