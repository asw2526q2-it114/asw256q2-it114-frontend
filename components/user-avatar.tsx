"use client";

import { UserSummary, displayName } from "@/lib/api";

type UserAvatarProps = {
  avatarUrl?: string | null;
  initials?: string;
  size?: "default" | "table";
  user?: UserSummary | null;
};

export function UserAvatar({ avatarUrl, initials, size = "default", user }: UserAvatarProps) {
  const label = displayName(user);
  const sizeClassName = size === "table" ? "user-avatar table" : "user-avatar";
  const fallback = normalizeInitials(initials || label);

  if (avatarUrl) {
    return (
      <span className={sizeClassName} title={label}>
        <img alt={label} className="user-avatar-image" src={avatarUrl} />
      </span>
    );
  }

  return (
    <span aria-label={label} className={`${sizeClassName} fallback`} role="img" title={label}>
      <span aria-hidden="true">{fallback}</span>
    </span>
  );
}

function normalizeInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "U";
  if (!/\s/.test(trimmed) && trimmed.length <= 3) return trimmed.slice(0, 2).toUpperCase();

  return (
    trimmed
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}
