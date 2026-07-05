import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { updateDepartmentSchema } from "~/features/departments/departments.schema";
import {
  deleteDepartmentService,
  updateDepartmentService,
} from "~/features/departments/departments.service";
import { requireAdmin } from "~/lib/authorization.server";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

async function ensureAdminCtx(request: Request) {
  const ctx = await requireRequestContext(request);
  await requireAdmin(ctx);
  return ctx;
}

export const Route = createFileRoute("/api/v1/departments/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updateDepartmentSchema);
          const result = await updateDepartmentService(id, body);
          return ok(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          await deleteDepartmentService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
