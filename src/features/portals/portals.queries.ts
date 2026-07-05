import { queryOptions, useQuery } from "@tanstack/react-query";

import { getDefaultPortal, getPortal, listPortals } from "~/features/portals/portals.actions";
import type { PortalListQuery } from "~/features/portals/portals.schema";
import type { PortalDto } from "~/features/portals/portals.types";

export const portalsQueryKey = {
  all: ["portals"] as const,
  lists: () => [...portalsQueryKey.all, "list"] as const,
  list: (input: PortalListQuery) => [...portalsQueryKey.lists(), input] as const,
  defaults: () => [...portalsQueryKey.all, "default"] as const,
  details: () => [...portalsQueryKey.all, "detail"] as const,
  detail: (id: string) => [...portalsQueryKey.details(), id] as const,
};

export const portalsListQueryOptions = (input: PortalListQuery) =>
  queryOptions<{ items: PortalDto[]; total: number }>({
    queryKey: portalsQueryKey.list(input),
    queryFn: async () => listPortals({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function usePortalsList(input: PortalListQuery) {
  return useQuery(portalsListQueryOptions(input));
}

export const portalDetailQueryOptions = (id: string) =>
  queryOptions<PortalDto | null>({
    queryKey: portalsQueryKey.detail(id),
    queryFn: async () => getPortal({ data: { id } }),
    staleTime: 30_000,
    enabled: Boolean(id),
  });

export function usePortalDetail(id: string) {
  return useQuery(portalDetailQueryOptions(id));
}

export const defaultPortalQueryOptions = () =>
  queryOptions<PortalDto | null>({
    queryKey: portalsQueryKey.defaults(),
    queryFn: async () => getDefaultPortal(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useDefaultPortal() {
  return useQuery(defaultPortalQueryOptions());
}
