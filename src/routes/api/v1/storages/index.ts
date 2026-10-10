import { createFileRoute } from "@tanstack/react-router";
import { assertStorageOperation } from "~/features/storages/storages.policy";
import { createStorageSchema, storageListQuerySchema } from "~/features/storages/storages.schema";
import { createStorageService, listStoragesService } from "~/features/storages/storages.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/storages/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertStorageOperation(await requireRequestContext(request), "storages:read");
          const query = await parseQuery(request, storageListQuerySchema);
          const result = await listStoragesService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertStorageOperation(await requireRequestContext(request), "storages:create");
          const body = await parseJsonBody(request, createStorageSchema);
          const result = await createStorageService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
