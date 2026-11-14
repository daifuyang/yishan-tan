import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import { portalPageRenderQuerySchema } from "~/features/portal-content/portal-content.schema";
import { getPortalPageRenderService } from "~/features/portal-content/portal-content.site-layout.service";
import { Errors } from "~/lib/errors";
import { parseParams, parseQuery } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

/**
 * 取页面组合后的完整 Schema（全站公共页头 + 页面正文 + 全站公共页脚）。
 *
 * 前台正式渲染读它：`mode=published`（默认）只读已发布的页面与已发布的公共布局；
 * `mode=draft` 给预览。组合用的和设计器是同一个纯函数，三处结果一致。
 */
export const Route = createFileRoute("/api/v1/portal-pages/$id/render")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-pages:read",
          );
          const { id } = parseParams(idParamSchema, params);
          const { mode } = await parseQuery(request, portalPageRenderQuerySchema);
          const rendered = await getPortalPageRenderService(id, mode);
          if (!rendered) throw Errors.notFound("页面不存在或没有可渲染的内容");
          return ok(rendered);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
