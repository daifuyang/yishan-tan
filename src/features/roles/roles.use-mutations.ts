import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRole, deleteRole, updateRole } from "~/features/roles/roles.actions";
import { rolesQueryKey } from "~/features/roles/roles.queries";
import type { CreateRoleInput, UpdateRoleInput } from "~/features/roles/roles.schema";

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRoleInput) => {
      return createRole({ data });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rolesQueryKey.all });
    },
  });
}

type UpdateRoleInputWithId = UpdateRoleInput & { id: string };

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateRoleInputWithId) => {
      return updateRole({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rolesQueryKey.all });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteRole({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rolesQueryKey.all });
    },
  });
}

export function useBulkDeleteRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const settled = await Promise.allSettled(ids.map((id) => deleteRole({ data: { id } })));
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
      await queryClient.invalidateQueries({ queryKey: rolesQueryKey.all });
    },
  });
}
