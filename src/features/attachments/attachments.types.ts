import type { DbAttachment } from "~/../db/schema";

import type { AttachmentCategory, AttachmentListQuery } from "./attachments.schema";

export type AttachmentCategoryValue = AttachmentCategory;

export type AttachmentDto = {
  id: string;
  uploaderId: string | null;
  uploaderName: string | null;
  storageId: string | null;
  storageName: string | null;
  url: string;
  name: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  category: AttachmentCategoryValue;
  createdAt: string;
  updatedAt: string;
};

export type ListAttachmentsService = (
  input: AttachmentListQuery,
) => Promise<{ items: AttachmentDto[]; total: number }>;

export type GetAttachmentService = (id: string) => Promise<AttachmentDto | null>;

export type CreateAttachmentService = (input: {
  uploaderId: string | null;
  storageId: string | null;
  storageKey: string;
  url: string;
  name: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  category: AttachmentCategoryValue;
}) => Promise<AttachmentDto>;

export type DeleteAttachmentService = (
  id: string,
) => Promise<{ ok: true; storageKey: string | null; storageId: string | null }>;

export type DbAttachmentRow = DbAttachment;
