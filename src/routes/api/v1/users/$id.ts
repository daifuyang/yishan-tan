import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { updateUserSchema } from "~/features/users/users.schema";
import {
  deleteUserService,
  getUserService,
  updateUserService,
} from "~/features/users/users.service";
import { requireAdmin } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import { parseJsonBody } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

async function ensureAdminCtx(request: Request) {
  const ctx = await requireRequestContext(request);
  await requireAdmin(ctx);
  return ctx;
}

export const Route = createFileRoute("/api/v1/users/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
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
          const ctx = await ensureAdminCtx(request);
          const { id } = idParamSchema.parse({ id: params.id });
          const body = await parseJsonBody(request, updateUserSchema);
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
          const ctx = await ensureAdminCtx(request);
          const { id } = idParamSchema.parse({ id: params.id });
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
