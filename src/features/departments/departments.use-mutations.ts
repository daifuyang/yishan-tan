import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createDepartment,
  deleteDepartment,
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
