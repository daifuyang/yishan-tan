import { z } from "zod";

import { sortOrderSchema } from "~/lib/list-sort";

export const loginLogStatusSchema = z.enum(["success", "failed"]);

export const listLoginLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  status: loginLogStatusSchema.optional(),
  /** IP 地址模糊匹配（服务端筛选，作用于全部数据而非当前页）。 */
  ipAddress: z.string().trim().optional(),
  /** User Agent 模糊匹配（服务端筛选，作用于全部数据而非当前页）。 */
  userAgent: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
  /** 可排序列（白名单，服务端按此映射到数据库列）；缺省按登录时间倒序。 */
  sortBy: z.enum(["createdAt", "username", "status"]).optional(),
  /** 排序方向；缺省倒序。 */
  sortOrder: sortOrderSchema.optional(),
});

export type ListLoginLogsQuery = z.infer<typeof listLoginLogsSchema>;
export type LoginLogSortBy = NonNullable<ListLoginLogsQuery["sortBy"]>;
