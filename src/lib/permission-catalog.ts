export const PERMISSION_CATALOG = [
  { code: "users:read", label: "查看用户" },
  { code: "users:create", label: "新增用户" },
  { code: "users:update", label: "编辑用户与启停" },
  { code: "users:delete", label: "删除用户" },
  { code: "users:reset-password", label: "重置密码" },
  { code: "users:export", label: "导出用户" },
  { code: "users:assign-roles", label: "分配业务角色" },
  { code: "departments:read", label: "查看部门" },
  { code: "departments:create", label: "新增部门" },
  { code: "departments:update", label: "编辑部门与启停" },
  { code: "departments:delete", label: "删除部门" },
  { code: "departments:export", label: "导出部门" },
  { code: "posts:read", label: "查看岗位" },
  { code: "posts:create", label: "新增岗位" },
  { code: "posts:update", label: "编辑岗位与启停" },
  { code: "posts:delete", label: "删除岗位" },
  { code: "dicts:read", label: "查看字典类型与数据" },
  { code: "dicts:create", label: "新增字典类型与数据" },
  { code: "dicts:update", label: "编辑字典与启停" },
  { code: "dicts:delete", label: "删除字典类型与数据" },
  { code: "roles:read", label: "查看角色" },
  { code: "roles:create", label: "新增角色" },
  { code: "roles:update", label: "编辑角色与启停" },
  { code: "roles:delete", label: "删除角色" },
  { code: "menus:read", label: "查看菜单" },
  { code: "menus:create", label: "新增菜单" },
  { code: "menus:update", label: "编辑菜单与启停" },
  { code: "menus:delete", label: "删除菜单" },
] as const;

export type PermissionCode = (typeof PERMISSION_CATALOG)[number]["code"];
export const PERMISSION_CODES = PERMISSION_CATALOG.map((item) => item.code);

export function isPermissionCode(value: string): value is PermissionCode {
  return PERMISSION_CODES.some((code) => code === value);
}
