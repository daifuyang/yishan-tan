import { parseArgs } from "node:util";
import { and, eq, isNull } from "drizzle-orm";

import { createUserService } from "../src/features/auth/auth.service";
import { getDb } from "../src/lib/db.server";
import { isServerError } from "../src/lib/errors";
import * as schema from "./schema";

const {
  department,
  dictData,
  dictType,
  menu,
  portal,
  post,
  role,
  roleMenu,
  storage,
  systemOption,
  user,
  userRole,
} = schema;

type CliValues = {
  email: string;
  username: string;
  password: string;
  displayName: string;
};

function parseCli(argv: readonly string[]): CliValues {
  const { values } = parseArgs({
    args: argv,
    options: {
      email: { type: "string", default: "admin@example.com" },
      username: { type: "string", default: "admin" },
      password: { type: "string", default: "admin123" },
      "display-name": { type: "string", default: "系统管理员" },
    },
    strict: true,
    allowPositionals: false,
  });

  const email = values.email;
  const username = values.username;
  const password = values.password;
  const displayName = values["display-name"];

  if (!email) throw new Error("--email 不能为空");
  if (!username) throw new Error("--username 不能为空");
  if (!password) throw new Error("--password 不能为空");
  if (!displayName) throw new Error("--display-name 不能为空");

  return { email, username, password, displayName };
}

async function findUserByUsername(username: string) {
  return getDb()
    .select({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
}

async function promoteToAdmin(userId: string): Promise<"admin" | "member"> {
  const updated = await getDb()
    .update(user)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ role: user.role });
  return updated[0]?.role ?? "member";
}

function printSuccessBanner(input: CliValues, role: string, userId: string) {
  console.log("");
  console.log("✔ 管理员账号已就绪");
  console.log("─────────────────────────────────────");
  console.log(`  用户 ID : ${userId}`);
  console.log(`  用户名  : ${input.username}`);
  console.log(`  邮箱    : ${input.email}`);
  console.log(`  显示名  : ${input.displayName}`);
  console.log(`  角色    : ${role}`);
  console.log(`  登录    : 账号(${input.username}) 或 邮箱(${input.email})`);
  console.log("─────────────────────────────────────");
  console.log(`  密码    : ${input.password}`);
  console.log("");
  console.log("提示：如需让该用户通过 requireAdmin 鉴权，");
  console.log(`      请将 ${userId} 加入环境变量 SYSTEM_ADMIN_IDS。`);
}

function printAuthorizationBanner(roleId: string, menuCount: number) {
  console.log("✔ 后台授权链路已就绪");
  console.log("─────────────────────────────────────");
  console.log(`  admin role id : ${roleId}`);
  console.log(`  菜单数量      : ${menuCount}`);
  console.log("─────────────────────────────────────");
  console.log("");
}

/**
 * 菜单 seed 描述：name 作为语义唯一键，按 parent 关系两层插入。
 *
 * 对齐原 yishan-api（apps/yishan-api/src/scripts/seed/config.ts:201），
 * 去除应用管理 / 插件管理 / 应用详情；保留 tan 的「工作台」顶层。
 *
 * 与 src/routes/admin/*.tsx 对应关系：
 *   - 工作台              → /admin                  [tan 顶层，无 yishan 对应]
 *   - 用户管理            → /admin/users
 *   - 角色管理            → /admin/roles
 *   - 部门管理            → /admin/departments
 *   - 岗位管理            → /admin/posts            [占位，feature 未建]
 *   - 菜单管理            → /admin/menus
 *   - 字典管理            → /admin/dicts
 *   - 站点配置            → /admin/settings         [合并自原「系统设置」]
 *   - 云存储              → /admin/storages         [占位，feature 未建]
 *   - 媒体库              → /admin/attachments      [占位，feature 未建]
 *   - 登录日志            → /admin/login-logs       [占位，feature 未建]
 *
 * icon 字段是 lucide-react PascalCase 字符串，由前端 MENU_ICON_MAP 解析。
 */
type MenuSeedItem = {
  code: string;
  name: string;
  parentCode: string | null;
  path: string | null;
  icon: string;
  type: "group" | "menu" | "action";
  sort: number;
};

const MENU_SEED: readonly MenuSeedItem[] = [
  {
    code: "dashboard",
    name: "工作台",
    parentCode: null,
    path: "/admin",
    icon: "Home",
    type: "menu",
    sort: 0,
  },
  {
    code: "system",
    name: "系统管理",
    parentCode: null,
    path: null,
    icon: "Folder",
    type: "group",
    sort: 1,
  },
  {
    code: "users",
    name: "用户管理",
    parentCode: "system",
    path: "/admin/users",
    icon: "Users",
    type: "menu",
    sort: 0,
  },
  {
    code: "roles",
    name: "角色管理",
    parentCode: "system",
    path: "/admin/roles",
    icon: "ShieldCheck",
    type: "menu",
    sort: 1,
  },
  {
    code: "departments",
    name: "部门管理",
    parentCode: "system",
    path: "/admin/departments",
    icon: "Building2",
    type: "menu",
    sort: 2,
  },
  {
    code: "posts",
    name: "岗位管理",
    parentCode: "system",
    path: "/admin/posts",
    icon: "Briefcase",
    type: "menu",
    sort: 3,
  },
  {
    code: "menus",
    name: "菜单管理",
    parentCode: "system",
    path: "/admin/menus",
    icon: "ListTree",
    type: "menu",
    sort: 4,
  },
  {
    code: "dicts",
    name: "字典管理",
    parentCode: "system",
    path: "/admin/dicts",
    icon: "BookType",
    type: "menu",
    sort: 5,
  },
  {
    code: "settings",
    name: "站点配置",
    parentCode: "system",
    path: "/admin/settings",
    icon: "Settings",
    type: "menu",
    sort: 6,
  },
  {
    code: "storages",
    name: "云存储",
    parentCode: "system",
    path: "/admin/storages",
    icon: "Cloud",
    type: "menu",
    sort: 7,
  },
  {
    code: "attachments",
    name: "媒体库",
    parentCode: "system",
    path: "/admin/attachments",
    icon: "Image",
    type: "menu",
    sort: 8,
  },
  {
    code: "login-logs",
    name: "登录日志",
    parentCode: "system",
    path: "/admin/login-logs",
    icon: "ScrollText",
    type: "menu",
    sort: 9,
  },
  {
    code: "portal",
    name: "门户管理",
    parentCode: null,
    path: null,
    icon: "AppWindow",
    type: "group",
    sort: 2,
  },
  {
    code: "portals",
    name: "门户配置",
    parentCode: "portal",
    path: "/admin/portals",
    icon: "LayoutTemplate",
    type: "menu",
    sort: 0,
  },
];

async function ensureMenuItem(item: MenuSeedItem, parentId: string | null): Promise<string> {
  const db = getDb();
  const nameMatch = eq(menu.name, item.name);
  const parentMatch = parentId === null ? isNull(menu.parentId) : eq(menu.parentId, parentId);
  const existing = await db
    .select({ id: menu.id, icon: menu.icon })
    .from(menu)
    .where(and(nameMatch, parentMatch))
    .limit(1);
  if (existing[0]) {
    // 已存在行：若 icon 与 seed 不一致则就地更新（idempotent 升级）
    if (existing[0].icon !== item.icon) {
      await db
        .update(menu)
        .set({ icon: item.icon, sort: item.sort })
        .where(eq(menu.id, existing[0].id));
    }
    return existing[0].id;
  }

  const inserted = await db
    .insert(menu)
    .values({
      parentId,
      name: item.name,
      path: item.path,
      component: null,
      icon: item.icon,
      type: item.type,
      permission: null,
      sort: item.sort,
      status: "enabled",
    })
    .returning({ id: menu.id });
  if (!inserted[0]) throw new Error(`菜单 seed 失败：${item.name}`);
  return inserted[0].id;
}

async function seedMenus(): Promise<string[]> {
  const idByCode = new Map<string, string>();
  // 先处理 parentCode === null（顶层），再处理子层。
  for (const item of MENU_SEED.filter((i) => i.parentCode === null)) {
    const id = await ensureMenuItem(item, null);
    idByCode.set(item.code, id);
  }
  for (const item of MENU_SEED.filter((i) => i.parentCode !== null)) {
    const parentId = idByCode.get(item.parentCode ?? "");
    if (!parentId) throw new Error(`父菜单缺失：${item.parentCode}`);
    const id = await ensureMenuItem(item, parentId);
    idByCode.set(item.code, id);
  }
  return Array.from(idByCode.values());
}

async function ensureAdminRole(): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ id: role.id })
    .from(role)
    .where(eq(role.name, "系统管理员"))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const inserted = await db
    .insert(role)
    .values({
      name: "系统管理员",
      description: "seed 默认管理员角色，拥有全部菜单权限",
      status: "enabled",
      isSystemDefault: true,
    })
    .returning({ id: role.id });
  if (!inserted[0]) throw new Error("admin role 创建失败");
  return inserted[0].id;
}

async function bindRoleToAllMenus(roleId: string, menuIds: readonly string[]) {
  const db = getDb();
  await db.delete(roleMenu).where(eq(roleMenu.roleId, roleId));
  if (menuIds.length === 0) return;
  await db.insert(roleMenu).values(menuIds.map((menuId) => ({ roleId, menuId })));
}

async function bindUserToAdminRole(userId: string, roleId: string) {
  const db = getDb();
  await db.delete(userRole).where(eq(userRole.userId, userId));
  await db.insert(userRole).values({ userId, roleId });
}

async function ensureDefaultLocalStorage(): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ id: storage.id })
    .from(storage)
    .where(and(eq(storage.driver, "local"), eq(storage.isDefault, true), isNull(storage.deletedAt)))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(storage)
    .values({
      name: "本地存储",
      driver: "local",
      isDefault: true,
      config: JSON.stringify({ dir: "public/uploads" }),
      description: "seed 默认本地存储，写入 public/uploads/，对外通过 /uploads/<key> 访问",
      status: "enabled",
    })
    .returning({ id: storage.id });
  if (!inserted[0]) throw new Error("default storage 插入失败");
  return inserted[0].id;
}

async function ensureDefaultPortal(): Promise<string> {
  const db = getDb();
  const existing = await db
    .select({ id: portal.id })
    .from(portal)
    .where(and(eq(portal.code, "main"), isNull(portal.deletedAt)))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(portal)
    .values({
      name: "主门户",
      code: "main",
      domain: "yishan.com",
      themePrimary: "#1677ff",
      themeMode: "light",
      isDefault: true,
      status: "enabled",
      description: "seed 默认主门户",
    })
    .returning({ id: portal.id });
  if (!inserted[0]) throw new Error("default portal 插入失败");
  return inserted[0].id;
}

async function ensureDepartments(
  items: Array<{
    code: string;
    name: string;
    parentCode: string | null;
    sort: number;
    description?: string;
  }>,
): Promise<Map<string, string>> {
  const db = getDb();
  const idByCode = new Map<string, string>();
  // 先顶层，再子层
  for (const item of items.filter((i) => i.parentCode === null)) {
    const existing = await db
      .select({ id: department.id })
      .from(department)
      .where(eq(department.code, item.code))
      .limit(1);
    if (existing[0]) {
      idByCode.set(item.code, existing[0].id);
      continue;
    }
    const inserted = await db
      .insert(department)
      .values({
        name: item.name,
        code: item.code,
        parentId: null,
        sort: item.sort,
        status: "enabled",
      })
      .returning({ id: department.id });
    if (!inserted[0]) throw new Error(`部门 seed 失败：${item.name}`);
    idByCode.set(item.code, inserted[0].id);
  }
  for (const item of items.filter((i) => i.parentCode !== null)) {
    const parentId = idByCode.get(item.parentCode ?? "");
    if (!parentId) throw new Error(`父部门缺失：${item.parentCode}`);
    const existing = await db
      .select({ id: department.id })
      .from(department)
      .where(eq(department.code, item.code))
      .limit(1);
    if (existing[0]) {
      idByCode.set(item.code, existing[0].id);
      continue;
    }
    const inserted = await db
      .insert(department)
      .values({
        name: item.name,
        code: item.code,
        parentId,
        sort: item.sort,
        status: "enabled",
      })
      .returning({ id: department.id });
    if (!inserted[0]) throw new Error(`部门 seed 失败：${item.name}`);
    idByCode.set(item.code, inserted[0].id);
  }
  return idByCode;
}

async function ensurePosts(
  items: Array<{
    code: string;
    name: string;
    departmentCode: string;
    sort: number;
    description?: string;
  }>,
  deptIdByCode: Map<string, string>,
): Promise<Map<string, string>> {
  const db = getDb();
  const idByCode = new Map<string, string>();
  for (const item of items) {
    const deptId = deptIdByCode.get(item.departmentCode);
    if (!deptId) throw new Error(`岗位依赖部门缺失：${item.departmentCode}`);
    // post 表没有 code 列，按 (name, departmentId) 唯一判存
    const existing = await db
      .select({ id: post.id })
      .from(post)
      .where(and(eq(post.name, item.name), eq(post.departmentId, deptId)))
      .limit(1);
    if (existing[0]) {
      idByCode.set(item.code, existing[0].id);
      continue;
    }
    const inserted = await db
      .insert(post)
      .values({
        name: item.name,
        departmentId: deptId,
        sort: item.sort,
        status: "enabled",
      })
      .returning({ id: post.id });
    if (!inserted[0]) throw new Error(`岗位 seed 失败：${item.name}`);
    idByCode.set(item.code, inserted[0].id);
  }
  return idByCode;
}

async function ensureAuxRoles(
  items: Array<{
    name: string;
    description?: string;
  }>,
): Promise<Map<string, string>> {
  const db = getDb();
  const idByName = new Map<string, string>();
  for (const item of items) {
    const existing = await db
      .select({ id: role.id })
      .from(role)
      .where(eq(role.name, item.name))
      .limit(1);
    if (existing[0]) {
      idByName.set(item.name, existing[0].id);
      continue;
    }
    const inserted = await db
      .insert(role)
      .values({
        name: item.name,
        description: item.description ?? null,
        status: "enabled",
      })
      .returning({ id: role.id });
    if (!inserted[0]) throw new Error(`角色 seed 失败：${item.name}`);
    idByName.set(item.name, inserted[0].id);
  }
  return idByName;
}

async function ensureDicts(
  items: Array<{
    typeCode: string;
    typeName: string;
    description?: string;
    data: Array<{ code: string; label: string; value: string; sort: number }>;
  }>,
): Promise<void> {
  const db = getDb();
  for (const t of items) {
    const existingType = await db
      .select({ id: dictType.id })
      .from(dictType)
      .where(eq(dictType.name, t.typeName))
      .limit(1);
    if (!existingType[0]) {
      const ins = await db
        .insert(dictType)
        .values({
          name: t.typeName,
          code: t.typeCode,
          description: t.description ?? null,
          status: "enabled",
        })
        .returning({ id: dictType.id });
      if (!ins[0]) throw new Error(`字典类型 seed 失败：${t.typeName}`);
    }
    for (const d of t.data) {
      const existing = await db
        .select({ id: dictData.id })
        .from(dictData)
        .where(and(eq(dictData.typeCode, t.typeCode), eq(dictData.value, d.value)))
        .limit(1);
      if (existing[0]) continue;
      await db.insert(dictData).values({
        typeCode: t.typeCode,
        label: d.label,
        value: d.value,
        sort: d.sort,
        status: "enabled",
      });
    }
  }
}

async function ensureSystemOptions(
  items: Array<{
    key: string;
    value: unknown;
    description?: string;
  }>,
): Promise<void> {
  const db = getDb();
  for (const opt of items) {
    const existing = await db
      .select({ id: systemOption.id })
      .from(systemOption)
      .where(eq(systemOption.key, opt.key))
      .limit(1);
    if (existing[0]) {
      await db
        .update(systemOption)
        .set({ value: JSON.stringify(opt.value), description: opt.description ?? null })
        .where(eq(systemOption.id, existing[0].id));
      continue;
    }
    await db.insert(systemOption).values({
      key: opt.key,
      value: JSON.stringify(opt.value),
      description: opt.description ?? null,
    });
  }
}

/**
 * 老系统（移山后台）启动默认数据：组织 / 岗位 / 业务角色 / 字典 / 系统配置。
 * 与 ensureAdminRole / ensureDefaultLocalStorage / ensureDefaultPortal 一起
 * 由 seedAuthorization 串起来。所有写入均为 idempotent，重跑不重复 insert。
 */
const DEPARTMENTS_SEED = [
  { code: "hq", name: "移山总部", parentCode: null, sort: 0 },
  { code: "tech", name: "技术中心", parentCode: "hq", sort: 0 },
  { code: "biz", name: "业务中心", parentCode: "hq", sort: 1 },
  { code: "admin_c", name: "行政中心", parentCode: "hq", sort: 2 },
  { code: "fe", name: "前端组", parentCode: "tech", sort: 0 },
  { code: "be", name: "后端组", parentCode: "tech", sort: 1 },
  { code: "qa", name: "测试组", parentCode: "tech", sort: 2 },
  { code: "ops", name: "运维组", parentCode: "tech", sort: 3 },
  { code: "pd", name: "产品组", parentCode: "biz", sort: 0 },
  { code: "sales", name: "销售组", parentCode: "biz", sort: 1 },
  { code: "hr", name: "人事组", parentCode: "admin_c", sort: 0 },
  { code: "fin", name: "财务组", parentCode: "admin_c", sort: 1 },
];

const POSTS_SEED = [
  { code: "ceo", name: "CEO", departmentCode: "hq", sort: 0 },
  { code: "cto", name: "CTO", departmentCode: "tech", sort: 0 },
  { code: "fe_eng", name: "前端工程师", departmentCode: "fe", sort: 0 },
  { code: "be_eng", name: "后端工程师", departmentCode: "be", sort: 0 },
  { code: "qa_eng", name: "测试工程师", departmentCode: "qa", sort: 0 },
  { code: "ops_eng", name: "运维工程师", departmentCode: "ops", sort: 0 },
  { code: "pm", name: "产品经理", departmentCode: "pd", sort: 0 },
];

const AUX_ROLES_SEED = [
  { name: "部门管理员", description: "可管理部门范围内的用户与角色" },
  { name: "普通成员", description: "无后台管理权限的默认业务角色" },
  { name: "审计员", description: "只读审计权限：登录日志、操作日志、报表" },
];

const DICTS_SEED = [
  {
    typeCode: "user_status",
    typeName: "用户状态",
    description: "用户启停状态枚举，与 user.status 字段保持一致",
    data: [
      { code: "enabled", label: "启用", value: "enabled", sort: 0 },
      { code: "disabled", label: "已禁用", value: "disabled", sort: 1 },
    ],
  },
  {
    typeCode: "sys_yes_no",
    typeName: "系统是否",
    description: "通用布尔字典",
    data: [
      { code: "yes", label: "是", value: "yes", sort: 0 },
      { code: "no", label: "否", value: "no", sort: 1 },
    ],
  },
  {
    typeCode: "user_gender",
    typeName: "用户性别",
    description: "性别枚举",
    data: [
      { code: "male", label: "男", value: "male", sort: 0 },
      { code: "female", label: "女", value: "female", sort: 1 },
      { code: "unknown", label: "未填", value: "unknown", sort: 2 },
    ],
  },
];

const SYSTEM_OPTIONS_SEED = [
  {
    key: "site.name",
    value: "移山后台管理系统",
    description: "站点名称（浏览器标题、登录页 logo 旁文字）",
  },
  { key: "site.logo", value: "", description: "站点 Logo URL（PNG/SVG）" },
  { key: "site.copyright", value: "© yishan", description: "页脚版权文字" },
  { key: "auth.login.maxRetries", value: 5, description: "登录失败最大次数（超过后账号临时锁定）" },
  { key: "auth.login.rateLimitPerMin", value: 10, description: "单 IP 每分钟登录请求上限" },
  { key: "auth.session.timeout", value: 7, description: "会话有效期（天）" },
  { key: "upload.maxSizeMb", value: 20, description: "上传文件最大尺寸（MB）" },
  {
    key: "upload.allowedTypes",
    value: ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx"],
    description: "允许上传的文件扩展名",
  },
];

async function seedBusinessData() {
  const deptIdByCode = await ensureDepartments(DEPARTMENTS_SEED);
  const postIdByCode = await ensurePosts(POSTS_SEED, deptIdByCode);
  const auxRoleIdByName = await ensureAuxRoles(AUX_ROLES_SEED);
  await ensureDicts(DICTS_SEED);
  await ensureSystemOptions(SYSTEM_OPTIONS_SEED);
  console.log(
    `✔ 部门 (${DEPARTMENTS_SEED.length} 项) / 岗位 (${POSTS_SEED.length} 项) / 业务角色 (${AUX_ROLES_SEED.length + 1} 个含 admin) / 字典 (${DICTS_SEED.length} 类型) / 系统选项 (${SYSTEM_OPTIONS_SEED.length} 项) seed 完成`,
  );
  return { deptIdByCode, postIdByCode, auxRoleIdByName };
}

async function seedAuthorization(adminUserId: string) {
  const db = getDb();
  const roleId = await ensureAdminRole();
  const menuIds = await seedMenus();
  await bindRoleToAllMenus(roleId, menuIds);
  await bindUserToAdminRole(adminUserId, roleId);
  const defaultStorageId = await ensureDefaultLocalStorage();
  const defaultPortalId = await ensureDefaultPortal();
  const { postIdByCode, auxRoleIdByName } = await seedBusinessData();
  // 把 admin 绑定到 CEO 岗位（多角色并行能工作）
  const adminPostId = postIdByCode.get("ceo");
  if (adminPostId) {
    await db
      .insert(schema.userPost)
      .values({ userId: adminUserId, postId: adminPostId })
      .onConflictDoNothing();
  }
  // 给 admin 也绑上一个业务角色（部门管理员），证明 RBAC 多角色并行能工作
  const auxRoleId = auxRoleIdByName.get("部门管理员");
  if (auxRoleId) {
    await db
      .insert(userRole)
      .values({ userId: adminUserId, roleId: auxRoleId })
      .onConflictDoNothing();
  }
  printAuthorizationBanner(roleId, menuIds.length);
  console.log(`✔ default storage id : ${defaultStorageId}`);
  console.log(`✔ default portal id  : ${defaultPortalId}`);
}

async function main(): Promise<void> {
  const input = parseCli(process.argv.slice(2));

  if (input.password.length < 8) {
    throw new Error("密码至少需要 8 位字符");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error(`邮箱格式不合法：${input.email}`);
  }
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(input.username)) {
    throw new Error("用户名需为 3-30 位字母、数字、下划线或短横线");
  }

  const existingRows = await findUserByUsername(input.username);
  if (existingRows[0]) {
    const existing = existingRows[0];
    const finalRole = existing.role === "admin" ? existing.role : await promoteToAdmin(existing.id);
    console.log(`⚠ 用户名「${input.username}」已存在，复用现有账号（id=${existing.id}）`);
    printSuccessBanner(input, finalRole, existing.id);
    await seedAuthorization(existing.id);
    return;
  }

  try {
    const headers = new Headers();
    const created = await createUserService(
      {
        email: input.email,
        password: input.password,
        username: input.username,
        displayName: input.displayName,
      },
      headers,
    );
    const role = await promoteToAdmin(created.id);
    printSuccessBanner(input, role, created.id);
    await seedAuthorization(created.id);
  } catch (err) {
    if (isServerError(err) && err.code === "CONFLICT") {
      console.error(`✘ 用户名或邮箱已被占用：${err.message}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error("✘ seed 失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});
