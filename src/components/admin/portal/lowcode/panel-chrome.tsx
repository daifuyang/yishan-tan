/**
 * 左侧面板的公共外壳：标题栏（标题 + 固定 / 关闭）、搜索框、注册表订阅。
 * 组件面板与区块面板共用，保证两块面板的头部尺寸、间距、交互完全一致。
 *
 * 数值取自钉钉宜搭设计器的实测：标题栏高 48、左右 15，标题 16px 加粗；
 * 搜索区内边距 12，输入框高 27、圆角 8、细边框、12px。
 */
import * as React from "react";

import { Pin, PinOff, Search, X } from "lucide-react";

import type { LowcodeMaterialMeta, LowcodeMaterialRegistry } from "./engine";

/**
 * 订阅注册表版本：运行期增删物料时面板跟着重算。
 * 第三个参数是 SSR 快照（面板不在服务端渲染，但测试用 `renderToStaticMarkup`）。
 */
export function useRegistryMetas(registry: LowcodeMaterialRegistry): LowcodeMaterialMeta[] {
  const version = React.useSyncExternalStore(
    registry.subscribe,
    registry.getVersion,
    registry.getVersion,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: version 变了 list() 的结果才变
  return React.useMemo(() => registry.list(), [registry, version]);
}

const ICON_BUTTON =
  "inline-flex size-6 items-center justify-center rounded text-[#171a1d] hover:bg-[#f2f3f5]";

export function PanelTitleBar({
  title,
  pinned,
  onTogglePin,
  onClose,
}: {
  title: string;
  pinned?: boolean;
  onTogglePin?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-12 items-center gap-1 px-[15px]">
      <h2 className="flex-1 text-base font-bold text-[#0f1726]">{title}</h2>
      {onTogglePin ? (
        <button
          type="button"
          className={ICON_BUTTON}
          title={pinned ? "取消固定" : "固定"}
          aria-label={pinned ? "取消固定" : "固定"}
          aria-pressed={pinned}
          onClick={onTogglePin}
        >
          {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          className={ICON_BUTTON}
          title="关闭"
          aria-label="关闭"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function PanelSearch({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        className="h-[27px] w-full rounded-lg border-[0.67px] border-[rgba(132,138,144,0.24)] bg-white pr-7 pl-2 text-xs text-[#171a1d] outline-none placeholder:text-[rgba(24,28,31,0.24)] focus:border-[#0089ff]"
        onChange={(event) => onChange(event.target.value)}
      />
      <Search
        className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-[#9da2ad]"
        aria-hidden
      />
    </div>
  );
}
