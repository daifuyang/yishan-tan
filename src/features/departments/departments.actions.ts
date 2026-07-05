import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { contextFromRequest } from "~/server/request-context";
import { assertCanManageDepartments } from "./departments.policy";
import {
  createDepartmentSchema,
  departmentListQuerySchema,
  updateDepartmentSchema,
} from "./departments.schema";
import {
  createDepartmentService,
  deleteDepartmentService,
  getDepartmentService,
  getDepartmentTreeService,
  listDepartmentsService,
  updateDepartmentService,
} from "./departments.service";

async function adminCtx() {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertCanManageDepartments(ctx);
  return ctx;
}

export const listDepartments = createServerFn({ method: "GET" })
  .validator(departmentListQuerySchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listDepartmentsService(data);
  });

export const getDepartmentTree = createServerFn({ method: "GET" }).handler(async () => {
  await adminCtx();
  return getDepartmentTreeService();
});

export const getDepartment = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const dept = await getDepartmentService(data.id);
    if (!dept) throw new Error("NOT_FOUND");
    return dept;
  });

export const createDepartment = createServerFn({ method: "POST" })
  .validator(createDepartmentSchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return createDepartmentService(data);
  });

export const updateDepartment = createServerFn({ method: "POST" })
  .validator(updateDepartmentSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const { id, ...rest } = data;
    return updateDepartmentService(id, rest);
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    return deleteDepartmentService(data.id);
  });
