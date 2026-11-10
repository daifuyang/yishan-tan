import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireRequestContext } from "~/server/request-context";
import { assertDepartmentOperation } from "./departments.policy";
import {
  createDepartmentSchema,
  departmentListQuerySchema,
  departmentTreeQuerySchema,
  updateDepartmentSchema,
} from "./departments.schema";
import {
  createDepartmentService,
  deleteDepartmentService,
  exportDepartmentsService,
  getDepartmentFormOptionsService,
  getDepartmentService,
  getDepartmentTreeService,
  listDepartmentsService,
  updateDepartmentService,
} from "./departments.service";

async function operationCtx(code: Parameters<typeof assertDepartmentOperation>[1]) {
  const ctx = await requireRequestContext(getRequestHeaders());
  await assertDepartmentOperation(ctx, code);
  return ctx;
}

export const listDepartments = createServerFn({ method: "GET" })
  .validator(departmentListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("departments:read");
    return listDepartmentsService(data);
  });

export const getDepartmentTree = createServerFn({ method: "GET" })
  .validator(departmentTreeQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("departments:read");
    return getDepartmentTreeService(data);
  });

export const getDepartment = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("departments:read");
    const dept = await getDepartmentService(data.id);
    if (!dept) throw new Error("NOT_FOUND");
    return dept;
  });

export const createDepartment = createServerFn({ method: "POST" })
  .validator(createDepartmentSchema)
  .handler(async ({ data }) => {
    await operationCtx("departments:create");
    return createDepartmentService(data);
  });

export const updateDepartment = createServerFn({ method: "POST" })
  .validator(updateDepartmentSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("departments:update");
    const { id, ...rest } = data;
    return updateDepartmentService(id, rest);
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("departments:delete");
    return deleteDepartmentService(data.id);
  });

export const exportDepartments = createServerFn({ method: "GET" })
  .validator(departmentListQuerySchema.omit({ page: true, pageSize: true }))
  .handler(async ({ data }) => {
    await operationCtx("departments:export");
    return exportDepartmentsService(data);
  });

export const getDepartmentFormOptions = createServerFn({ method: "GET" })
  .validator(z.object({ operation: z.enum(["create", "update"]) }))
  .handler(async ({ data }) => {
    await operationCtx(`departments:${data.operation}`);
    return getDepartmentFormOptionsService();
  });
