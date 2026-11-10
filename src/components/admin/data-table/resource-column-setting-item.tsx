import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 整行参与碰撞检测，只有拖拽手柄启动排序，避免勾选误触。 */
export function ResourceColumnSettingItem({
  id,
  index,
  label,
  children,
}: {
  id: string;
  index: number;
  label: string;
  children: ReactNode;
}) {
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id,
    index,
    transition: { duration: 180, easing: "ease", idle: true },
  });
  return (
    <li
      ref={ref}
      className={cn(
        "relative flex items-center gap-2 rounded bg-background px-1 py-1.5 hover:bg-muted",
        isDragging && "z-10 bg-muted",
        isDropTarget && "ring-1 ring-inset ring-brand-200",
      )}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`拖动排序：${label}`}
        title="拖拽排序；键盘空格开始、方向键移动、空格确认、Esc 取消"
        className="cursor-grab touch-none select-none rounded p-1 text-text-mute outline-none focus-visible:ring-1 focus-visible:ring-brand-500 active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      {children}
    </li>
  );
}
