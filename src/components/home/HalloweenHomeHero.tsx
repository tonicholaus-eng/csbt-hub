"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ItemSearchPicker from "../items/ItemSearchPicker";

const actions = [
  { href: "/values", no: "01", kicker: "FORTUNE BOARD", title: "Check Values", copy: "Reveal an item's supported value before you make your next move.", tone: "orange", mark: "✦" },
  { href: "/calculator", no: "02", kicker: "HAUNTED TRADE TENT", title: "Compare Trades", copy: "Put both offers on the table and see the difference before you commit.", tone: "red", mark: "⇄" },
  { href: "/demand", no: "03", kicker: "MARKET ORACLE", title: "Demand Trends", copy: "Read the market signal hiding behind the value.", tone: "gold", mark: "↗" },
  { href: "/nich", no: "04", kicker: "SPIRIT GUIDE", title: "Ask NICH", copy: "Call on Nich when you need a second opinion or your next step.", tone: "purple", mark: "☾" },
] as const;

function formatRefreshDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently refreshed";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(date);
}

export default function HalloweenHomeHero({ totalItems, categoryCount, generatedAt }: { totalItems: number; categoryCount: number; generatedAt: string }) {
  const router = useRouter();
  const stats = [
    { label: "Items in the archive", value: `${totalItems.toLocaleString()}+`, copy: "Tracked values", tone: "items" },
    { label: "Categories", value: String(categoryCount), copy: "Across the CSBT database", tone: "categories" },
    { label: "Value Sources", value: "2", copy: "GCash + Elve Shark", tone: "sources" },
    { label: "NICH Assistant", value: "ONLINE", copy: "Your midnight trading guide", tone: "nich" },
  ] as const;

  return (
    <section className="halloween-home-hero" aria-labelledby="halloween-home-title">
      <div className="halloween-night-sky" aria-hidden="true" />
      <div className="halloween-moon" aria-hidden="true"><span /></div>
      <div className="halloween-cloud halloween-cloud--one" aria-hidden="true" />
      <div className="halloween-cloud halloween-cloud--two" aria-hidden="true" />
      <div className="halloween-bats" aria-hidden="true"><span>⌁</span><span>⌁</span><span>⌁</span></div>
      <div className="halloween-tree-anchor" aria-hidden="true"><i/><b/><em/></div>
      <div className="halloween-character-scene" aria-hidden="true">
        <Image src="/themes/halloween/hero-character.png" alt="" width={1122} height={1402} priority sizes="(max-width: 767px) 180px, (max-width: 1199px) 300px, 28vw" />
      </div>
      <div className="halloween-booth-scene" aria-hidden="true">
        <Image src="/themes/halloween/haunted-trading-booth.png" alt="" width={1448} height={1086} priority sizes="(max-width: 767px) 0px, (max-width: 1199px) 360px, 34vw" />
      </div>
      <div className="halloween-fog halloween-fog--back" aria-hidden="true" />
      <div className="halloween-fog halloween-fog--front" aria-hidden="true" />

      <div className="halloween-home-shell">
        <div className="halloween-topline">
          <span className="halloween-live-badge"><i /> MIDNIGHT EVENT</span>
          <span className="halloween-refresh-chip">Database refreshed {formatRefreshDate(generatedAt)}</span>
          <span className="halloween-server-chip">NIGHT · CSBT-13</span>
        </div>

        <div className="halloween-title-zone">
          <span className="halloween-kicker">THE HAUNTED TRADING CARNIVAL</span>
          <h1 id="halloween-home-title" className="halloween-home-title"><span>CSBT</span> <strong>HUB</strong></h1>
          <p className="halloween-home-tagline">Know the <b>value.</b> Build the <strong>trade.</strong> Find the <em>trader.</em></p>
          <p className="halloween-home-copy">Values, inventory, Exchange, demand, community opinions, and Nich — open after dark.</p>
        </div>

        <div className="halloween-command-zone">
          <div className="halloween-command-label"><span>✦</span> ENCHANTED SEARCH <i>READY</i></div>
          <div className="halloween-command-shell">
            <ItemSearchPicker onSelect={(item) => router.push(`/values/${encodeURIComponent(item.ID)}`)} placeholder="Search Frost Dragon, FD, SSBD, or any Adopt Me item…" />
            <span className="halloween-command-key">SEARCH</span>
          </div>
          <p>Start with an item, then step into values, trades, demand, or matching.</p>
        </div>

        <div className="halloween-mode-board">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className={`halloween-mode-tile halloween-mode-tile--${action.tone}`}>
              <span className="halloween-mode-no">{action.no}</span>
              <span className="halloween-mode-icon" aria-hidden="true">{action.mark}</span>
              <span className="halloween-mode-copy"><small>{action.kicker}</small><strong>{action.title}</strong><span>{action.copy}</span></span>
              <span className="halloween-mode-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>

        <div className="halloween-stat-board">
          {stats.map((stat) => <div key={stat.label} className={`halloween-stat-module halloween-stat-module--${stat.tone}`}>{stat.tone === "nich" ? <Image className="halloween-helper-art" src="/themes/halloween/helper.png" alt="" width={116} height={116} sizes="116px" /> : null}<span className="halloween-stat-rune" aria-hidden="true">✧</span><strong>{stat.value}</strong><b>{stat.label}</b><small>{stat.copy}</small></div>)}
        </div>
      </div>

      <div className="halloween-asset-note halloween-asset-note--left" aria-hidden="true">CHARACTER ART SLOT</div>
      <div className="halloween-asset-note halloween-asset-note--right" aria-hidden="true">TRADING BOOTH ART SLOT</div>
    </section>
  );
}
