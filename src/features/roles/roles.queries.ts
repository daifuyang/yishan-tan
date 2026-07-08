import { queryOptions, useQuery } from "@tanstack/react-query";

import { getMenuTree } from "~/features/menus/menus.actions";
import type { MenuNode } from "~/features/menus/menus.types";
import { getRole, listRoles } from "~/features/roles/roles.actions";
import type { RoleListQuery } from "~/features/roles/roles.schema";
import type { RoleDetailDto, RoleListItemDto } from "~/features/roles/roles.types";

export const rolesQueryKey = {
  all: ["roles"] as const,
  lists: () => [...rolesQueryKey.all, "list"] as const,
  list: (input: RoleListQuery) => [...rolesQueryKey.lists(), input] as const,
  details: () => [...rolesQueryKey.all, "detail"] as const,
  detail: (id: string) => [...rolesQueryKey.details(), id] as const,
  assignableMenus: () => [...rolesQueryKey.all, "assignable-menus"] as const,
};

export const rolesListQueryOptions = (input: RoleListQuery) =>
  queryOptions<{ items: RoleListItemDto[]; total: number }>({
    queryKey: rolesQueryKey.list(input),
    queryFn: async () => listRoles({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useRolesList(input: RoleListQuery) {
  return useQuery(rolesListQueryOptions(input));
}

export const rolesDetailQueryOptions = (id: string) =>
  queryOptions<RoleDetailDto>({
    queryKey: rolesQueryKey.detail(id),
    queryFn: async () => getRole({ data: { id } }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: Boolean(id),
  });

export function useRoleDetail(id: string | null | undefined) {
  return useQuery({
    ...rolesDetailQueryOptions(id ?? ""),
    enabled: Boolean(id),
  });
}

/**
 * 仅启用中、可分配给角色的菜单。
 * 通过菜单树接口拿整树（含 group/menu/action），由 MenuTree 自行渲染与筛选。
 */
const assignableMenuTreeQueryOptions = () =>
  queryOptions<MenuNode[]>({
    queryKey: rolesQueryKey.assignableMenus(),
    queryFn: async () => getMenuTree(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useAssignableMenus() {
  return useQuery(assignableMenuTreeQueryOptions());
}
