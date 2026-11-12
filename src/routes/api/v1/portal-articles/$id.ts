import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import { updatePortalArticleSchema } from "~/features/portal-content/portal-content.schema";
import {
  deletePortalArticleService,
  getPortalArticleService,
  updatePortalArticleService,
} from "~/features/portal-content/portal-content.service";
import { Errors } from "~/lib/errors";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/portal-articles/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-articles:read",
          );
          const { id } = parseParams(idParamSchema, params);
          const row = await getPortalArticleService(id);
          if (!row) throw Errors.notFound("文章不存在");
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-articles:update",
          );
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updatePortalArticleSchema);
          const row = await updatePortalArticleService(id, body);
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-articles:delete",
          );
          const { id } = parseParams(idParamSchema, params);
          await deletePortalArticleService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
