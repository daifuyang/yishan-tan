import { queryOptions, useQuery } from "@tanstack/react-query";

import {
  getDepartment,
  getDepartmentTree,
  listDepartments,
} from "~/features/departments/departments.actions";
import type { DepartmentListQuery } from "~/features/departments/departments.schema";
import type { DepartmentDto, DepartmentNode } from "~/features/departments/departments.types";

export const departmentsQueryKey = {
  all: ["departments"] as const,
  lists: () => [...departmentsQueryKey.all, "list"] as const,
  list: (input: DepartmentListQuery) => [...departmentsQueryKey.lists(), input] as const,
  tree: () => [...departmentsQueryKey.all, "tree"] as const,
  details: () => [...departmentsQueryKey.all, "detail"] as const,
  detail: (id: string) => [...departmentsQueryKey.details(), id] as const,
};

export const departmentsListQueryOptions = (input: DepartmentListQuery) =>
  queryOptions<{ items: DepartmentDto[]; total: number }>({
    queryKey: departmentsQueryKey.list(input),
    queryFn: async () => listDepartments({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useDepartmentsList(input: DepartmentListQuery) {
  return useQuery(departmentsListQueryOptions(input));
}

export const departmentTreeQueryOptions = () =>
  queryOptions<DepartmentNode[]>({
    queryKey: departmentsQueryKey.tree(),
    queryFn: async () => getDepartmentTree(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useDepartmentTree() {
  return useQuery(departmentTreeQueryOptions());
}

export const departmentDetailQueryOptions = (id: string) =>
  queryOptions<DepartmentDto | null>({
    queryKey: departmentsQueryKey.detail(id),
    queryFn: async () => getDepartment({ data: { id } }),
    staleTime: 30_000,
    enabled: Boolean(id),
  });

export function useDepartmentDetail(id: string) {
  return useQuery(departmentDetailQueryOptions(id));
}
