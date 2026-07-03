import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

declare global {
  var __YISHAN_TAN_DB__: ReturnType<typeof drizzle> | undefined;
}

function ensureUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env or export it in your shell.",
    );
  }
  return url;
}

export function getDbClient() {
  if (_client) return _client;
  const url = ensureUrl();
  _client = postgres(url, { max: 5, idle_timeout: 20 });
  return _client;
}

export function getDb() {
  if (_db) return _db;
  if (globalThis.__YISHAN_TAN_DB__) return globalThis.__YISHAN_TAN_DB__;
  ensureUrl();
  _db = drizzle(getDbClient());
  globalThis.__YISHAN_TAN_DB__ = _db;
  return _db;
}

/**
 * 服务端守卫：业务调用 db 前应判断是否已配置数据库，避免访问未配置环境时
 * 出现“半生不熟”的报错。
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
