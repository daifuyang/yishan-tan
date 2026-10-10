import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertMenuOperation } from "~/features/menus/menus.policy";
import { createMenuSchema, menuListQuerySchema } from "~/features/menus/menus.schema";
import {
  createMenuService,
  getAuthorizedMenuPathsService,
  getAuthorizedMenuTreeService,
  getMenuTreeService,
  listMenusService,
} from "~/features/menus/menus.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const flagQuerySchema = z.object({
  tree: z.string().optional(),
  authorized: z.string().optional(),
});

export const Route = createFileRoute("/api/v1/menus")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const params = flagQuerySchema.parse({
            tree: url.searchParams.get("tree") ?? undefined,
            authorized: url.searchParams.get("authorized") ?? undefined,
          });
          if (params.authorized === "paths") {
            const ctx = await requireRequestContext(request);
            const paths = await getAuthorizedMenuPathsService(ctx.userId);
            return ok({ paths });
          }
          if (params.authorized === "tree") {
            const ctx = await requireRequestContext(request);
            const tree = await getAuthorizedMenuTreeService(ctx.userId);
            return ok({ items: tree });
          }
          if (params.tree === "1") {
            await assertMenuOperation(await requireRequestContext(request), "menus:read");
            const tree = await getMenuTreeService();
            return ok({ items: tree });
          }
          await assertMenuOperation(await requireRequestContext(request), "menus:read");
          const query = await parseQuery(request, menuListQuerySchema);
          const result = await listMenusService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await parseJsonBody(request, createMenuSchema);
          await assertMenuOperation(
            await requireRequestContext(request),
            "menus:create",
            body.permissionCodes,
          );
          const result = await createMenuService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
