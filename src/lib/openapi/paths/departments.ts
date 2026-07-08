/**
 * /api/v1/departments —— 部门管理（admin）。
 */
import { z } from "zod";
import {
  createDepartmentSchema,
  departmentListQuerySchema,
  updateDepartmentSchema,
} from "~/features/departments/departments.schema";
import { departmentDtoSchema, departmentNodeSchema, okEnvelope } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");

// 递归 DepartmentNode 单注册
registry.register("DepartmentNode", departmentNodeSchema);

registry.registerPath({
  method: "get",
  path: "/api/v1/departments",
  operationId: "listDepartments",
  summary: "查询部门。tree=1 返回树",
  tags: ["departments"],
  request: { query: departmentListQuerySchema },
  responses: {
    200: {
      description: "默认分页列表；tree=1 时返回树",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(departmentDtoSchema).openapi("DepartmentPage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/departments",
  operationId: "createDepartment",
  summary: "创建部门（admin）",
  tags: ["departments"],
  request: { body: { content: { "application/json": { schema: createDepartmentSchema } } } },
  responses: {
    201: {
      description: "创建成功",
      content: {
        "application/json": { schema: okEnvelope("CreatedDepartment", departmentDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/departments/{id}",
  operationId: "updateDepartment",
  summary: "更新部门（admin）。parent 不能是自身或子孙",
  tags: ["departments"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updateDepartmentSchema } } },
  },
  responses: {
    200: {
      description: "更新后的部门",
      content: {
        "application/json": { schema: okEnvelope("UpdatedDepartment", departmentDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/departments/{id}",
  operationId: "deleteDepartment",
  summary: "删除部门（admin）。有子部门时不能删",
  tags: ["departments"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedDepartment", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
