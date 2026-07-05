import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageConfig } from "~/features/storages/storages.types";
import { Errors } from "~/lib/errors";

function readString(config: StorageConfig | undefined, key: string): string | undefined {
  if (!config) return undefined;
  const v = config[key];
  if (typeof v !== "string") return undefined;
  return v;
}

const DEFAULT_DIR = "public/uploads";

function resolveDir(config: StorageConfig | undefined): string {
  const dir = readString(config, "dir");
  return dir && dir.trim().length > 0 ? dir.trim() : DEFAULT_DIR;
}

function resolvePrefix(config: StorageConfig | undefined): string {
  const p = readString(config, "prefix");
  return p ? p.trim().replace(/^\/+|\/+$/g, "") : "";
}

function resolvePublicBaseUrl(config: StorageConfig | undefined): string | undefined {
  const url = readString(config, "publicBaseUrl");
  return url ? url.trim().replace(/\/+$/, "") : undefined;
}

function buildPublicUrl(base: string | undefined, prefix: string, key: string): string {
  const safeKey = key.replace(/^\/+/, "");
  const full = prefix ? `${prefix}/${safeKey}` : safeKey;
  const normalized = full.replace(/^\/+/, "");
  if (!base) return `/uploads/${normalized}`;
  return `${base}/${normalized}`;
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, "").replace(/\.\.+/g, "");
}

function buildAbsolutePath(dir: string, prefix: string, key: string): string {
  const safeKey = normalizeKey(key);
  const joined = prefix ? path.join(dir, prefix, safeKey) : path.join(dir, safeKey);
  return path.resolve(joined);
}

/**
 * 把上传文件落到本地磁盘，返回一个可对外暴露的 URL（默认走 `/uploads/<key>`，
 * 若配置了 publicBaseUrl 则用其拼成绝对 URL）。
 *
 * 注意：进程必须工作在项目根目录，因为默认 dir 写的是相对路径 `public/uploads/`。
 */
export async function putObjectLocal(
  key: string,
  buffer: Buffer,
  config: StorageConfig | undefined,
): Promise<string> {
  const dir = resolveDir(config);
  const prefix = resolvePrefix(config);
  const base = resolvePublicBaseUrl(config);

  const absPath = buildAbsolutePath(dir, prefix, key);
  const dirOfFile = path.dirname(absPath);
  await mkdir(dirOfFile, { recursive: true });
  await writeFile(absPath, buffer);

  return buildPublicUrl(base, prefix, key);
}

/**
 * 显式抛错占位：oss/cos/s3/qiniu/minio 驱动本期未实现，
 * feature 后续 PR 接入对应 SDK 后再扩展。
 */
export function unimplementedDriver(driver: string): never {
  throw Errors.internal(`驱动 ${driver} 暂未实现`);
}
