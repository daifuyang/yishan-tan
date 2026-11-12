import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import { updatePortalCategorySchema } from "~/features/portal-content/portal-content.schema";
import {
  deletePortalCategoryService,
  getPortalCategoryService,
  updatePortalCategoryService,
} from "~/features/portal-content/portal-content.service";
import { Errors } from "~/lib/errors";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/portal-categories/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-categories:read",
          );
          const { id } = parseParams(idParamSchema, params);
          const row = await getPortalCategoryService(id);
          if (!row) throw Errors.notFound("分类不存在");
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-categories:update",
          );
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updatePortalCategorySchema);
          const row = await updatePortalCategoryService(id, body);
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-categories:delete",
          );
          const { id } = parseParams(idParamSchema, params);
          await deletePortalCategoryService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
