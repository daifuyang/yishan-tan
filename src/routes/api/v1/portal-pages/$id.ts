import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import { updatePortalPageSchema } from "~/features/portal-content/portal-content.schema";
import {
  deletePortalPageService,
  getPortalPageService,
  updatePortalPageService,
} from "~/features/portal-content/portal-content.service";
import { Errors } from "~/lib/errors";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/portal-pages/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-pages:read",
          );
          const { id } = parseParams(idParamSchema, params);
          const row = await getPortalPageService(id);
          if (!row) throw Errors.notFound("页面不存在");
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-pages:update",
          );
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updatePortalPageSchema);
          const row = await updatePortalPageService(id, body);
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-pages:delete",
          );
          const { id } = parseParams(idParamSchema, params);
          await deletePortalPageService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
