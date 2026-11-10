import { Inbox } from "lucide-react";
import type * as React from "react";

import { cn } from "~/lib/utils";
import { EmptyState } from "./empty-state";

type EmptyProps = {
  /** 空状态主文案;不传时只展示 description。 */
  title?: React.ReactNode;
  /** 空状态说明文案;一行以内最合适。 */
  description: React.ReactNode;
  /** 图形尺寸(px),默认 44。 */
  imageSize?: number;
  className?: string;
};

/**
 * 通用空状态：中性色线性图形 + 主文案/说明，水平垂直居中。
 * 只在数据确实为空时使用；加载中用 Skeleton，请求失败用错误态。
 */
export function Empty({ title, description, imageSize = 44, className }: EmptyProps) {
  return (
    <EmptyState
      icon={Inbox}
      imageSize={imageSize}
      title={title}
      description={description}
      className={cn("px-0", className)}
    />
  );
}
