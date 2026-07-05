import type { DbPortal } from "~/../db/schema";

import type { CreatePortalInput, PortalThemeMode, UpdatePortalInput } from "./portals.schema";

export type { PortalThemeMode };

export type PortalStatus = "enabled" | "disabled";

export type PortalDto = {
  id: string;
  name: string;
  code: string;
  domain: string | null;
  logoUrl: string | null;
  themePrimary: string | null;
  themeMode: PortalThemeMode;
  description: string | null;
  isDefault: boolean;
  status: PortalStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreatePortalServiceInput = CreatePortalInput;

export type UpdatePortalServiceInput = UpdatePortalInput;

export type ListPortalsService = (input: {
  page: number;
  pageSize: number;
  keyword?: string;
  isDefault?: boolean;
  status?: PortalStatus;
  createdFrom?: string;
  createdTo?: string;
}) => Promise<{ items: PortalDto[]; total: number }>;

export type GetPortalService = (id: string) => Promise<PortalDto | null>;

export type GetDefaultPortalService = () => Promise<PortalDto | null>;

export type CreatePortalService = (input: CreatePortalServiceInput) => Promise<PortalDto>;

export type UpdatePortalService = (
  id: string,
  input: UpdatePortalServiceInput,
) => Promise<PortalDto>;

export type DeletePortalService = (id: string) => Promise<{ ok: true }>;

export type SetDefaultPortalService = (id: string) => Promise<PortalDto>;

export type DbPortalRow = DbPortal;
