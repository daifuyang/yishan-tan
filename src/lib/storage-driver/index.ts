import type { StorageDriver } from "~/features/storages/storages.schema";
import type { StorageConfig } from "~/features/storages/storages.types";

import { putObjectLocal, unimplementedDriver } from "./local";

/**
 * Storage driver 适配层。当前仅实现 local；其余驱动暂抛错占位，
 * feature 在后续 PR 接入对应 SDK（ali-oss / cos-js-sdk / @aws-sdk / qiniu / minio）。
 */
export async function putObject(
  driver: StorageDriver,
  key: string,
  buffer: Buffer,
  config: StorageConfig,
): Promise<string> {
  switch (driver) {
    case "local":
      return putObjectLocal(key, buffer, config);
    case "aliyun-oss":
    case "tencent-cos":
    case "aws-s3":
    case "qiniu":
    case "minio":
      unimplementedDriver(driver);
  }
}

export function isDriverImplemented(driver: StorageDriver): boolean {
  return driver === "local";
}
