import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertDepartmentOperation } from "~/features/departments/departments.policy";
import {
  createDepartmentSchema,
  departmentListQuerySchema,
} from "~/features/departments/departments.schema";
import {
  createDepartmentService,
  getDepartmentTreeService,
  listDepartmentsService,
} from "~/features/departments/departments.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const treeQuerySchema = z.object({ tree: z.literal("1").optional() });

export const Route = createFileRoute("/api/v1/departments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertDepartmentOperation(await requireRequestContext(request), "departments:read");
          const url = new URL(request.url);
          const wantsTree = url.searchParams.get("tree") === "1";
          treeQuerySchema.parse({ tree: url.searchParams.get("tree") ?? undefined });
          if (wantsTree) {
            const tree = await getDepartmentTreeService();
            return ok({ items: tree });
          }
          const query = await parseQuery(request, departmentListQuerySchema);
          const result = await listDepartmentsService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertDepartmentOperation(
            await requireRequestContext(request),
            "departments:create",
          );
          const body = await parseJsonBody(request, createDepartmentSchema);
          const result = await createDepartmentService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
