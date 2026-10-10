import { createFileRoute } from "@tanstack/react-router";
import { assertDictOperation } from "~/features/dicts/dicts.policy";
import { createDictTypeSchema, dictTypeListQuerySchema } from "~/features/dicts/dicts.schema";
import { createDictTypeService, listDictTypesService } from "~/features/dicts/dicts.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/dict-types")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertDictOperation(await requireRequestContext(request), "dicts:read");
          const query = await parseQuery(request, dictTypeListQuerySchema);
          const result = await listDictTypesService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertDictOperation(await requireRequestContext(request), "dicts:create");
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
