import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function LineTabs<Key extends string>({
  label,
  items,
  value,
  onChange,
  panelId,
  triggerClassName,
}: {
  label: string;
  items: readonly { key: Key; label: ReactNode; ariaLabel?: string }[];
  value: Key;
  onChange: (key: Key) => void;
  panelId?: (key: Key) => string;
  triggerClassName?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex min-w-0 gap-6 overflow-x-auto">
      {items.map((item, index) => {
        const active = value === item.key;
        const controls = panelId?.(item.key);
        return (
          <button
            key={item.key}
            id={controls ? `${controls}-tab` : undefined}
            type="button"
            role="tab"
            aria-label={item.ariaLabel}
            aria-selected={active}
            aria-controls={controls}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(event) => {
              const positions: Record<string, number> = {
                ArrowLeft: (index + items.length - 1) % items.length,
                ArrowRight: (index + 1) % items.length,
                Home: 0,
                End: items.length - 1,
              };
              if (!Object.hasOwn(positions, event.key)) return;
              const next = positions[event.key];
              if (next === undefined || !items[next]) return;
              event.preventDefault();
              const triggers =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                );
              triggers?.[next]?.focus();
              onChange(items[next].key);
            }}
            className={cn(
              "h-10 shrink-0 whitespace-nowrap border-b-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500",
              active
                ? "border-brand-600 font-medium text-brand-600"
                : "border-transparent text-text-soft hover:text-text-strong",
              triggerClassName,
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
