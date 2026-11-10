import type { DbDepartment } from "~/../db/schema";
import type { SortOrder } from "~/lib/list-sort";
import type { DepartmentSortBy } from "./departments.schema";

export type DepartmentDto = {
  id: string;
  parentId: string | null;
  parentName: string | null;
  name: string;
  leaderId: string | null;
  leaderName: string | null;
  sort: number;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type DepartmentNode = DepartmentDto & { children: DepartmentNode[] };

export type ListDepartmentsService = (input: {
  page: number;
  pageSize: number;
  name?: string;
  status?: "enabled" | "disabled";
  sortBy?: DepartmentSortBy;
  sortOrder?: SortOrder;
}) => Promise<{ items: DepartmentDto[]; total: number }>;

export type GetDepartmentTreeService = (input?: {
  sortBy?: DepartmentSortBy;
  sortOrder?: SortOrder;
}) => Promise<DepartmentNode[]>;

export type GetDepartmentService = (id: string) => Promise<DepartmentDto | null>;

export type CreateDepartmentService = (input: {
  parentId?: string | null;
  name: string;
  leaderId?: string | null;
  sort?: number;
  status?: "enabled" | "disabled";
}) => Promise<DepartmentDto>;

export type UpdateDepartmentService = (
  id: string,
  input: {
    parentId?: string | null;
    name?: string;
    leaderId?: string | null;
    sort?: number;
    status?: "enabled" | "disabled";
  },
) => Promise<DepartmentDto>;

export type DeleteDepartmentService = (id: string) => Promise<{ ok: true }>;

export type DbDepartmentRow = DbDepartment;
