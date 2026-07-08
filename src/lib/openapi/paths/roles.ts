/**
 * /api/v1/roles —— 角色与权限（admin）。
 */
import { z } from "zod";
import {
  createRoleSchema,
  roleListQuerySchema,
  updateRoleSchema,
} from "~/features/roles/roles.schema";
import { okEnvelope, roleDetailDtoSchema, roleListItemDtoSchema } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");

registry.registerPath({
  method: "get",
  path: "/api/v1/roles",
  operationId: "listRoles",
  summary: "分页列出角色（admin）",
  tags: ["roles"],
  request: { query: roleListQuerySchema },
  responses: {
    200: {
      description: "分页角色列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(roleListItemDtoSchema).openapi("RolePage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/roles",
  operationId: "createRole",
  summary: "创建角色（admin）",
  tags: ["roles"],
  request: { body: { content: { "application/json": { schema: createRoleSchema } } } },
  responses: {
    201: {
      description: "创建成功",
      content: { "application/json": { schema: okEnvelope("CreatedRole", roleDetailDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/roles/{id}",
  operationId: "getRole",
  summary: "角色详情（admin）",
  tags: ["roles"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "角色详情",
      content: { "application/json": { schema: okEnvelope("RoleDetail", roleDetailDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/roles/{id}",
  operationId: "updateRole",
  summary: "更新角色（admin）",
  tags: ["roles"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updateRoleSchema } } },
  },
  responses: {
    200: {
      description: "更新后的角色",
      content: { "application/json": { schema: okEnvelope("UpdatedRole", roleDetailDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/roles/{id}",
  operationId: "deleteRole",
  summary: "删除角色（admin）。已绑定用户的角色不能删",
  tags: ["roles"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedRole", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
