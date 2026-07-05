import { queryOptions, useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "~/features/auth/auth.actions";
import type { PublicUser } from "~/features/auth/auth.types";

export const currentUserQueryKey = ["auth", "current-user"] as const;

export const currentUserQueryOptions = () =>
  queryOptions<PublicUser | null>({
    queryKey: currentUserQueryKey,
    queryFn: async () => getCurrentUser(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions());
}

export function isSystemAdminRole(user: PublicUser | null | undefined): boolean {
  return user?.role === "admin";
}
