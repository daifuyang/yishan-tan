import { queryOptions, useQuery } from "@tanstack/react-query";

import { listLoginLogs } from "~/features/login-logs/login-logs.actions";
import type { ListLoginLogsQuery } from "~/features/login-logs/login-logs.schema";
import type { LoginLogDto } from "~/features/login-logs/login-logs.types";

export const loginLogsQueryKey = {
  all: ["login-logs"] as const,
  lists: () => [...loginLogsQueryKey.all, "list"] as const,
  list: (input: ListLoginLogsQuery) => [...loginLogsQueryKey.lists(), input] as const,
};

export const loginLogsListQueryOptions = (input: ListLoginLogsQuery) =>
  queryOptions<{ items: LoginLogDto[]; total: number }>({
    queryKey: loginLogsQueryKey.list(input),
    queryFn: async () => listLoginLogs({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useLoginLogsList(input: ListLoginLogsQuery) {
  return useQuery(loginLogsListQueryOptions(input));
}
