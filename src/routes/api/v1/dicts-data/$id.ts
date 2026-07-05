import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { updateDictDataSchema } from "~/features/dicts/dicts.schema";
import {
  deleteDictDataService,
  getDictDataService,
  updateDictDataService,
} from "~/features/dicts/dicts.service";
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

export const Route = createFileRoute("/api/v1/dicts-data/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          const row = await getDictDataService(id);
          if (!row) throw Errors.notFound("字典数据不存在");
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updateDictDataSchema);
          const row = await updateDictDataService(id, body);
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
          const { id } = parseParams(idParamSchema, params);
          await deleteDictDataService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
