import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteAttachment } from "~/features/attachments/attachments.actions";
import { attachmentsQueryKey } from "~/features/attachments/attachments.queries";

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteAttachment({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: attachmentsQueryKey.all });
    },
  });
}

export function useBulkDeleteAttachments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const settled = await Promise.allSettled(ids.map((id) => deleteAttachment({ data: { id } })));
      const failed = settled.filter((s) => s.status === "rejected") as PromiseRejectedResult[];
      if (failed.length > 0) {
        const messages = failed.map((f) =>
          f.reason instanceof Error ? f.reason.message : String(f.reason),
        );
        throw new Error(`${failed.length}/${ids.length} 条删除失败：${messages[0]}`);
      }
      return { deleted: ids.length };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: attachmentsQueryKey.all });
    },
  });
}
