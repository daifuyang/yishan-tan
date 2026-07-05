import type { DbRole } from "~/../db/schema";

export type RoleDto = {
  id: string;
  name: string;
  description: string | null;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type RoleListItemDto = RoleDto & {
  userCount: number;
  menuCount: number;
};

export type RoleDetailDto = RoleDto & {
  menuIds: string[];
};

export type CreateRoleServiceInput = {
  name: string;
  description?: string;
  status?: "enabled" | "disabled";
  menuIds?: string[];
};

export type UpdateRoleServiceInput = {
  name?: string;
  description?: string;
  status?: "enabled" | "disabled";
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

export type GetRoleService = (id: string) => Promise<RoleDetailDto | null>;

export type CreateRoleService = (input: CreateRoleServiceInput) => Promise<RoleDetailDto>;

export type UpdateRoleService = (
  id: string,
  input: UpdateRoleServiceInput,
) => Promise<RoleDetailDto>;

export type DeleteRoleService = (id: string) => Promise<{ ok: true }>;

export type DbRoleRow = DbRole;
