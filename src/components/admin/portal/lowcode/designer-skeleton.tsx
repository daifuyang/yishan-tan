/**
 * 低代码设计器的加载骨架，尺寸照引擎 `DesignerShell` / `ActivityRail` 的首屏：
 * 顶栏 48 · 左侧图标导航 48（+1 边框，面板默认收起）· 中间画布 · 右栏 300 · 底部节点路径 34。
 */
import { Skeleton } from "~/components/ui/skeleton";

const RAIL_TOP = ["r1", "r2", "r3"];
const PROPERTY_ROWS = ["p1", "p2", "p3", "p4", "p5", "p6"];

export function DesignerSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col bg-[#f5f6f7]"
      aria-busy="true"
      aria-label="低代码编辑器加载中"
    >
      <header className="mb-0.5 flex h-12 shrink-0 items-center gap-2 bg-white py-2 pr-3 pl-4">
        <Skeleton className="h-5 w-28" />
        <div className="flex flex-1 items-center justify-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-7" />
          <Skeleton className="size-7" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-7 w-16" />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[49px_minmax(0,1fr)_300px]">
        <nav className="flex flex-col items-center border-r border-[#e5e6eb] bg-white pt-3">
          {RAIL_TOP.map((key) => (
            <div key={key} className="flex size-[46px] items-center justify-center">
              <Skeleton className="size-5" />
            </div>
          ))}
          <div className="flex-1" />
          <div className="flex size-[46px] items-center justify-center">
            <Skeleton className="size-5" />
          </div>
        </nav>

        <main className="flex min-w-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden bg-[#edeff3] p-4">
            <div className="flex h-full flex-col gap-4 overflow-hidden bg-white p-6 shadow-[0_1px_4px_0_rgba(31,50,88,0.125)]">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-44 w-full" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
              <Skeleton className="h-20 w-2/3" />
            </div>
          </div>
          <div className="flex h-[34px] shrink-0 items-center gap-2 border-t border-[#eef0f4] bg-white px-3.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </main>

        <aside className="flex flex-col gap-4 border-l border-[#e5e6eb] bg-white p-4">
          <div className="flex gap-4 border-b border-[#eef0f4] pb-3">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
          {PROPERTY_ROWS.map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
