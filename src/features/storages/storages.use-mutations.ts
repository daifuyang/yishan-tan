import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createStorage,
  deleteStorage,
  setDefaultStorage,
  updateStorage,
} from "~/features/storages/storages.actions";
import { storagesQueryKey } from "~/features/storages/storages.queries";
import type { CreateStorageInput, UpdateStorageInput } from "~/features/storages/storages.schema";

export function useCreateStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStorageInput) => {
      return createStorage({ data });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storagesQueryKey.all });
    },
  });
}

type UpdateStorageInputWithId = UpdateStorageInput & { id: string };

export function useUpdateStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateStorageInputWithId) => {
      return updateStorage({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storagesQueryKey.all });
    },
  });
}

export function useDeleteStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteStorage({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storagesQueryKey.all });
    },
  });
}

export function useSetDefaultStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return setDefaultStorage({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storagesQueryKey.all });
    },
  });
}
