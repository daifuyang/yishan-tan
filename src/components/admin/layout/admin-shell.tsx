import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AdminHeader } from "./admin-header";
import { AdminSidebarContent } from "./admin-sidebar";

type AdminShellProps = {
  children: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function AdminShell({ children, collapsed = false, onToggleCollapsed }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const shellStyle = {
    "--admin-sidebar-width": collapsed ? "4rem" : "16rem",
  } as React.CSSProperties;

  const closeMobile = React.useCallback(() => setMobileOpen(false), []);
  const openMobile = React.useCallback(() => setMobileOpen(true), []);

  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col bg-page text-foreground" style={shellStyle}>
        <AdminHeader onOpenMobileSidebar={openMobile} collapsed={collapsed} />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="flex w-72 max-w-[85vw] gap-0 border-r border-line bg-sidebar-bg p-0 text-text-strong"
          >
            <SheetTitle className="sr-only">后台导航</SheetTitle>
            <AdminSidebarContent onNavigate={closeMobile} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1">
          <aside
            id="admin-desktop-sidebar"
            aria-label="后台侧边导航"
            className={cn(
              "hidden border-r border-line bg-sidebar-bg lg:sticky lg:top-12 lg:z-20 lg:flex lg:h-[calc(100svh-3rem)] lg:min-h-0 lg:shrink-0 lg:flex-col",
              "transition-[width] duration-200 motion-reduce:transition-none",
              collapsed ? "lg:w-16" : "lg:w-64",
            )}
          >
            <AdminSidebarContent collapsed={collapsed} />
            {onToggleCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={onToggleCollapsed}
                    aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
                    aria-expanded={!collapsed}
                    aria-controls="admin-desktop-sidebar"
                    className="absolute right-0 top-6 z-20 h-6 w-6 translate-x-1/2 rounded-full border-line bg-sidebar-bg text-text-soft shadow-none hover:border-brand-500 hover:bg-sidebar-bg hover:text-brand-500"
                  >
                    {collapsed ? (
                      <ChevronRight className="size-4" aria-hidden />
                    ) : (
                      <ChevronLeft className="size-4" aria-hidden />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {collapsed ? "展开侧栏" : "收起侧栏"}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </aside>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
