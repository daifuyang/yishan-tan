/**
 * 文案集中点(宪章 Phase 2 第 6 条)
 *
 * 宪章 §3.3 占位文案(企业 中台惯例,项目默认):
 *   - Input / Textarea → "请输入"
 *   - Format-sensitive (email/phone/apiKey) → "example@email.com" / "138 0000 0000" / "sk-xxxxxx"
 *   - Select → "请选择"
 *   - MultiSelect → "请选择(可多选)"
 *   - Search → "搜索 XXX"
 *   - DatePicker → "请选择日期"
 *
 * AntD 风格 `如:XXX` 仅在"具体示例能显著降低用户理解成本"时使用,
 * 需 PR 描述引用 §3.3。
 *
 * 宪章 §3.5 错误文案:走 Errors.* 工厂,UI 错误用 useToast()/EmptyState。
 * 宪章 §13.15:按钮文案用动作动词,不用"确定 / 取消"。
 */

/** 占位文案集合(企业 中台惯例)。 */
export const placeholders = {
  /** 主体输入控件 */
  input: "请输入",
  /** Select 单选 */
  select: "请选择",
  /** MultiSelect 多选 */
  multiSelect: "请选择(可多选)",
  /** 格式敏感字段(无前缀格式示例) */
  format: {
    email: "example@email.com",
    phone: "138 0000 0000",
    apiKey: "sk-xxxxxx",
    isoDate: "2026-07-06",
    password: "••••••",
  },
  /** 搜索语义引导 */
  search: {
    common: "搜索关键词",
    user: "搜索用户",
    role: "搜索角色",
    attachment: "搜索附件名",
    storage: "搜索存储名",
  },
  /** DatePicker / RangePicker */
  date: {
    pick: "请选择日期",
    range: "请选择区间",
  },
} as const;

/** 按钮文案(宪章 §3.2 / §13.15):用动作动词,不用"确定 / 取消"。 */
export const buttonCopy = {
  save: "保存",
  publish: "发布",
  delete: "删除",
  cancel: "取消",
  confirm: "确认",
  create: "新建",
  update: "更新",
  reset: "重置",
  search: "搜索",
  export: "导出",
  import: "导入",
  upload: "上传",
  refresh: "刷新",
} as const;
