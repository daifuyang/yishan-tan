import type { DbSystemOption } from "~/../db/schema";

export type SystemOptionDto = {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
};

export type GetSystemOptionService = (key: string) => Promise<SystemOptionDto | null>;

export type BatchGetSystemOptionsService = (keys: string[]) => Promise<SystemOptionDto[]>;

export type SetSystemOptionService = (input: {
  key: string;
  value: string;
  description?: string;
}) => Promise<SystemOptionDto>;

export type BatchSetSystemOptionsService = (input: {
  items: Array<{ key: string; value: string; description?: string }>;
}) => Promise<{ updatedCount: number; results: SystemOptionDto[] }>;

export type DbSystemOptionRow = DbSystemOption;
