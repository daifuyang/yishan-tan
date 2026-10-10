import { createFileRoute } from "@tanstack/react-router";
import { assertDictOperation } from "~/features/dicts/dicts.policy";
import { createDictDataSchema, dictDataListQuerySchema } from "~/features/dicts/dicts.schema";
import { createDictDataService, listDictDataService } from "~/features/dicts/dicts.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/dicts-data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertDictOperation(await requireRequestContext(request), "dicts:read");
          const query = await parseQuery(request, dictDataListQuerySchema);
          const result = await listDictDataService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertDictOperation(await requireRequestContext(request), "dicts:create");
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
