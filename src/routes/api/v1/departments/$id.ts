import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertDepartmentOperation } from "~/features/departments/departments.policy";
import { updateDepartmentSchema } from "~/features/departments/departments.schema";
import {
  deleteDepartmentService,
  updateDepartmentService,
} from "~/features/departments/departments.service";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/departments/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          await assertDepartmentOperation(
            await requireRequestContext(request),
            "departments:update",
          );
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updateDepartmentSchema);
          const result = await updateDepartmentService(id, body);
          return ok(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertDepartmentOperation(
            await requireRequestContext(request),
            "departments:delete",
          );
          const { id } = parseParams(idParamSchema, params);
          await deleteDepartmentService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
