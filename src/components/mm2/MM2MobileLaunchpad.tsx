"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./MM2MobileLaunchpad.module.css";

/**
 * The MM2 homepage, as a phone sees it.
 *
 * The desktop homepage is a room: a weapon vault you look into, a terminal you
 * walk up to, instruments along the far wall. That composition is the point of
 * the page and it is untouched — but read top-to-bottom on a 390px screen it
 * put roughly 600px of vault between the user and the first thing they could
 * press. Someone opening CSBT on their phone is nearly always doing one of four
 * things, and they should not have to scroll past scenery to start.
 *
 * So on phones this replaces the vault-then-terminal opening with a launchpad:
 * where you are, a search box, and the four destinations that account for
 * almost every visit. The room is still below it. Nothing here exists above
 * 720px, and nothing on the desktop page was moved to make space for it.
 */

type Destination = {
  href: string;
  label: string;
  hint: string;
  icon: "values" | "calculator" | "nich" | "demand";
};

const PRIMARY: Destination[] = [
  { href: "/mm2/values", label: "Weapon Values", hint: "Look up any weapon", icon: "values" },
  { href: "/mm2/calculator", label: "Trade Calculator", hint: "Compare both sides", icon: "calculator" },
  { href: "/mm2/nich", label: "Ask NICH", hint: "Values, trades, demand", icon: "nich" },
  { href: "/mm2/demand", label: "Market Radar", hint: "What people want", icon: "demand" },
];

const SECONDARY = [
  { href: "/mm2/exchange", label: "Exchange" },
  { href: "/mm2/trade-opinions", label: "Trade Opinions" },
  { href: "/mm2/lounge", label: "Lounge" },
];

function Icon({ name }: { name: Destination["icon"] }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true as const };
  if (name === "values") {
    return <svg {...common}><path d="m5 19 8-8M13 11l5-6 1 1-6 5" /><path d="m7 17-2-2M9 15l-2-2" /></svg>;
  }
  if (name === "calculator") {
    return <svg {...common}><path d="M12 4v16M5 7h14" /><path d="M7 7 4 13h6L7 7ZM17 7l-3 6h6l-3-6Z" /><path d="M8 20h8" /></svg>;
  }
  if (name === "nich") {
    return <svg {...common}><rect x="8" y="8" width="8" height="8" rx="1" /><path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></svg>;
}

export default function MM2MobileLaunchpad({
  totalItems,
  syncedOn,
}: {
  totalItems: number;
  syncedOn: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <section className={styles.launchpad} aria-label="MM2 quick start">
      <div className={styles.identity}>
        <span className={styles.eyebrow}>
          <i aria-hidden="true" /> MM2 TRADING HQ
        </span>
        <h1 className={styles.title}>
          <strong>CSBT</strong> HUB
        </h1>
        <p className={styles.tagline}>Values · Trades · Demand</p>
      </div>

      <form
        className={styles.search}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = query.trim();
          router.push(trimmed ? `/mm2/values?q=${encodeURIComponent(trimmed)}` : "/mm2/values");
        }}
      >
        <span className={styles.searchIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search MM2 weapons…"
          aria-label="Search MM2 weapons"
          enterKeyHint="search"
          autoComplete="off"
        />
        <button type="submit">Go</button>
      </form>

      <nav className={styles.grid} aria-label="MM2 sections">
        {PRIMARY.map((destination) => (
          <Link key={destination.href} href={destination.href} className={styles.tile}>
            <span className={styles.tileIcon}><Icon name={destination.icon} /></span>
            <strong>{destination.label}</strong>
            <small>{destination.hint}</small>
          </Link>
        ))}
      </nav>

      <div className={`${styles.secondary} csbt-scroll-x`}>
        {SECONDARY.map((destination) => (
          <Link key={destination.href} href={destination.href}>
            {destination.label}
          </Link>
        ))}
      </div>

      <p className={styles.meta}>
        {totalItems.toLocaleString("en-US")} weapons · updated {syncedOn}
      </p>
    </section>
  );
}
