import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMenu, deleteMenu, updateMenu } from "~/features/menus/menus.actions";
import { menuQueryKey } from "~/features/menus/menus.queries";
import type { CreateMenuInput, UpdateMenuInput } from "~/features/menus/menus.schema";

export function useCreateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMenuInput) => {
      return createMenu({ data });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menuQueryKey.all });
    },
  });
}

type UpdateMenuInputWithId = UpdateMenuInput & { id: string };

export function useUpdateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateMenuInputWithId) => {
      return updateMenu({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menuQueryKey.all });
    },
  });
}

export function useDeleteMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteMenu({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menuQueryKey.all });
    },
  });
}
