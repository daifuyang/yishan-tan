import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertUserOperation } from "~/features/users/users.policy";
import { updateUserSchema } from "~/features/users/users.schema";
import {
  deleteUserService,
  getUserService,
  updateUserService,
} from "~/features/users/users.service";
import { Errors } from "~/lib/errors";
import type { PermissionCode } from "~/lib/permission-catalog";
import { parseJsonBody } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

async function ensureAdminCtx(request: Request, code: PermissionCode) {
  const ctx = await requireRequestContext(request);
  await assertUserOperation(ctx, code);
  return ctx;
}

export const Route = createFileRoute("/api/v1/users/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request, "users:read");
          const { id } = idParamSchema.parse({ id: params.id });
          const user = await getUserService(id);
          if (!user) throw Errors.notFound("用户不存在");
          return ok(user);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const ctx = await ensureAdminCtx(request, "users:update");
          const { id } = idParamSchema.parse({ id: params.id });
          const body = await parseJsonBody(request, updateUserSchema);
          await assertUserOperation(ctx, "users:update", { id, roleIds: body.roleIds });
          if (body.status === "disabled" && id === ctx.userId) {
            throw Errors.invalid("不能禁用当前登录用户");
          }
          const user = await updateUserService(id, body);
          return ok(user);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const ctx = await ensureAdminCtx(request, "users:delete");
          const { id } = idParamSchema.parse({ id: params.id });
          await assertUserOperation(ctx, "users:delete", { id });
          if (id === ctx.userId) throw Errors.invalid("不能删除当前登录用户");
          await deleteUserService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
