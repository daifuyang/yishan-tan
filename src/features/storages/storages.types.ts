import type { DbStorage } from "~/../db/schema";

import type { CreateStorageInput, StorageDriver, UpdateStorageInput } from "./storages.schema";

export type StorageStatus = "enabled" | "disabled";

/**
 * 配置在 DB 中以 JSON 字符串存储；为兼容服务端函数序列化，
 * 这里把值收敛为可序列化的字面量类型。
 */
export type StorageConfigValue = string | number | boolean | null;
export type StorageConfig = Record<string, StorageConfigValue>;

export type StorageDto = {
  id: string;
  name: string;
  driver: StorageDriver;
  isDefault: boolean;
  description: string | null;
  status: StorageStatus;
  configSummary: StorageConfig;
  createdAt: string;
  updatedAt: string;
};

/**
 * 详情 DTO：唯一携带完整 config（同样经过 redact，用于 secret 类字段保护）。
 */
export type StorageDetailDto = StorageDto & {
  config: StorageConfig;
};

export type CreateStorageServiceInput = CreateStorageInput;

export type UpdateStorageServiceInput = UpdateStorageInput;

export type ListStoragesService = (input: {
  page: number;
  pageSize: number;
  keyword?: string;
  driver?: StorageDriver;
  isDefault?: boolean;
  status?: StorageStatus;
  createdFrom?: string;
  createdTo?: string;
}) => Promise<{ items: StorageDto[]; total: number }>;

export type GetStorageService = (id: string) => Promise<StorageDetailDto | null>;

export type GetDefaultStorageService = () => Promise<StorageDetailDto | null>;

export type CreateStorageService = (input: CreateStorageServiceInput) => Promise<StorageDetailDto>;

export type UpdateStorageService = (
  id: string,
  input: UpdateStorageServiceInput,
) => Promise<StorageDetailDto>;

export type DeleteStorageService = (id: string) => Promise<{ ok: true }>;

export type SetDefaultStorageService = (id: string) => Promise<StorageDetailDto>;

export type DbStorageRow = DbStorage;
