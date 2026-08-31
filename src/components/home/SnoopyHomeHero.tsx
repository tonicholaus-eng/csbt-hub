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

type IconName = "star" | "scale" | "chart" | "heart" | "diamond" | "robot";

const actions = [
  { href: "/values", label: "Check Values", icon: "star" as const, tone: "blue", panel: "01", kicker: "FIND + CHECK", copy: "Search an item and open its live value page." },
  { href: "/calculator", label: "Compare Trades", icon: "scale" as const, tone: "red", panel: "02", kicker: "TRADE TIME", copy: "Put both offers side by side before you decide." },
  { href: "/demand", label: "Demand Trends", icon: "chart" as const, tone: "yellow", panel: "03", kicker: "MARKET PULSE", copy: "See what is moving beyond the raw number." },
  { href: "/nich", label: "Ask NICH", icon: "heart" as const, tone: "cream", panel: "04", kicker: "HEY, NICH!", copy: "Ask for trade help or your next move." },
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

function MiniIcon({ name }: { name: IconName }) {
  const props = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "star") return <svg {...props}><path d="m24 5 5.7 11.6 12.8 1.9-9.2 9 2.2 12.7L24 34.1l-11.5 6.1 2.2-12.7-9.2-9 12.8-1.9L24 5Z" /></svg>;
  if (name === "scale") return <svg {...props}><path d="M24 7v33M13 12h22M8 35h32" /><path d="m13 12-7 15h14l-7-15Zm22 0-7 15h14l-7-15Z" /><path d="M6 27c1 5 13 5 14 0M28 27c1 5 13 5 14 0" /></svg>;
  if (name === "chart") return <svg {...props}><path d="M7 40V9M7 40h35" /><path d="m13 33 8-10 7 5 11-15" /><path d="M34 13h5v5" /></svg>;
  if (name === "heart") return <svg {...props}><path d="M24 40 7 24C-2 14 12 3 24 16 36 3 50 14 41 24L24 40Z" /></svg>;
  if (name === "diamond") return <svg {...props}><path d="m7 18 8-10h18l8 10-17 23L7 18Z" /><path d="M7 18h34M15 8l9 33 9-33" /></svg>;
  return <svg {...props}><rect x="8" y="12" width="32" height="27" rx="7" /><path d="M24 6v6M15 23h.01M33 23h.01M17 31h14" /><path d="M4 22h4M40 22h4" /></svg>;
}

function ComicStar({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" aria-hidden="true"><path d="m32 5 7 18 19 1-15 12 5 19-16-11-16 11 5-19L6 24l19-1 7-18Z" /></svg>;
}

function ComicCloud({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 180 92" aria-hidden="true">
      <path d="M31 72c-15 0-24-9-24-20 0-12 9-21 22-22 5-15 18-24 35-22 14 1 25 10 29 22 8-7 18-8 27-4 8 3 14 11 14 20 20-1 34 9 34 23 0 11-10 20-25 20H31c-9 0-14-5-14-10 0-4 5-7 14-7Z" />
      <path d="M42 80c17-7 35-9 54-5M112 74c11-2 20-1 29 3" />
    </svg>
  );
}

export default function SnoopyHomeHero({ totalItems, categoryCount, generatedAt }: Props) {
  const router = useRouter();
  const refreshedLabel = formatRefreshDate(generatedAt);

  const stats = [
    { value: `${totalItems.toLocaleString()}+`, label: "Items", description: "Tracked values", accent: "blue" },
    { value: `${categoryCount}`, label: "Categories", description: "Across the CSBT database", accent: "red" },
    { value: <MiniIcon name="diamond" />, label: "2 Value Sources", description: "GCash + Elve Shark", accent: "blue" },
    { value: <MiniIcon name="robot" />, label: "NICH Assistant", description: "Help anytime you need it", accent: "red" },
  ] as const;

  return (
    <section className="snoopy-home-hero" aria-labelledby="snoopy-home-title">
      <div className="snoopy-home-paper" aria-hidden="true" />

      <ComicCloud className="snoopy-hero-cloud snoopy-hero-cloud--left" />
      <ComicCloud className="snoopy-hero-cloud snoopy-hero-cloud--right" />
      <ComicStar className="snoopy-hero-star snoopy-hero-star--one" />
      <ComicStar className="snoopy-hero-star snoopy-hero-star--two" />
      <ComicStar className="snoopy-hero-star snoopy-hero-star--three" />
      <span className="snoopy-hero-heart" aria-hidden="true">♥</span>
      <span className="snoopy-hero-zap snoopy-hero-zap--left" aria-hidden="true">✦</span>
      <span className="snoopy-hero-zap snoopy-hero-zap--right" aria-hidden="true">✦</span>

      <div className="snoopy-hero-left-scene" aria-hidden="true">
        <Image
          className="snoopy-hero-asset-image"
          src="/themes/snoopy/snoopy-woodstock.png"
          alt=""
          width={1536}
          height={1024}
          sizes="(max-width: 639px) 120px, (max-width: 1099px) 210px, (max-width: 1279px) 300px, 400px"
          draggable={false}
        />
      </div>

      <div className="snoopy-hero-right-scene" aria-hidden="true">
        <Image
          className="snoopy-hero-asset-image"
          src="/themes/snoopy/doghouse-woodstock.png"
          alt=""
          width={1536}
          height={1024}
          sizes="(max-width: 639px) 1px, (max-width: 1099px) 200px, (max-width: 1279px) 290px, 380px"
          draggable={false}
        />
      </div>

      <div className="snoopy-home-content">
        <div className="snoopy-refresh-badge">
          <MiniIcon name="star" />
          <span>Database refreshed {refreshedLabel}</span>
        </div>

        <div className="snoopy-title-wrap">
          <span className="snoopy-title-doodle snoopy-title-doodle--left" aria-hidden="true">⌁</span>
          <h1 id="snoopy-home-title" className="snoopy-home-title"><span>CSBT</span> <strong>HUB</strong></h1>
          <span className="snoopy-title-doodle snoopy-title-doodle--right" aria-hidden="true">⌁</span>
        </div>

        <p className="snoopy-home-tagline">
          Know the <span className="snoopy-copy-blue">value.</span> Build the <span className="snoopy-copy-red">trade.</span> Find the <span className="snoopy-copy-mustard">trader.</span>
        </p>
        <p className="snoopy-home-copy">CSBT connects values, inventory, trading tools, Exchange, community opinions, and <strong>NICH</strong> in one hub.</p>

        <div className="snoopy-speech-bubble" aria-hidden="true">
          <span className="snoopy-speech-bubble__label">Comic tip</span>
          <span className="snoopy-speech-bubble__copy">Start with search, then jump into values, trades, or Nich.</span>
        </div>

        <div className="snoopy-search-wrap">
          <div className="snoopy-search-shell">
            <ItemSearchPicker
              onSelect={(item) => router.push(`/values/${encodeURIComponent(item.ID)}`)}
              placeholder="Search Frost Dragon, FD, SSBD, or any Adopt Me item…"
            />
            <span className="snoopy-search-accent" aria-hidden="true">♥</span>
          </div>
          <p>Start with an item. From its page you can value it, watch it, add it to inventory, build a trade, or find traders.</p>
        </div>

        <div className="snoopy-comic-strip" aria-label="Popular CSBT actions">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className={`snoopy-action snoopy-action--${action.tone}`}>
              <span className="snoopy-action-shadow" aria-hidden="true" />
              <span className="snoopy-action-panel" aria-hidden="true">PANEL {action.panel}</span>
              <span className="snoopy-action-kicker">{action.kicker}</span>
              <span className="snoopy-action-main">
                <span className="snoopy-action-icon"><MiniIcon name={action.icon} /></span>
                <span className="snoopy-action-label">{action.label}</span>
              </span>
              <span className="snoopy-action-copy">{action.copy}</span>
              <span className="snoopy-action-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>

        <div className="snoopy-stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className={`snoopy-stat-card snoopy-stat-card--${stat.accent}`}>
              <span className="snoopy-stat-halftone" aria-hidden="true" />
              <div className="snoopy-stat-value">{stat.value}</div>
              <p className="snoopy-stat-label">{stat.label}</p>
              <p className="snoopy-stat-copy">{stat.description}</p>
              <span className="snoopy-stat-doodle" aria-hidden="true">✿</span>
            </div>
          ))}
        </div>
      </div>

      <div className="snoopy-grass-line" aria-hidden="true" />
      <div className="snoopy-flight-trail" aria-hidden="true" />
    </section>
  );
}
