"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The Adopt Me ↔ MM2 mode switch.
 *
 * One control, rendered by every shell. Before this component the switch
 * existed twice and inconsistently: as `<GameSwitcher/>` buried inside the
 * default Adopt Me home hero — so it vanished the moment a user picked any
 * other appearance, because each appearance renders its own hero — and again as
 * a pair of hand-written `<Link>`s inside the MM2 rail. Two implementations of
 * "which game am I in" is one too many for the control that decides which
 * catalog every other page reads.
 *
 * There is deliberately **no state here**. The active game is the URL: anything
 * under `/mm2` is MM2, everything else is Adopt Me. That is the same rule the
 * NICH game router and the page shells already apply, so the switch cannot
 * disagree with the page it is sitting on, and there is nothing extra to
 * persist, hydrate or reset.
 *
 * Appearance themes restyle this control through CSS variables and the
 * `.mm2-game-switch` skin. They cannot remove it, because it is rendered by the
 * shared shells rather than by any theme's hero.
 */

export type GameModeSwitchVariant =
  /** Full-width block for a desktop sidebar rail. */
  | "rail"
  /** Small segmented control for a mobile header. */
  | "compact"
  /** Centred pill pair for use inside page content. */
  | "inline";

export const CSBT_GAMES = [
  { id: "adopt-me", href: "/", label: "Adopt Me", short: "Adopt Me", icon: "🐾" },
  { id: "mm2", href: "/mm2", label: "MM2", short: "MM2", icon: "🔪" },
] as const;

export type GameModeId = (typeof CSBT_GAMES)[number]["id"];

/** The game a path belongs to. Exported so shells and tests share one rule. */
export function gameForPath(pathname: string): GameModeId {
  return pathname === "/mm2" || pathname.startsWith("/mm2/") ? "mm2" : "adopt-me";
}

/**
 * The switch itself, with the active game passed in.
 *
 * Split from the exported component purely so it can be rendered — and
 * therefore asserted on — without a Next router in scope. The wrapper below is
 * the only thing that reads the URL.
 */
export function GameModeSwitchView({
  pathname,
  variant = "rail",
  className = "",
}: {
  pathname: string;
  variant?: GameModeSwitchVariant;
  className?: string;
}) {
  const active = gameForPath(pathname);

  if (variant === "inline") {
    return (
      <div
        data-csbt-game-switch={variant}
        className={`flex flex-wrap justify-center gap-3 ${className}`}
        role="group"
        aria-label="Choose game"
      >
        {CSBT_GAMES.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            aria-current={active === game.id ? "page" : undefined}
            className={`inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] border px-6 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--gold)_35%,transparent)] ${
              active === game.id
                ? "border-[var(--border-gold)] bg-[var(--surface-selected)] text-[var(--foreground)] shadow-[var(--shadow-gold)]"
                : "border-[var(--border)] bg-[var(--surface-3)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            }`}
          >
            <span aria-hidden="true">{game.icon}</span>
            {game.label}
          </Link>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        data-csbt-game-switch={variant}
        role="group"
        aria-label="Choose game"
        className={`grid shrink-0 grid-cols-2 overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface-3)] ${className}`}
      >
        {CSBT_GAMES.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            aria-current={active === game.id ? "page" : undefined}
            aria-label={game.label}
            className={`flex min-h-11 min-w-[42px] items-center justify-center gap-1 px-1.5 text-[10px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--gold)] ${
              active === game.id
                ? "bg-[var(--surface-selected)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--foreground-muted)]"
            }`}
          >
            <span aria-hidden="true">{game.icon}</span>
            {/* The word is dropped on the narrowest phones so the header never
                wraps; the icon plus aria-label still names the destination. */}
            <span className="hidden [@media(min-width:390px)]:inline">{game.short}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div data-csbt-game-switch={variant} className={className}>
      <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[.13em] text-[var(--foreground-muted)]">Game</p>
      <div
        role="group"
        aria-label="Choose game"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-3)] p-1"
      >
        {CSBT_GAMES.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            aria-current={active === game.id ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
              active === game.id
                ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border-gold)]"
                : "text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <span aria-hidden="true">{game.icon}</span>
            {game.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function GameModeSwitch({
  variant = "rail",
  className = "",
}: {
  variant?: GameModeSwitchVariant;
  className?: string;
}) {
  const pathname = usePathname() ?? "/";
  return <GameModeSwitchView pathname={pathname} variant={variant} className={className} />;
}
