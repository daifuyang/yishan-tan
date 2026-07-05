import { createFileRoute } from "@tanstack/react-router";
import { createDictDataSchema, dictDataListQuerySchema } from "~/features/dicts/dicts.schema";
import { createDictDataService, listDictDataService } from "~/features/dicts/dicts.service";
import { ensureAdmin, parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";

export const Route = createFileRoute("/api/v1/dicts-data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await ensureAdmin(request);
          const query = await parseQuery(request, dictDataListQuerySchema);
          const result = await listDictDataService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await ensureAdmin(request);
          const body = await parseJsonBody(request, createDictDataSchema);
          const result = await createDictDataService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
