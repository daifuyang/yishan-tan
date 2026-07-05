import { queryOptions, useQuery } from "@tanstack/react-query";

import {
  attachmentCategories,
  getAttachment,
  listAttachments,
} from "~/features/attachments/attachments.actions";
import type { AttachmentListQuery } from "~/features/attachments/attachments.schema";
import type { AttachmentDto } from "~/features/attachments/attachments.types";

export const attachmentsQueryKey = {
  all: ["attachments"] as const,
  lists: () => [...attachmentsQueryKey.all, "list"] as const,
  list: (input: AttachmentListQuery) => [...attachmentsQueryKey.lists(), input] as const,
  categories: () => [...attachmentsQueryKey.all, "categories"] as const,
  details: () => [...attachmentsQueryKey.all, "detail"] as const,
  detail: (id: string) => [...attachmentsQueryKey.details(), id] as const,
};

export const attachmentsListQueryOptions = (input: AttachmentListQuery) =>
  queryOptions<{ items: AttachmentDto[]; total: number }>({
    queryKey: attachmentsQueryKey.list(input),
    queryFn: async () => listAttachments({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useAttachmentsList(input: AttachmentListQuery) {
  return useQuery(attachmentsListQueryOptions(input));
}

export const attachmentDetailQueryOptions = (id: string) =>
  queryOptions<AttachmentDto | null>({
    queryKey: attachmentsQueryKey.detail(id),
    queryFn: async () => getAttachment({ data: { id } }),
    staleTime: 30_000,
    enabled: Boolean(id),
  });

export function useAttachmentDetail(id: string) {
  return useQuery(attachmentDetailQueryOptions(id));
}

export const attachmentCategoriesQueryOptions = () =>
  queryOptions<AttachmentDto["category"][]>({
    queryKey: attachmentsQueryKey.categories(),
    queryFn: async () => attachmentCategories(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useAttachmentCategories() {
  return useQuery(attachmentCategoriesQueryOptions());
}
