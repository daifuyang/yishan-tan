import { cn } from "@/lib/utils";

export type ActivityItem = {
  id?: string;
  title: string;
  time: string;
  actor?: string;
};

type ActivityTimelineProps = {
  items: ActivityItem[];
  className?: string;
};

export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li
            key={item.id ?? `${item.title}-${index}`}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            {/* 时间线圆点 + 连接线 */}
            <div className="relative flex w-3 shrink-0 flex-col items-center pt-1.5">
              <span
                aria-hidden
                className="relative z-10 inline-flex size-2.5 items-center justify-center rounded-full bg-brand-primary-gradient shadow-[0_0_8px_rgba(5,97,242,0.6)]"
              />
              {!isLast ? (
                <span
                  aria-hidden
                  className="absolute top-4 bottom-0 w-px bg-gradient-to-b from-brand-300/80 to-line"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-[13px] font-medium text-text-strong">
                {item.actor ? <span className="text-brand-700">{item.actor}</span> : null}
                {item.actor ? " " : null}
                {item.title}
              </p>
              <p className="mt-0.5 text-[11px] text-text-mute">{item.time}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
