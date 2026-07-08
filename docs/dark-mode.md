# 暗黑模式实施备忘(Dark Mode Memo)

> 实施宪章 [`DESIGN_CHARTER.md §11`](./DESIGN_CHARTER.md) 暗黑模式章节。
> **决策(2026-07)**:采用 **选项 B** — 用户偏好切换,默认跟随系统 `prefers-color-scheme`。
> 预留选项 A(自动跟随,无用户开关)/ 选项 C(管理员强制)为 P3。

---

## 1. 触发机制

| 项 | 实现 |
|---|---|
| 触发类 | `.dark` 挂 `<html>` 根节点(已配置,见 `src/styles/globals.css` `@custom-variant dark`) |
| 默认值 | 首次访问读取 `window.matchMedia("(prefers-color-scheme: dark)").matches`;为真则挂 `.dark`,否则不挂 |
| 切换入口 | 顶部 `AdminHeader` 右侧,加 icon 按钮(月亮 / 太阳,lucide-react) |
| 持久化 | `localStorage.setItem("theme", "dark" \| "light" \| "system")` |
| SSR 一致性 | SSR 阶段读 cookie `theme` 或 localStorage(防闪烁,详见 §3) |

## 2. 三状态机

```text
system  (默认)  → 跟随 prefers-color-scheme;用户未表态
light            → 强制浅色
dark             → 强制暗色
```

- 切换按钮点击循环:`system → light → dark → system`
- 仅 `light` / `dark` 持久化到 localStorage;`system` 不持久化(等同"未表态")
- 设置面板(P3)可显示当前实际生效模式 + 三选项 radio

## 3. 防闪烁策略

| 阶段 | 处理 |
|---|---|
| HTML 解析前 | 内联 `<script>` 读 localStorage,提前挂 `.dark` 类(防白闪) |
| React 启动 | `useTheme()` hook 读 localStorage / 系统偏好,与 SSR 状态合并 |
| 用户切换 | 立刻写 localStorage + 挂/摘 `.dark` 类,无网络请求 |

## 4. 设计原则(对齐宪章 §11.3)

- **内容舒适性**:避免强对比;暗色下 `#000` 不允许出现(用 `--color-bg-elevated` 替代)
- **信息一致性**:暗色模式与浅色模式层级一致(同样 5 层阴影、6 档字阶),**仅色板变化**,不引入新尺寸 / 间距

## 5. 现有 token 映射

宪章 §11.2 要求"完整 `dark:` 前缀映射";`src/styles/globals.css` 当前已为 `brand-*` / `text-*` / `bg-*` 配 `.dark` 块。本备忘跟进项:

| token | 浅色 | 暗色(待补) |
|---|---|---|
| `--color-bg` | `#ffffff` | `#0a0a0a` |
| `--color-bg-elevated` | `#fafafa` | `#171717` |
| `--color-border` | `--color-line` | `#262626` |
| `--color-text` | `--color-text-strong` | `#fafafa` |
| `--color-text-soft` | `--color-text-soft` | `#a3a3a3` |
| `--color-success-500` | `#52c41a` | `#73d13d` |
| `--color-warning-500` | `#fa8c16` | `#ffa940` |
| `--color-danger-500` | `#cf1322` | `#ff4d4f` |

> 暗色色板借鉴 antd 暗色算法,但锚点用项目自有 `#3b82f6`(宪章 §11.2),不引入 antd-style。

## 6. 落地任务(分阶段)

| 阶段 | 任务 | 预计 |
|---|---|---|
| Phase 1(本轮) | 完成 §3.1 / §3.2 / §3.4 / §3.5 的 token 补全,**不实施切换 UI** | 已完成 |
| Phase 2 第 6 条 | `src/lib/copy.ts` 加 dark mode 文案("切换暗黑模式" 等) | 1 天 |
| Phase 3 第 4 条 | 实施切换 UI:`AdminHeader` 加按钮 + `useTheme()` hook + 防闪烁脚本 | 3 天 |
| P3 | 选项 A(自动 / 无开关)/ 选项 C(管理员强制) | 待规划 |

## 7. 引用

- 宪章 [`DESIGN_CHARTER.md §11`](./DESIGN_CHARTER.md) — 暗黑模式章节
- 宪章 §11.1 — 触发决策(B 选项)
- 宪章 §11.2 — 暗色 token 映射
- 宪章 §11.3 — 设计原则
- `src/styles/globals.css` `@custom-variant dark` — 已配置
- `src/components/admin/layout/admin-header.tsx` — 切换 UI 入口(P3 落地)