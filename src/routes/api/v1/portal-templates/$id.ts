import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import { updatePortalTemplateSchema } from "~/features/portal-content/portal-content.schema";
import {
  deletePortalTemplateService,
  getPortalTemplateService,
  updatePortalTemplateService,
} from "~/features/portal-content/portal-content.service";
import { Errors } from "~/lib/errors";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/portal-templates/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-templates:read",
          );
          const { id } = parseParams(idParamSchema, params);
          const row = await getPortalTemplateService(id);
          if (!row) throw Errors.notFound("模板不存在");
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-templates:update",
          );
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updatePortalTemplateSchema);
          const row = await updatePortalTemplateService(id, body);
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-templates:delete",
          );
          const { id } = parseParams(idParamSchema, params);
          await deletePortalTemplateService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
