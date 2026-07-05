import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookText,
  Braces,
  FileClock,
  History,
  LayoutGrid,
  ListChecks,
  PlugZap,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UserPlus,
  Users,
} from "lucide-react";

import { TechHero } from "@/components/brand/tech-hero";
import { type ActivityItem, ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { CapabilityCard } from "@/components/dashboard/capability-card";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { MetricCard } from "@/components/dashboard/metric-card";
import { QuickActionCard } from "@/components/dashboard/quick-action-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

const METRICS = [
  {
    title: "用户总数",
    value: 128,
    description: "较上周 +12%",
    tag: "上涨",
    icon: Users,
    trend: "up" as const,
  },
  {
    title: "角色数量",
    value: 8,
    description: "权限组已配置",
    tag: "稳定",
    icon: ShieldCheck,
    trend: "neutral" as const,
  },
  {
    title: "菜单资源",
    value: 36,
    description: "支持动态路由",
    tag: "动态",
    icon: LayoutGrid,
    trend: "neutral" as const,
  },
  {
    title: "OpenAPI",
    value: 24,
    description: "AI 可调用接口",
    tag: "推荐",
    icon: Braces,
    trend: "up" as const,
  },
];

const CAPABILITIES = [
  {
    title: "统一认证",
    description: "支持工作邮箱、手机号、OAuth 扩展接入。",
    badge: "已接入",
    icon: Sparkles,
  },
  {
    title: "权限管控",
    description: "基于角色、菜单、按钮级权限进行细粒度控制。",
    badge: "可扩展",
    icon: ShieldCheck,
  },
  {
    title: "OpenAPI 能力",
    description: "自动沉淀系统接口能力，便于 AI Agent 和 CLI 调用。",
    badge: "推荐",
    icon: TerminalSquare,
  },
];

const QUICK_ACTIONS = [
  {
    title: "用户管理",
    description: "维护后台账号与状态",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "角色配置",
    description: "配置角色和权限范围",
    icon: ShieldCheck,
    href: "/admin/roles",
  },
  {
    title: "菜单管理",
    description: "管理后台导航与路由",
    icon: ListChecks,
    href: "/admin/menus",
  },
  {
    title: "接口文档",
    description: "查看 OpenAPI 能力",
    icon: BookText,
    href: "/admin/system-options",
  },
  {
    title: "系统日志",
    description: "追踪关键操作记录",
    icon: FileClock,
    href: "/admin/settings",
  },
];

const ACTIVITIES: ActivityItem[] = [
  { id: "a1", actor: "系统管理员", title: "更新了角色权限", time: "10 分钟前" },
  { id: "a2", title: "新增 OpenAPI 分组：用户中心", time: "32 分钟前" },
  { id: "a3", title: "菜单「组织架构」完成配置", time: "今天 09:40" },
  { id: "a4", title: "字典管理完成初始化", time: "昨天 18:20" },
];

function AdminDashboardPage() {
  return (
    <div className="space-y-6 pb-8">
      <TechHero
        badge="AI Ready Console"
        title="工作台"
        description="AI 友好后台系统，统一管理权限、组织、菜单与 OpenAPI 能力。"
        actions={[
          {
            label: "查看 OpenAPI",
            icon: <PlugZap className="size-4" aria-hidden />,
            variant: "primary",
            href: "/admin/system-options",
          },
          {
            label: "新增用户",
            icon: <UserPlus className="size-4" aria-hidden />,
            variant: "ghost",
            href: "/admin/users",
          },
          {
            label: "系统设置",
            icon: <ScrollText className="size-4" aria-hidden />,
            variant: "outline",
            href: "/admin/settings",
          },
        ]}
      />

      <section aria-label="数据概览" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <DashboardSection
        title="系统能力"
        description="围绕认证、权限、接口能力，构建 AI 时代可调用的后台基础设施。"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <CapabilityCard key={cap.title} {...cap} />
          ))}
        </div>
      </DashboardSection>

      <DashboardSection title="快捷入口" description="直达常用后台模块，节省操作路径。">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard key={action.title} {...action} />
          ))}
        </div>
      </DashboardSection>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <DashboardSection title="最近活动">
          <div className="yt-card p-5">
            <ActivityTimeline items={ACTIVITIES} />
          </div>
        </DashboardSection>

        <DashboardSection
          title="下一步"
          description="第 3 步将建立 ResourceTable / FilterBar / FormDialog 等后台规范组件。"
        >
          <div className="yt-card relative overflow-hidden p-5">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-tech-grid-soft opacity-50"
            />
            <div className="relative space-y-3">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary-gradient text-white shadow-button"
                >
                  <History className="size-3.5" aria-hidden />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-text-strong">AdminShell 已就绪</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-text-soft">
                    侧边栏、顶部栏、内容区布局稳定，移动端侧栏收起逻辑可用。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary-gradient text-white shadow-button"
                >
                  <Sparkles className="size-3.5" aria-hidden />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-text-strong">品牌设计语言</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-text-soft">
                    蓝色科技品牌 token 已注入，按钮、卡片、徽标、菜单态与登录页保持一致。
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/admin/settings"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  查看系统设置
                </Link>
              </div>
            </div>
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}
