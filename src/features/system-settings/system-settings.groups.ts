/**
 * 系统配置分组与字段定义（纯前端配置，不入库）。
 *
 * 后端 sys_option 是通用 K-V 表，由前端按业务聚合为分组，每组单独保存。
 * 新增字段时同步加 schema.test.ts 里的取值/类型覆盖即可。
 */
export type SystemOptionFieldType = "text" | "number" | "switch" | "select" | "textarea";

export type SystemOptionDef = {
  key: string;
  label: string;
  type: SystemOptionFieldType;
  description?: string;
  /**
   * select 类型时，从字典（dictType.code）拉取可选项 value/label；
   * 其余类型可忽略。
   */
  dictCode?: string;
  /** 数字/文本框的占位符，便于在 UI 中给输入样例。 */
  placeholder?: string;
};

export type SystemOptionGroup = {
  code: string;
  name: string;
  description?: string;
  options: SystemOptionDef[];
};

export const SYSTEM_OPTION_GROUPS: readonly SystemOptionGroup[] = [
  {
    code: "site",
    name: "站点信息",
    description: "展示在前端与登录页的基础信息、SEO 与备案信息。",
    options: [
      {
        key: "site.name",
        label: "站点名称",
        type: "text",
        description: "显示在浏览器标题与登录页。",
        placeholder: "如:AI 数据分析平台",
      },
      {
        key: "site.domain",
        label: "站点域名",
        type: "text",
        description: "对外可访问的站点主域名。",
        placeholder: "https://example.com",
      },
      {
        key: "site.title",
        label: "站点标题",
        type: "text",
        description: "用于浏览器标题与 SEO Title。",
        placeholder: "移山后台 - 企业级管理平台",
      },
      {
        key: "site.logo",
        label: "LOGO 地址",
        type: "text",
        description: "PNG / SVG 的可访问 URL，可留空。",
        placeholder: "https://example.com/logo.svg",
      },
      {
        key: "site.favicon",
        label: "Favicon 地址",
        type: "text",
        description: "浏览器标签图标，可留空。",
        placeholder: "https://example.com/favicon.ico",
      },
      {
        key: "site.seoKeywords",
        label: "SEO 关键词",
        type: "textarea",
        description: "多个关键词用英文逗号分隔。",
        placeholder: "后台,管理,数据分析",
      },
      {
        key: "site.seoDescription",
        label: "SEO 描述",
        type: "textarea",
        description: "用于搜索引擎描述。",
        placeholder: "用于搜索引擎描述",
      },
      {
        key: "site.icp",
        label: "ICP 备案号",
        type: "text",
        description: "中国大陆站点展示在页脚。",
        placeholder: "如:沪ICP备xxxxxx号",
      },
      {
        key: "site.publicSecurityIcp",
        label: "公安备案号",
        type: "text",
        description: "中国大陆站点展示在页脚。",
        placeholder: "如:沪公网安备 xxxxxxxxxxxxx 号",
      },
      {
        key: "site.contactEmail",
        label: "联系邮箱",
        type: "text",
        description: "用于站点页脚或联系我们。",
        placeholder: "contact@example.com",
      },
      {
        key: "site.contactPhone",
        label: "联系电话",
        type: "text",
        description: "用于站点页脚或联系我们。",
        placeholder: "400-xxx-xxxx",
      },
      {
        key: "site.contactAddress",
        label: "联系地址",
        type: "text",
        description: "用于站点页脚或联系我们。",
        placeholder: "上海市浦东新区...",
      },
      {
        key: "site.footerHtml",
        label: "页脚内容",
        type: "textarea",
        description: "支持 HTML（可用于版权信息、备案链接等）。",
        placeholder: "© 2026 Yishan · 沪ICP备...",
      },
    ],
  },
  {
    code: "auth",
    name: "登录策略",
    description: "账号登录相关的安全策略。",
    options: [
      {
        key: "auth.login.maxRetries",
        label: "登录失败最大次数",
        type: "number",
        description: "达到上限后锁定账号一段时间。",
        placeholder: "5",
      },
      {
        key: "auth.login.lockMinutes",
        label: "锁定时长（分钟）",
        type: "number",
        description: "超过失败次数后，账号被锁定的时长。",
        placeholder: "30",
      },
      {
        key: "auth.login.enableCaptcha",
        label: "启用图形验证码",
        type: "switch",
        description: "开启后登录页将显示图形验证码。",
      },
      {
        key: "auth.password.minLength",
        label: "密码最小长度",
        type: "number",
        description: "注册/重置密码时的最小字符数。",
        placeholder: "8",
      },
    ],
  },
  {
    code: "upload",
    name: "上传限制",
    description: "管理端文件上传相关限制。",
    options: [
      {
        key: "upload.maxSizeMb",
        label: "单文件最大尺寸（MB）",
        type: "number",
        description: "超出限制的文件将被拒绝上传。",
        placeholder: "20",
      },
      {
        key: "upload.allowedTypes",
        label: "允许的文件类型",
        type: "text",
        description: "MIME / 扩展名逗号分隔，留空表示不限。",
        placeholder: "image/png,image/jpeg,application/pdf",
      },
      {
        key: "upload.driver",
        label: "默认存储驱动",
        type: "select",
        dictCode: "storage_driver",
        description: "新上传文件的默认存储后端。",
      },
    ],
  },
  {
    code: "ui",
    name: "界面偏好",
    description: "管理后台的展示偏好。",
    options: [
      {
        key: "ui.theme",
        label: "默认主题",
        type: "select",
        dictCode: "ui_theme",
        description: "新用户首次进入时使用的主题。",
      },
      {
        key: "ui.showBreadcrumb",
        label: "显示面包屑",
        type: "switch",
        description: "关闭后页面顶部不再展示面包屑。",
      },
      {
        key: "ui.density",
        label: "表格密度",
        type: "select",
        dictCode: "ui_density",
        description: "管理后台表格的默认行高。",
      },
    ],
  },
];

export function findSystemOptionGroup(code: string): SystemOptionGroup | undefined {
  return SYSTEM_OPTION_GROUPS.find((g) => g.code === code);
}

/**
 * 序列化任意 UI 字段值为 sys_option.value 字符串。
 * 规则：boolean → "true"/"false"；number → 十进制；其他 → JSON.stringify。
 */
export function serializeOptionValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/**
 * 把 sys_option.value 字符串解析回 UI 字段值。
 * 规则：先尝试 JSON；失败回退为原字符串。空串按空字符串返回。
 */
export function deserializeOptionValue(raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined || raw === "") return "";
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}
