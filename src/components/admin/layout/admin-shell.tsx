import * as React from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
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

  const closeMobile = React.useCallback(() => setMobileOpen(false), []);
  const openMobile = React.useCallback(() => setMobileOpen(true), []);

  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col bg-page text-foreground">
        <AdminHeader
          onOpenMobileSidebar={openMobile}
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
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
            aria-label="后台侧边导航"
            className={cn(
              "hidden border-r border-line bg-sidebar-bg lg:sticky lg:top-12 lg:flex lg:h-[calc(100svh-3rem)] lg:min-h-0 lg:shrink-0 lg:flex-col",
              "transition-[width] duration-200",
              collapsed ? "lg:w-16" : "lg:w-64",
            )}
          >
            <AdminSidebarContent collapsed={collapsed} />
          </aside>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
