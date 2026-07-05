import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { updateRoleSchema } from "~/features/roles/roles.schema";
import {
  deleteRoleService,
  getRoleService,
  updateRoleService,
} from "~/features/roles/roles.service";
import { requireAdmin } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

async function ensureAdminCtx(request: Request) {
  const ctx = await requireRequestContext(request);
  await requireAdmin(ctx);
  return ctx;
}

export const Route = createFileRoute("/api/v1/roles/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          const role = await getRoleService(id);
          if (!role) throw Errors.notFound("角色不存在");
          return ok(role);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updateRoleSchema);
          const role = await updateRoleService(id, body);
          return ok(role);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          await deleteRoleService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
