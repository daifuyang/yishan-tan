import type { DbRole } from "~/../db/schema";

import type { DataScope } from "./roles.schema";

export type RoleDto = {
  id: string;
  name: string;
  description: string | null;
  status: "enabled" | "disabled";
  dataScope: DataScope;
  isSystemDefault: boolean;
  creatorId: string | null;
  creatorName: string | null;
  updaterId: string | null;
  updaterName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoleListItemDto = RoleDto;

export type RoleDetailDto = RoleDto & {
  menuIds: string[];
};

export type CreateRoleServiceInput = {
  name: string;
  description?: string;
  status?: "enabled" | "disabled";
  dataScope?: DataScope;
  menuIds?: string[];
};

export type UpdateRoleServiceInput = {
  name?: string;
  description?: string;
  status?: "enabled" | "disabled";
  dataScope?: DataScope;
  menuIds?: string[];
};

export type ListRolesService = (input: {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: "enabled" | "disabled";
  createdFrom?: string;
  createdTo?: string;
}) => Promise<{ items: RoleListItemDto[]; total: number }>;

export type GetRoleService = (input: { id: string }) => Promise<RoleDetailDto | null>;

export type CreateRoleService = (input: {
  ctx: { userId: string; headers: Headers; authKind: "session" | "apiKey" | "system" };
  data: CreateRoleServiceInput;
}) => Promise<RoleDetailDto>;

export type UpdateRoleService = (input: {
  ctx: { userId: string; headers: Headers; authKind: "session" | "apiKey" | "system" };
  id: string;
  data: UpdateRoleServiceInput;
}) => Promise<RoleDetailDto>;

export type DeleteRoleService = (input: { id: string }) => Promise<{ ok: true }>;

export type DbRoleRow = DbRole;
