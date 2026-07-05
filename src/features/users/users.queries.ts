import { queryOptions, useQuery } from "@tanstack/react-query";

import { useRolesList } from "~/features/roles/roles.queries";
import { getUser, listUsers } from "~/features/users/users.actions";
import type { UserListQuery } from "~/features/users/users.schema";
import type { AdminUserDto } from "~/features/users/users.types";

export const usersQueryKey = {
  all: ["users"] as const,
  lists: () => [...usersQueryKey.all, "list"] as const,
  list: (input: UserListQuery) => [...usersQueryKey.lists(), input] as const,
  details: () => [...usersQueryKey.all, "detail"] as const,
  detail: (id: string) => [...usersQueryKey.details(), id] as const,
};

export const usersListQueryOptions = (input: UserListQuery) =>
  queryOptions<{ items: AdminUserDto[]; total: number }>({
    queryKey: usersQueryKey.list(input),
    queryFn: async () => listUsers({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useUsersList(input: UserListQuery) {
  return useQuery(usersListQueryOptions(input));
}

export const userDetailQueryOptions = (id: string) =>
  queryOptions<AdminUserDto | null>({
    queryKey: usersQueryKey.detail(id),
    queryFn: async () => getUser({ data: { id } }),
    staleTime: 30_000,
    enabled: Boolean(id),
  });

export function useUserDetail(id: string) {
  return useQuery(userDetailQueryOptions(id));
}

/**
 * 仅返回启用中、可分配给用户的业务角色。pageSize 取 schema 上限 100，避免分页遗漏；
 * 若角色数量未来突破该上限，应在 roles.feature 新增不带分页的轻量 service。
 */
const ASSIGNABLE_ROLES_QUERY: Parameters<typeof useRolesList>[0] = {
  page: 1,
  pageSize: 100,
  status: "enabled",
};

export function useAssignableRoles() {
  return useRolesList(ASSIGNABLE_ROLES_QUERY);
}
