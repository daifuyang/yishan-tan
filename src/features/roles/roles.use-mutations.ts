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
