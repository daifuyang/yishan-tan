import { queryOptions, useQuery } from "@tanstack/react-query";

import { batchGetSystemOptions } from "~/features/system-settings/system-settings.actions";
import type { SystemOptionDto } from "~/features/system-settings/system-settings.types";

import { findSystemOptionGroup } from "./system-settings.groups";

/**
 * 系统配置 queryKey 命名：
 *  - all：所有 system-settings 缓存的前缀
 *  - group(code)：单个分组的缓存，便于 mutate 后只 invalidate 本组
 */
export const systemSettingsQueryKey = {
  all: ["system-settings"] as const,
  groups: () => [...systemSettingsQueryKey.all, "group"] as const,
  group: (code: string) => [...systemSettingsQueryKey.groups(), code] as const,
};

export const systemOptionGroupQueryOptions = (groupCode: string) =>
  queryOptions<SystemOptionDto[]>({
    queryKey: systemSettingsQueryKey.group(groupCode),
    queryFn: async () => {
      const group = findSystemOptionGroup(groupCode);
      if (!group) return [];
      const keys = group.options.map((o) => o.key);
      if (keys.length === 0) return [];
      return batchGetSystemOptions({ data: { keys } });
    },
    enabled: Boolean(findSystemOptionGroup(groupCode)),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useSystemOptionGroup(groupCode: string) {
  return useQuery(systemOptionGroupQueryOptions(groupCode));
}
