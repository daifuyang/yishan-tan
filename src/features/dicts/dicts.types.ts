import type { DbDictData, DbDictType } from "~/../db/schema";

export type DictTypeDto = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type DictTypeListItemDto = DictTypeDto & {
  dataCount: number;
};

export type DictDataDto = {
  id: string;
  typeCode: string;
  label: string;
  value: string;
  sort: number;
  status: "enabled" | "disabled";
  extra: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListDictTypesService = (input: {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: "enabled" | "disabled";
}) => Promise<{ items: DictTypeListItemDto[]; total: number }>;

export type GetDictTypeService = (id: string) => Promise<DictTypeDto | null>;

export type CreateDictTypeService = (input: {
  name: string;
  code: string;
  description?: string;
  status?: "enabled" | "disabled";
}) => Promise<DictTypeDto>;

export type UpdateDictTypeService = (
  id: string,
  input: {
    name?: string;
    description?: string;
    status?: "enabled" | "disabled";
  },
) => Promise<DictTypeDto>;

export type DeleteDictTypeService = (id: string) => Promise<{ ok: true }>;

export type ListDictDataService = (input: {
  page: number;
  pageSize: number;
  keyword?: string;
  typeCode?: string;
  status?: "enabled" | "disabled";
}) => Promise<{ items: DictDataDto[]; total: number }>;

export type GetDictDataService = (id: string) => Promise<DictDataDto | null>;

export type CreateDictDataService = (input: {
  typeCode: string;
  label: string;
  value: string;
  sort?: number;
  status?: "enabled" | "disabled";
  extra?: string;
}) => Promise<DictDataDto>;

export type UpdateDictDataService = (
  id: string,
  input: {
    label?: string;
    value?: string;
    sort?: number;
    status?: "enabled" | "disabled";
    extra?: string;
  },
) => Promise<DictDataDto>;

export type DeleteDictDataService = (id: string) => Promise<{ ok: true }>;

export type DbDictTypeRow = DbDictType;
export type DbDictDataRow = DbDictData;
