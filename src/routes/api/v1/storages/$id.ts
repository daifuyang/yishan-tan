import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { updateStorageSchema } from "~/features/storages/storages.schema";
import {
  deleteStorageService,
  getStorageService,
  updateStorageService,
} from "~/features/storages/storages.service";
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

export const Route = createFileRoute("/api/v1/storages/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          const storage = await getStorageService(id);
          if (!storage) throw Errors.notFound("存储不存在");
          return ok(storage);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updateStorageSchema);
          const storage = await updateStorageService(id, body);
          return ok(storage);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          await deleteStorageService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
