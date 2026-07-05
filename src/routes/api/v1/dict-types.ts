import { createFileRoute } from "@tanstack/react-router";
import { createDictTypeSchema, dictTypeListQuerySchema } from "~/features/dicts/dicts.schema";
import { createDictTypeService, listDictTypesService } from "~/features/dicts/dicts.service";
import { ensureAdmin, parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";

export const Route = createFileRoute("/api/v1/dict-types")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await ensureAdmin(request);
          const query = await parseQuery(request, dictTypeListQuerySchema);
          const result = await listDictTypesService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await ensureAdmin(request);
          const body = await parseJsonBody(request, createDictTypeSchema);
          const result = await createDictTypeService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
