import { queryOptions, useQuery } from "@tanstack/react-query";

import { getMenuTree } from "~/features/menus/menus.actions";
import type { MenuNode } from "~/features/menus/menus.types";
import { listRoles } from "~/features/roles/roles.actions";
import type { RoleListQuery } from "~/features/roles/roles.schema";
import type { RoleListItemDto } from "~/features/roles/roles.types";

export const rolesQueryKey = {
  all: ["roles"] as const,
  lists: () => [...rolesQueryKey.all, "list"] as const,
  list: (input: RoleListQuery) => [...rolesQueryKey.lists(), input] as const,
  assignableMenus: () => [...rolesQueryKey.all, "assignable-menus"] as const,
};

export const rolesListQueryOptions = (input: RoleListQuery) =>
  queryOptions<{ items: RoleListItemDto[]; total: number }>({
    queryKey: rolesQueryKey.list(input),
    queryFn: async () => listRoles({ data: input }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useRolesList(input: RoleListQuery) {
  return useQuery(rolesListQueryOptions(input));
}

/**
 * 仅启用中、可分配给角色的菜单。
 * 通过菜单树接口拿整树（含 group/menu/action），由 MenuTree 自行渲染与筛选。
 */
const assignableMenuTreeQueryOptions = () =>
  queryOptions<MenuNode[]>({
    queryKey: rolesQueryKey.assignableMenus(),
    queryFn: async () => getMenuTree(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useAssignableMenus() {
  return useQuery(assignableMenuTreeQueryOptions());
}
