/**
 * /api/v1/users —— 用户管理。
 */
import { z } from "zod";
import { createUserSchema } from "~/features/auth/auth.schema";
import { updateUserSchema, userListQuerySchema } from "~/features/users/users.schema";
import {
  adminUserDtoSchema,
  loginLogDtoSchema,
  okEnvelope,
  publicUserSchema,
} from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");
const loginLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

// POST /api/v1/users —— 公开注册（无需鉴权）
registry.registerPath({
  method: "post",
  path: "/api/v1/users",
  operationId: "createUser",
  summary: "注册新用户（公开）",
  tags: ["users"],
  security: [],
  request: { body: { content: { "application/json": { schema: createUserSchema } } } },
  responses: {
    201: {
      description: "注册成功",
      content: { "application/json": { schema: okEnvelope("CreatedUser", publicUserSchema) } },
    },
    ...useErrorResponses(),
  },
});

// GET /api/v1/users —— 列出用户（admin）
registry.registerPath({
  method: "get",
  path: "/api/v1/users",
  operationId: "listUsers",
  summary: "分页列出用户（admin）",
  tags: ["users"],
  request: { query: userListQuerySchema },
  responses: {
    200: {
      description: "分页用户列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(adminUserDtoSchema).openapi("UserPage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

// GET /api/v1/users/{id} —— 用户详情（admin）
registry.registerPath({
  method: "get",
  path: "/api/v1/users/{id}",
  operationId: "getUser",
  summary: "获取单个用户详情（admin）",
  tags: ["users"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "用户详情",
      content: { "application/json": { schema: okEnvelope("UserDetail", adminUserDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

// PATCH /api/v1/users/{id} —— 更新用户（admin）
registry.registerPath({
  method: "patch",
  path: "/api/v1/users/{id}",
  operationId: "updateUser",
  summary: "更新用户（admin）。不能禁用/删除自己",
  tags: ["users"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updateUserSchema } } },
  },
  responses: {
    200: {
      description: "更新后的用户",
      content: { "application/json": { schema: okEnvelope("UpdatedUser", adminUserDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

// DELETE /api/v1/users/{id} —— 软删除用户（admin）
registry.registerPath({
  method: "delete",
  path: "/api/v1/users/{id}",
  operationId: "deleteUser",
  summary: "软删除用户（admin）。不能删除自己",
  tags: ["users"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeleteUser", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});

// GET /api/v1/users/me —— 当前登录用户
registry.registerPath({
  method: "get",
  path: "/api/v1/users/me",
  operationId: "getCurrentUser",
  summary: "获取当前登录用户信息",
  tags: ["users"],
  responses: {
    200: {
      description: "当前用户",
      content: {
        "application/json": {
          schema: okEnvelope("CurrentUser", z.object({ user: publicUserSchema })),
        },
      },
    },
    ...useErrorResponses(),
  },
});

// PATCH /api/v1/users/me —— 改自己密码
registry.registerPath({
  method: "patch",
  path: "/api/v1/users/me",
  operationId: "updateCurrentUser",
  summary: "修改当前用户密码",
  tags: ["users"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            oldPassword: z.string().min(8).max(128),
            newPassword: z.string().min(8).max(128),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "修改成功，其他 session 会被吊销",
      content: {
        "application/json": {
          schema: okEnvelope("PasswordChanged", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});

// GET /api/v1/users/me/login-logs —— 自己登录日志
registry.registerPath({
  method: "get",
  path: "/api/v1/users/me/login-logs",
  operationId: "listMyLoginLogs",
  summary: "分页列出自己的登录日志",
  tags: ["users"],
  request: { query: loginLogsQuerySchema },
  responses: {
    200: {
      description: "登录日志分页",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(loginLogDtoSchema).openapi("LoginLogPage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});
