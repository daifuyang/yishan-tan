import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createDepartment,
  deleteDepartment,
  exportDepartments,
  updateDepartment,
} from "~/features/departments/departments.actions";
import { departmentsQueryKey } from "~/features/departments/departments.queries";
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "~/features/departments/departments.schema";

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDepartmentInput) => {
      return createDepartment({ data });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: departmentsQueryKey.all });
    },
  });
}

type UpdateDepartmentInputWithId = UpdateDepartmentInput & { id: string };

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDepartmentInputWithId) => {
      return updateDepartment({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: departmentsQueryKey.all });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDepartment({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: departmentsQueryKey.all });
    },
  });
}

export function useBulkDeleteDepartments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const settled = await Promise.allSettled(ids.map((id) => deleteDepartment({ data: { id } })));
      const failed = settled.filter((s) => s.status === "rejected") as PromiseRejectedResult[];
      if (failed.length > 0) {
        const messages = failed.map((f) =>
          f.reason instanceof Error ? f.reason.message : String(f.reason),
        );
        throw new Error(`${failed.length}/${ids.length} 条删除失败：${messages[0]}`);
      }
      return { deleted: ids.length };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: departmentsQueryKey.all });
    },
  });
}

/**
 * 导出当前筛选条件下全部部门为 CSV。
 * 返回 CSV 字符串，调用方负责触发浏览器下载（Blob + a[download]）。
 */
export function useExportDepartments() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof exportDepartments>[0]["data"]) => {
      return exportDepartments({ data: input });
    },
  });
}
