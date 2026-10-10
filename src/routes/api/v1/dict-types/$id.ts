import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertDictOperation } from "~/features/dicts/dicts.policy";
import { updateDictTypeSchema } from "~/features/dicts/dicts.schema";
import {
  deleteDictTypeService,
  getDictTypeService,
  updateDictTypeService,
} from "~/features/dicts/dicts.service";
import { Errors } from "~/lib/errors";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/dict-types/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await assertDictOperation(await requireRequestContext(request), "dicts:read");
          const { id } = parseParams(idParamSchema, params);
          const row = await getDictTypeService(id);
          if (!row) throw Errors.notFound("字典类型不存在");
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          await assertDictOperation(await requireRequestContext(request), "dicts:update");
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updateDictTypeSchema);
          const row = await updateDictTypeService(id, body);
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertDictOperation(await requireRequestContext(request), "dicts:delete");
          const { id } = parseParams(idParamSchema, params);
          await deleteDictTypeService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
