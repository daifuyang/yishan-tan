#!/usr/bin/env node
/**
 * npm run gen:resource -- <domain>
 *
 * 生成一个业务域的标准骨架：
 *   schema / types / service / policy / actions / rest route
 *
 * 约定：
 *   - 所有文件以 `<domain>.` 为前缀
 *   - service / action 函数命名遵循资源动作：createXxx / updateXxx / deleteXxx / getXxx
 *   - 默认只生成 `create` 骨架，其他动作按需补
 *   - 只新增文件，不覆盖已有同名文件
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const domain = process.argv[2];
if (!domain) {
  console.error("usage: npm run gen:resource -- <domain>");
  process.exit(1);
}

const featureDir = path.join(root, "src/features", domain);
const routeFile = path.join(root, "src/routes/api/v1", `${toPlural(domain)}.ts`);
const routeDir = path.dirname(routeFile);
await fs.mkdir(featureDir, { recursive: true });
await fs.mkdir(routeDir, { recursive: true });

const Pascal = toPascal(domain);
const files = [
  {
    path: path.join(featureDir, `${domain}.schema.ts`),
    body: `import { z } from 'zod'

export const create${Pascal}Schema = z.object({
  name: z.string().min(1).max(50),
})

export const ${Pascal}Schema = create${Pascal}Schema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
})

export type Create${Pascal}Input = z.infer<typeof create${Pascal}Schema>
export type ${Pascal} = z.infer<typeof ${Pascal}Schema>
`,
  },
  {
    path: path.join(featureDir, `${domain}.types.ts`),
    body: `import type { ${Pascal} } from './${domain}.schema'

export type ${Pascal}Dto = ${Pascal}
`,
  },
  {
    path: path.join(featureDir, `${domain}.service.ts`),
    body: `import { and, eq, isNull } from 'drizzle-orm'
import * as schema from '~/../db/schema'
import { getDb } from '~/lib/db.server'
import { Errors } from '~/lib/errors'
import type { ServiceContext } from '~/lib/service-context'
import { assertCanCreate${Pascal} } from './${domain}.policy'
import type { ${Pascal}, Create${Pascal}Input } from './${domain}.schema'

export async function create${Pascal}Service(
  ctx: ServiceContext,
  input: Create${Pascal}Input,
): Promise<${Pascal}> {
  await assertCanCreate${Pascal}(ctx)
  // TODO: 字段清洗、数据库写入、审计与缓存失效
  return {
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  }
}

export async function list${Pascal}sService(ctx: ServiceContext): Promise<${Pascal}[]> {
  // TODO: 列表查询 + 分页 + 数据权限过滤
  void ctx
  const rows = await getDb()
    .select()
    .from((schema as any).${domain})
    .where(isNull((schema as any).${domain}.deletedAt))
  return rows as unknown as ${Pascal}[]
}
`,
  },
  {
    path: path.join(featureDir, `${domain}.policy.ts`),
    body: `import type { ServiceContext } from '~/lib/service-context'

export async function assertCanCreate${Pascal}(ctx: ServiceContext): Promise<void> {
  // TODO: 角色 / 部门 / 数据范围
  void ctx
}
`,
  },
  {
    path: path.join(featureDir, `${domain}.actions.ts`),
    body: `import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { requireRequestContext } from '~/server/request-context'
import { create${Pascal}Schema } from './${domain}.schema'
import { create${Pascal}Service, list${Pascal}sService } from './${domain}.service'

export const create${Pascal} = createServerFn({ method: 'POST' })
  .validator(create${Pascal}Schema)
  .handler(async ({ data }) =>
    create${Pascal}Service(await requireRequestContext(getRequestHeaders()), data),
  )

export const list${Pascal}s = createServerFn({ method: 'GET' }).handler(async () =>
  list${Pascal}sService(await requireRequestContext(getRequestHeaders())),
)
`,
  },
  {
    path: routeFile,
    body: `import { createFileRoute } from '@tanstack/react-router'
import { create${Pascal}Service, list${Pascal}sService } from '~/features/${domain}/${domain}.service'
import { create${Pascal}Schema } from '~/features/${domain}/${domain}.schema'
import { handleApiError, json, parseJson } from '~/server/http'
import { requireRequestContext } from '~/server/request-context'

export const Route = createFileRoute('/api/v1/${toPlural(domain)}')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request)
          const items = await list${Pascal}sService(ctx)
          return json({ items })
        } catch (error) {
          return handleApiError(error)
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await parseJson(request)) ?? {}
          const input = create${Pascal}Schema.parse(body)
          const result = await create${Pascal}Service(
            await requireRequestContext(request),
            input,
          )
          return json(result, { status: 201 })
        } catch (error) {
          return handleApiError(error)
        }
      },
    },
  },
})
`,
  },
];

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function toPascal(name: string) {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((s: string) => (s[0] ? s[0].toUpperCase() + s.slice(1) : ""))
    .join("");
}

function toPlural(name: string) {
  if (/y$/.test(name)) return `${name.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(name)) return `${name}es`;
  return `${name}s`;
}

for (const file of files) {
  try {
    await fs.stat(file.path);
    console.warn(`[gen-resource] exists, skipped: ${path.relative(root, file.path)}`);
  } catch {
    await fs.writeFile(file.path, file.body, "utf8");
    console.log(`[gen-resource] created ${path.relative(root, file.path)}`);
  }
}

console.log(`[gen-resource] done: ${domain}`);
