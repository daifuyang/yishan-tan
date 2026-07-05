import { queryOptions, useQuery } from "@tanstack/react-query";

import { getDefaultStorage, getStorage, listStorages } from "~/features/storages/storages.actions";
import type { StorageListQuery } from "~/features/storages/storages.schema";
import type { StorageDetailDto, StorageDto } from "~/features/storages/storages.types";

export const storagesQueryKey = {
  all: ["storages"] as const,
  lists: () => [...storagesQueryKey.all, "list"] as const,
  list: (input: StorageListQuery) => [...storagesQueryKey.lists(), input] as const,
  defaults: () => [...storagesQueryKey.all, "default"] as const,
  details: () => [...storagesQueryKey.all, "detail"] as const,
  detail: (id: string) => [...storagesQueryKey.details(), id] as const,
};

export const storagesListQueryOptions = (input: StorageListQuery) =>
  queryOptions<{ items: StorageDto[]; total: number }>({
    queryKey: storagesQueryKey.list(input),
    queryFn: async () => listStorages({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useStoragesList(input: StorageListQuery) {
  return useQuery(storagesListQueryOptions(input));
}

export const storageDetailQueryOptions = (id: string) =>
  queryOptions<StorageDetailDto | null>({
    queryKey: storagesQueryKey.detail(id),
    queryFn: async () => getStorage({ data: { id } }),
    staleTime: 30_000,
    enabled: Boolean(id),
  });

export function useStorageDetail(id: string) {
  return useQuery(storageDetailQueryOptions(id));
}

export const defaultStorageQueryOptions = () =>
  queryOptions<StorageDetailDto | null>({
    queryKey: storagesQueryKey.defaults(),
    queryFn: async () => getDefaultStorage(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useDefaultStorage() {
  return useQuery(defaultStorageQueryOptions());
}
