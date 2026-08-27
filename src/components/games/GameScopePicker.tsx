"use client";

import Link from "next/link";
import type { CSBTGameScope } from "../../games/types";

export default function GameScopePicker({
  scope,
  baseHref,
  allowAll = true,
  compact = false,
}: {
  scope: CSBTGameScope;
  baseHref: string;
  allowAll?: boolean;
  compact?: boolean;
}) {
  const options: Array<{ id: CSBTGameScope; label: string; icon: string }> = [
    ...(allowAll ? [{ id: "all" as const, label: "All Games", icon: "✦" }] : []),
    { id: "adopt-me", label: "Adopt Me", icon: "🐾" },
    { id: "mm2", label: "MM2", icon: "🔪" },
  ];

  return (
    <div className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface-3)] p-1 ${compact ? "text-[10px]" : "text-xs"}`} aria-label="Choose game">
      {options.map((option) => (
        <Link
          key={option.id}
          href={`${baseHref}?game=${option.id}`}
          aria-current={scope === option.id ? "page" : undefined}
          className={`shrink-0 rounded-[10px] px-3 py-2 font-black transition ${scope === option.id ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"}`}
        >
          {option.icon} {option.label}
        </Link>
      ))}
    </div>
  );
}
