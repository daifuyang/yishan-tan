import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createPortal,
  deletePortal,
  setDefaultPortal,
  updatePortal,
} from "~/features/portals/portals.actions";
import { portalsQueryKey } from "~/features/portals/portals.queries";
import type { CreatePortalInput, UpdatePortalInput } from "~/features/portals/portals.schema";

export function useCreatePortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePortalInput) => {
      return createPortal({ data });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalsQueryKey.all });
    },
  });
}

type UpdatePortalInputWithId = UpdatePortalInput & { id: string };

export function useUpdatePortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePortalInputWithId) => {
      return updatePortal({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalsQueryKey.all });
    },
  });
}

export function useDeletePortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deletePortal({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalsQueryKey.all });
    },
  });
}

export function useSetDefaultPortal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return setDefaultPortal({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalsQueryKey.all });
    },
  });
}
