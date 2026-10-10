import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertRoleOperation } from "~/features/roles/roles.policy";
import { updateRoleSchema } from "~/features/roles/roles.schema";
import {
  deleteRoleService,
  getRoleService,
  updateRoleService,
} from "~/features/roles/roles.service";
import { Errors } from "~/lib/errors";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/roles/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await assertRoleOperation(await requireRequestContext(request), "roles:read");
          const { id } = parseParams(idParamSchema, params);
          const role = await getRoleService({ id });
          if (!role) throw Errors.notFound("角色不存在");
          return ok(role);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const ctx = await requireRequestContext(request);
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updateRoleSchema);
          await assertRoleOperation(ctx, "roles:update", body.permissionCodes);
          const role = await updateRoleService({ ctx, id, data: body });
          return ok(role);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertRoleOperation(await requireRequestContext(request), "roles:delete");
          const { id } = parseParams(idParamSchema, params);
          await deleteRoleService({ id });
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
