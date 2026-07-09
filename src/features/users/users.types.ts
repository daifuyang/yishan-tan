import type { DbUser } from "~/../db/schema";

export type AdminUserDto = {
  id: string;
  email: string;
  username: string;
  name: string;
  displayName: string | null;
  phone: string | null;
  role: "admin" | "member";
  status: "enabled" | "disabled";
  deptId: string | null;
  postIds: string[];
  gender: "male" | "female" | "other" | null;
  birthDate: string | null;
  remark: string | null;
  roleIds: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type LoginLogDto = {
  id: string;
  userId: string | null;
  username: string | null;
  status: string;
  message: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ApiKeyDto = {
  id: string;
  name: string | null;
  prefix: string | null;
  start: string | null;
  referenceId: string;
  expiresAt: string | null;
  lastRequest: string | null;
  createdAt: string;
};

export type ListUsersService = (input: {
  page: number;
  pageSize: number;
  username?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  status?: "enabled" | "disabled";
  systemRole?: "admin" | "member";
  roleId?: string;
  deptId?: string;
}) => Promise<{ items: AdminUserDto[]; total: number }>;

export type GetUserService = (id: string) => Promise<AdminUserDto | null>;

export type UpdateUserService = (
  id: string,
  input: {
    name?: string;
    displayName?: string;
    phone?: string;
    email?: string;
    status?: "enabled" | "disabled";
    deptId?: string | null;
    postIds?: string[];
    gender?: "male" | "female" | "other" | null;
    birthDate?: string | null;
    remark?: string | null;
    roleIds?: string[];
  },
) => Promise<AdminUserDto>;

export type DeleteUserService = (id: string) => Promise<{ ok: true }>;

export type ChangeMyPasswordService = (input: {
  userId: string;
  oldPassword: string;
  newPassword: string;
}) => Promise<{ ok: true }>;

export type ResetUserPasswordService = (input: {
  userId: string;
}) => Promise<{ temporaryPassword: string }>;

export type ListMyLoginLogsService = (input: {
  userId: string;
  page: number;
  pageSize: number;
}) => Promise<{ items: LoginLogDto[]; total: number }>;

export type ListApiKeysService = (input: { userId: string }) => Promise<ApiKeyDto[]>;

export type CreateApiKeyService = (input: {
  userId: string;
  name?: string;
}) => Promise<{ key: string; apiKey: ApiKeyDto }>;

export type DeleteApiKeyService = (input: {
  userId: string;
  id: string;
}) => Promise<{ ok: true }>;

export type DbUserRow = DbUser;
