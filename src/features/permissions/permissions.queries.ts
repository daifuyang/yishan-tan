import { useQuery } from "@tanstack/react-query";
import { getMyPermissions, getUserFormOptions } from "./permissions.actions";

export function useMyPermissions() {
  return useQuery({
    queryKey: ["permissions", "me"],
    queryFn: () => getMyPermissions(),
    staleTime: 0,
  });
}

export function useUserFormOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["permissions", "user-form"],
    queryFn: () => getUserFormOptions(),
    enabled,
    staleTime: 0,
  });
}

export type PermissionResource =
  | "departments"
  | "posts"
  | "dicts"
  | "roles"
  | "menus"
  | "settings"
  | "storages"
  | "attachments"
  | "login-logs"
  | "portal-categories"
  | "portal-articles"
  | "portal-pages"
  | "portal-templates";

export function useResourcePermissions(resource: PermissionResource) {
  const query = useMyPermissions();
  const grants = query.data ?? [];
  const has = (code: string) => grants.includes(code as (typeof grants)[number]);
  const canRead = has(`${resource}:read`);
  return {
    canRead,
    canCreate: has(`${resource}:create`),
    canUpdate: has(`${resource}:update`),
    canDelete: has(`${resource}:delete`),
    canExport: resource === "departments" && has("departments:export"),
    isPending: query.isPending,
    error: query.isError
      ? "无法加载操作权限，请刷新重试"
      : query.isSuccess && !canRead
        ? "没有查看该资源的权限"
        : undefined,
  };
}
