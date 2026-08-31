"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ItemSearchPicker from "../items/ItemSearchPicker";

type Props = {
  totalItems: number;
  categoryCount: number;
  generatedAt: string;
};

type IconName = "search" | "trade" | "trend" | "nich" | "cube" | "layers" | "gem" | "arrow";

const gameModes = [
  {
    href: "/values",
    label: "Check Values",
    kicker: "START HERE",
    copy: "Search the full CSBT world and open a live value page.",
    tone: "primary",
    icon: "search" as const,
  },
  {
    href: "/calculator",
    label: "Compare Trades",
    kicker: "TRADE LAB",
    copy: "Put both offers side by side before you decide.",
    tone: "trade",
    icon: "trade" as const,
  },
  {
    href: "/demand",
    label: "Demand Trends",
    kicker: "MARKET PULSE",
    copy: "See what is moving beyond the raw value.",
    tone: "demand",
    icon: "trend" as const,
  },
  {
    href: "/nich",
    label: "Ask NICH",
    kicker: "YOUR GUIDE",
    copy: "Get trading help without leaving the world.",
    tone: "nich",
    icon: "nich" as const,
  },
] as const;

function formatRefreshDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently refreshed";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function GameIcon({ name }: { name: IconName }) {
  const props = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "search":
      return <svg {...props}><circle cx="20" cy="20" r="11" /><path d="m29 29 11 11" /></svg>;
    case "trade":
      return <svg {...props}><path d="M7 16h27l-7-7m7 7-7 7M41 32H14l7 7m-7-7 7-7" /></svg>;
    case "trend":
      return <svg {...props}><path d="M7 39V9M7 39h34" /><path d="m13 32 8-9 7 5 11-15" /><path d="M34 13h5v5" /></svg>;
    case "nich":
      return <svg {...props}><rect x="8" y="12" width="32" height="27" rx="7" /><path d="M24 6v6M15 23h.01M33 23h.01M17 31h14M4 22h4M40 22h4" /></svg>;
    case "cube":
      return <svg {...props}><path d="m9 16 15-8 15 8-15 8-15-8Z" /><path d="M9 16v18l15 7 15-7V16M24 24v17" /></svg>;
    case "layers":
      return <svg {...props}><path d="m7 17 17-9 17 9-17 9-17-9Z" /><path d="m9 25 15 8 15-8M9 33l15 8 15-8" /></svg>;
    case "gem":
      return <svg {...props}><path d="m7 18 9-11h16l9 11-17 23L7 18Z" /><path d="M7 18h34M16 7l8 34 8-34" /></svg>;
    default:
      return <svg {...props}><path d="M8 24h30M29 15l9 9-9 9" /></svg>;
  }
}

export default function RobloxHomeHero({ totalItems, categoryCount, generatedAt }: Props) {
  const router = useRouter();
  const refreshedLabel = formatRefreshDate(generatedAt);

  return (
    <section className="roblox-home-hero" aria-labelledby="roblox-home-title">
      <div className="roblox-world-sky" aria-hidden="true" />
      <div className="roblox-world-sun" aria-hidden="true" />
      <div className="roblox-cloud roblox-cloud--one" aria-hidden="true"><span /><span /><span /></div>
      <div className="roblox-cloud roblox-cloud--two" aria-hidden="true"><span /><span /><span /></div>
      <div className="roblox-cloud roblox-cloud--three" aria-hidden="true"><span /><span /><span /></div>
      <div className="roblox-world-horizon" aria-hidden="true" />
      <div className="roblox-world-ground" aria-hidden="true"><span /><span /><span /><span /></div>
      <span className="roblox-float-block roblox-float-block--one" aria-hidden="true" />
      <span className="roblox-float-block roblox-float-block--two" aria-hidden="true" />
      <span className="roblox-float-block roblox-float-block--three" aria-hidden="true" />
      <span className="roblox-coin-orbit roblox-coin-orbit--one" aria-hidden="true">◆</span>
      <span className="roblox-coin-orbit roblox-coin-orbit--two" aria-hidden="true">◆</span>

      <div className="roblox-avatar-scene" aria-hidden="true">
        <span className="roblox-avatar-label">PLAYER 01</span>
        <Image
          className="roblox-avatar-image"
          src="/themes/roblox/hero-avatar.png"
          alt=""
          width={1086}
          height={1448}
          priority
          sizes="(max-width: 767px) 170px, (max-width: 1199px) 280px, 440px"
          draggable={false}
        />
      </div>

      <div className="roblox-island-scene" aria-hidden="true">
        <span className="roblox-island-label">TRADE WORLD</span>
        <Image
          className="roblox-island-image"
          src="/themes/roblox/trading-platform.png"
          alt=""
          width={1254}
          height={1254}
          priority
          sizes="(max-width: 767px) 1px, (max-width: 1199px) 320px, 560px"
          draggable={false}
        />
      </div>

      <div className="roblox-home-shell">
        <div className="roblox-home-topline">
          <span className="roblox-lobby-badge"><span className="roblox-live-dot" /> LIVE WORLD</span>
          <span className="roblox-refresh-chip">Updated {refreshedLabel}</span>
          <span className="roblox-server-chip">SERVER · CSBT-01</span>
        </div>

        <header className="roblox-title-zone">
          <span className="roblox-title-kicker">YOUR ADOPT ME TRADING WORLD</span>
          <h1 id="roblox-home-title" className="roblox-home-title">
            <span>CSBT</span><strong>HUB</strong>
          </h1>
          <p className="roblox-home-tagline">
            Know the <strong>value.</strong> Build the <strong>trade.</strong> Find the <strong>trader.</strong>
          </p>
          <p className="roblox-home-copy">Values, inventory, Exchange, demand, community opinions, and Nich — connected like one playable hub.</p>
        </header>

        <div className="roblox-command-zone">
          <div className="roblox-command-label"><span>⌕</span> WORLD SEARCH <b>READY</b></div>
          <div className="roblox-command-shell">
            <ItemSearchPicker
              onSelect={(item) => router.push(`/values/${encodeURIComponent(item.ID)}`)}
              placeholder="Search Frost Dragon, FD, SSBD, or any Adopt Me item…"
            />
            <span className="roblox-command-key" aria-hidden="true">SEARCH</span>
          </div>
          <p>Choose an item, then jump straight into values, trades, demand, or matching.</p>
        </div>

        <div className="roblox-mode-board" aria-label="CSBT game modes">
          {gameModes.map((mode, index) => (
            <Link key={mode.href} href={mode.href} className={`roblox-mode-tile roblox-mode-tile--${mode.tone}`}>
              <span className="roblox-mode-number">0{index + 1}</span>
              <span className="roblox-mode-icon"><GameIcon name={mode.icon} /></span>
              <span className="roblox-mode-copy">
                <small>{mode.kicker}</small>
                <strong>{mode.label}</strong>
                <span>{mode.copy}</span>
              </span>
              <span className="roblox-mode-arrow"><GameIcon name="arrow" /></span>
            </Link>
          ))}
        </div>

        <div className="roblox-stat-board" aria-label="CSBT hub statistics">
          <article className="roblox-stat-module roblox-stat-module--items">
            <span className="roblox-stat-badge">PLAYER DATA · CATALOG</span>
            <div className="roblox-stat-icon"><GameIcon name="cube" /></div>
            <strong>{totalItems.toLocaleString()}+</strong>
            <h2>Items in the world</h2>
            <p>One searchable CSBT database.</p>
            <span className="roblox-stat-progress" aria-hidden="true"><i /></span>
          </article>

          <article className="roblox-stat-module roblox-stat-module--categories">
            <span className="roblox-stat-mini">COLLECTIONS</span>
            <strong>{categoryCount}</strong>
            <h2>Categories</h2>
            <div className="roblox-stat-icon roblox-stat-icon--small"><GameIcon name="layers" /></div>
          </article>

          <article className="roblox-stat-module roblox-stat-module--sources">
            <div className="roblox-stat-icon"><GameIcon name="gem" /></div>
            <span className="roblox-stat-mini">VALUE ENGINE</span>
            <strong>2</strong>
            <h2>Value Sources</h2>
            <p>GCash + Elve Shark</p>
          </article>

          <Link href="/nich" className="roblox-stat-module roblox-stat-module--nich">
            <span className="roblox-nich-status"><i /> ONLINE</span>
            <div className="roblox-stat-icon"><GameIcon name="nich" /></div>
            <span className="roblox-stat-mini">TRADING COMPANION</span>
            <h2>Need a next move?</h2>
            <p>Ask Nich about values, trades, demand, and what to do next.</p>
            <span className="roblox-nich-cta">ASK NICH <GameIcon name="arrow" /></span>
          </Link>
        </div>
      </div>

      <div className="roblox-world-floor" aria-hidden="true"><span /><span /><span /><span /><span /></div>
    </section>
  );
}
