import type { DbDepartment } from "~/../db/schema";

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
}) => Promise<{ items: DepartmentDto[]; total: number }>;

export type GetDepartmentTreeService = () => Promise<DepartmentNode[]>;

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
