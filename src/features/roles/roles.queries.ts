import { queryOptions, useQuery } from "@tanstack/react-query";

import { listMenus } from "~/features/menus/menus.actions";
import type { MenuListQuery } from "~/features/menus/menus.schema";
import type { MenuDto } from "~/features/menus/menus.types";
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

const ASSIGNABLE_MENUS_QUERY: MenuListQuery = {
  page: 1,
  pageSize: 100,
  status: "enabled",
};

const assignableMenusQueryOptions = () =>
  queryOptions<{ items: MenuDto[]; total: number }>({
    queryKey: rolesQueryKey.assignableMenus(),
    queryFn: async () => listMenus({ data: ASSIGNABLE_MENUS_QUERY }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useAssignableMenus() {
  return useQuery(assignableMenusQueryOptions());
}
