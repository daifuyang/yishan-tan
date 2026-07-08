/**
 * /api/v1/menus —— 菜单/权限树（admin 或已认证用户）。
 */
import { z } from "zod";
import {
  createMenuSchema,
  menuListQuerySchema,
  updateMenuSchema,
} from "~/features/menus/menus.schema";
import { menuDtoSchema, menuNodeSchema, okEnvelope } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");

// MenuNode 是递归结构，单独 register 让它进 components.schemas
registry.register("MenuNode", menuNodeSchema);

registry.registerPath({
  method: "get",
  path: "/api/v1/menus",
  operationId: "listMenus",
  summary:
    "查询菜单。query 选项：tree=1（树）| authorized=tree（当前用户可见树）| authorized=paths（路径集合）",
  tags: ["menus"],
  request: { query: menuListQuerySchema },
  responses: {
    200: {
      description: "默认分页列表；带 tree / authorized 参数时返回树或路径集合",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(menuDtoSchema).openapi("MenuPage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/menus",
  operationId: "createMenu",
  summary: "创建菜单（admin）",
  tags: ["menus"],
  request: { body: { content: { "application/json": { schema: createMenuSchema } } } },
  responses: {
    201: {
      description: "创建成功",
      content: { "application/json": { schema: okEnvelope("CreatedMenu", menuDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/menus/{id}",
  operationId: "updateMenu",
  summary: "更新菜单（admin）",
  tags: ["menus"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updateMenuSchema } } },
  },
  responses: {
    200: {
      description: "更新后的菜单",
      content: { "application/json": { schema: okEnvelope("UpdatedMenu", menuDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/menus/{id}",
  operationId: "deleteMenu",
  summary: "删除菜单（admin）。工作台/系统管理不可删，仍被引用也不能删",
  tags: ["menus"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedMenu", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
