export const PERMISSION_CATALOG = [
  { code: "users:read", label: "查看用户" },
  { code: "users:create", label: "新增用户" },
  { code: "users:update", label: "编辑用户与启停" },
  { code: "users:delete", label: "删除用户" },
  { code: "users:reset-password", label: "重置密码" },
  { code: "users:export", label: "导出用户" },
  { code: "users:assign-roles", label: "分配业务角色" },
] as const;

export type PermissionCode = (typeof PERMISSION_CATALOG)[number]["code"];
export const PERMISSION_CODES = PERMISSION_CATALOG.map((item) => item.code);

export function isPermissionCode(value: string): value is PermissionCode {
  return PERMISSION_CODES.some((code) => code === value);
}
