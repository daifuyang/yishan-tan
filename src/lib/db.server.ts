import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl, requireDatabaseUrl } from "./database-url";

let _client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

declare global {
  var __YISHAN_TAN_DB__: ReturnType<typeof drizzle> | undefined;
}

export function getDbClient() {
  if (_client) return _client;
  const url = requireDatabaseUrl();
  _client = postgres(url, { max: 5, idle_timeout: 20 });
  return _client;
}

export function getDb() {
  if (_db) return _db;
  if (globalThis.__YISHAN_TAN_DB__) return globalThis.__YISHAN_TAN_DB__;
  requireDatabaseUrl();
  _db = drizzle(getDbClient());
  globalThis.__YISHAN_TAN_DB__ = _db;
  return _db;
}

/**
 * 服务端守卫：业务调用 db 前应判断是否已配置数据库，避免访问未配置环境时
 * 出现“半生不熟”的报错。
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
