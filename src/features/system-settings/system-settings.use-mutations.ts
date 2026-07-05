import { useMutation, useQueryClient } from "@tanstack/react-query";

import { batchSetSystemOptions } from "~/features/system-settings/system-settings.actions";

import { systemSettingsQueryKey } from "./system-settings.queries";

export type SaveSystemOptionGroupInput = {
  groupCode: string;
  items: Array<{
    key: string;
    value: string;
    description?: string;
  }>;
};

/**
 * 批量保存某一分组的系统配置。
 * 仅 invalidate 当前分组的缓存，避免无关分组被重查。
 */
export function useSaveSystemOptionGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupCode: _groupCode, items }: SaveSystemOptionGroupInput) => {
      return batchSetSystemOptions({ data: { items } });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: systemSettingsQueryKey.group(variables.groupCode),
      });
    },
  });
}
