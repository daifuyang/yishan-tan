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

export type PermissionResource = "departments" | "posts" | "dicts" | "roles" | "menus";

export function useResourcePermissions(resource: PermissionResource) {
  const query = useMyPermissions();
  const grants = query.data ?? [];
  const canRead = grants.includes(`${resource}:read`);
  return {
    canRead,
    canCreate: grants.includes(`${resource}:create`),
    canUpdate: grants.includes(`${resource}:update`),
    canDelete: grants.includes(`${resource}:delete`),
    canExport: resource === "departments" && grants.includes("departments:export"),
    isPending: query.isPending,
    error: query.isError
      ? "无法加载操作权限，请刷新重试"
      : query.isSuccess && !canRead
        ? "没有查看该资源的权限"
        : undefined,
  };
}
