import * as React from "react";

import { cn } from "@/lib/utils";
import type { PublicUser } from "~/features/auth/auth.types";

type UserAvatarProps = {
  user: Pick<PublicUser, "displayName" | "username" | "email"> | null | undefined;
  size?: "sm" | "md";
  variant?: "brand" | "muted";
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
};

export function getInitials(
  user: Pick<PublicUser, "displayName" | "username" | "email"> | null | undefined,
): string {
  if (!user) return "?";
  const display = (user.displayName ?? "").trim();
  if (display) {
    const parts = display.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    const head = parts[0]?.[0] ?? "";
    if (head) return head.toUpperCase();
  }
  const username = (user.username ?? "").trim();
  if (username) return username.slice(0, 2).toUpperCase();
  const email = (user.email ?? "").trim();
  if (email) return email.slice(0, 1).toUpperCase();
  return "?";
}

export function UserAvatar({ user, size = "md", variant = "muted", className }: UserAvatarProps) {
  const initials = React.useMemo(() => getInitials(user), [user]);
  const variantClass =
    variant === "brand" ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        SIZE_CLASS[size],
        variantClass,
        className,
      )}
    >
      {initials}
    </span>
  );
}
