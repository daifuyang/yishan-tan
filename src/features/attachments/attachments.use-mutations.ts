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
