import {
  Bell,
  KeyRound,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "~/features/auth/auth.queries";
import { useLogout } from "~/features/auth/auth.use-logout";
import { UserAvatar } from "../display/user-avatar";

type AdminHeaderProps = {
  onOpenMobileSidebar: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function AdminHeader({
  onOpenMobileSidebar,
  collapsed = false,
  onToggleCollapsed,
}: AdminHeaderProps) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  const displayName = user?.displayName ?? user?.username ?? "未知用户";
  const role = user?.role ?? "member";

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center border-b border-line bg-white">
      <div className="flex h-full w-full min-w-0 items-center">
        <div className="flex h-full shrink-0 items-center gap-0 px-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 lg:hidden"
            aria-label="打开导航"
            onClick={onOpenMobileSidebar}
          >
            <Menu className="size-5" aria-hidden />
          </Button>
          <div className={cn("flex h-full shrink-0 items-center", collapsed ? "w-16" : "w-64")}>
            <HeaderBrand collapsed={collapsed} />
          </div>
          {onToggleCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleCollapsed}
                  aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
                  className="hidden h-7 w-7 text-text-soft hover:bg-line-soft hover:text-text-strong lg:inline-flex"
                >
                  {collapsed ? (
                    <PanelLeftOpen className="size-4" aria-hidden />
                  ) : (
                    <PanelLeftClose className="size-4" aria-hidden />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{collapsed ? "展开侧栏" : "收起侧栏"}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div className="hidden flex-1 md:block" aria-hidden />

        <div className="flex h-full shrink-0 items-center gap-1 px-3">
          <HeaderSearch />
          <HeaderIconButton label="通知中心" tooltip="通知">
            <Bell className="size-4" aria-hidden />
          </HeaderIconButton>
          <HeaderIconButton label="系统设置" tooltip="设置">
            <Settings className="size-4" aria-hidden />
          </HeaderIconButton>
          <UserMenu
            displayName={displayName}
            username={user?.username ?? ""}
            email={user?.email ?? ""}
            role={role}
            disabled={logout.isPending}
            onLogout={() => logout.mutate()}
          />
        </div>
      </div>
    </header>
  );
}

function HeaderBrand({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-[13px] font-semibold text-white"
        >
          Y
        </span>
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center px-3">
      <h1 className="m-0 truncate text-[14px] font-semibold tracking-tight text-text-strong">
        <strong>Yishan Tan</strong>
      </h1>
    </div>
  );
}

function HeaderSearch() {
  return (
    <form
      className="group relative flex h-8 w-[240px] items-center lg:w-[260px]"
      onSubmit={(e) => e.preventDefault()}
    >
      <Search
        className="pointer-events-none absolute left-3 size-4 text-text-mute transition-colors group-focus-within:text-text-soft"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="搜索"
        aria-label="搜索"
        className="h-8 w-full rounded-[4px] border-transparent bg-surface-soft pl-9 pr-3 text-[13px] text-text-strong shadow-none hover:bg-line-soft focus-visible:border-brand-500 focus-visible:bg-white focus-visible:ring-0"
      />
    </form>
  );
}

function HeaderIconButton({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hidden h-8 w-8 text-text-soft hover:bg-line-soft hover:text-text-strong md:inline-flex"
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

type UserMenuProps = {
  displayName: string;
  username: string;
  email: string;
  role: "admin" | "member";
  disabled: boolean;
  onLogout: () => void;
};

function UserMenu({ displayName, username, email, role, disabled, onLogout }: UserMenuProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-[4px] hover:bg-line-soft data-[state=open]:bg-line-soft"
              aria-label="当前用户菜单"
              disabled={disabled}
            >
              <UserAvatar user={{ displayName, username, email }} size="sm" variant="muted" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{displayName}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72">
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-3 px-3 pt-3 pb-2">
            <UserAvatar user={{ displayName, username, email }} size="md" variant="brand" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text-strong">{displayName}</p>
              <p className="truncate text-xs text-text-soft">@{username || "unknown"}</p>
              <p className="truncate text-xs text-text-mute">{email || "--"}</p>
              <p className="mt-1 text-xs text-text-mute">
                {role === "admin" ? "超级管理员" : "成员"}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled>
          <UserRound aria-hidden />
          <span>个人中心</span>
          <span className="ml-auto text-xs text-text-mute">敬请期待</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <KeyRound aria-hidden />
          <span>API Key</span>
          <span className="ml-auto text-xs text-text-mute">敬请期待</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <ScrollText aria-hidden />
          <span>登录日志</span>
          <span className="ml-auto text-xs text-text-mute">敬请期待</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings aria-hidden />
          <span>偏好设置</span>
          <span className="ml-auto text-xs text-text-mute">敬请期待</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
            onLogout();
          }}
        >
          <LogOut aria-hidden />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
