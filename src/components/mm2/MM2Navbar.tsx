"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthSession } from "../../hooks/useAuthSession";

type IconName = "home" | "values" | "calculator" | "radar" | "nich" | "exchange" | "opinions" | "lounge";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  sublabel: string;
  icon: IconName;
};

function NavIcon({ name }: { name: IconName }) {
  if (name === "home") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7"/><path d="M6.5 10v10h11V10M10 20v-6h4v6"/></svg>;
  }
  if (name === "values") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 19 8-8M13 11l5-6 1 1-6 5"/><path d="m7 17-2-2M9 15l-2-2"/></svg>;
  }
  if (name === "calculator") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M5 7h14"/><path d="M7 7 4 13h6L7 7ZM17 7l-3 6h6l-3-6Z"/><path d="M8 20h8"/></svg>;
  }
  if (name === "radar") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/></svg>;
  }
  if (name === "nich") {
    // A processing core: a chip die with traces running out of it. Matches the
    // stroked, 24px, 1.6-weight set the rest of the rail uses.
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="8" height="8" rx="1"/><path d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3"/></svg>;
  }
  if (name === "exchange") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h12M13 5l3 3-3 3"/><path d="M20 16H8M11 13l-3 3 3 3"/></svg>;
  }
  if (name === "opinions") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H9l-4 3v-13Z"/><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01"/></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3 20c.5-4.2 2.4-6.3 5.5-6.3S13.5 15.8 14 20M14 15.5c3.4-.3 5.5 1.2 6.5 4.5"/></svg>;
}

function activeFor(pathname: string, href: string) {
  if (href === "/mm2") return pathname === "/mm2";
  return pathname.startsWith(href);
}

const commandLinks: NavItem[] = [
  { href: "/mm2", label: "Home", shortLabel: "Home", sublabel: "Command Terminal", icon: "home" },
  { href: "/mm2/values", label: "Weapon Values", shortLabel: "Values", sublabel: "Values & Inventory", icon: "values" },
  { href: "/mm2/calculator", label: "Trade Calculator", shortLabel: "Calculator", sublabel: "Build & Analyze", icon: "calculator" },
  { href: "/mm2/demand", label: "Market Radar", shortLabel: "Radar", sublabel: "Demand Intelligence", icon: "radar" },
  // NICH is a core MM2 trading tool, not a community feature: it answers value,
  // demand and W/F/L questions from the same catalog the other four read.
  { href: "/mm2/nich", label: "NICH", shortLabel: "Nich", sublabel: "MM2 Intelligence", icon: "nich" },
  { href: "/mm2/exchange", label: "CSBT Exchange", shortLabel: "Exchange", sublabel: "Listings & Offers", icon: "exchange" },
];

const communityLinks: NavItem[] = [
  { href: "/mm2/trade-opinions", label: "Trade Opinions", shortLabel: "Opinions", sublabel: "Community W / F / L", icon: "opinions" },
  { href: "/mm2/lounge", label: "CSBT Lounge", shortLabel: "Lounge", sublabel: "Community Room", icon: "lounge" },
];

const allLinks = [...commandLinks, ...communityLinks];

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-3 text-[9px] font-black uppercase tracking-[.19em] text-[#747b88]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#e3314b]/80 shadow-[0_0_10px_rgba(227,49,75,.45)]" />
      {children}
      <span className="h-px flex-1 bg-[linear-gradient(90deg,rgba(255,255,255,.065),transparent)]" />
    </div>
  );
}

function DesktopLink({ pathname, item }: { pathname: string; item: NavItem }) {
  const active = activeFor(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group relative grid min-h-[54px] grid-cols-[36px_minmax(0,1fr)_14px] items-center gap-3 overflow-hidden px-3 py-2 transition [clip-path:polygon(0_0,calc(100%-9px)_0,100%_9px,100%_100%,0_100%)] ${
        active
          ? "border-y border-white/[0.035] border-r border-transparent bg-[linear-gradient(90deg,rgba(154,16,37,.34),rgba(54,10,20,.42)_50%,transparent_94%)] shadow-[inset_2px_0_0_#ef334f,-10px_0_28px_rgba(194,22,48,.055)]"
          : "border-y border-transparent border-r border-transparent bg-transparent hover:border-y-white/[0.028] hover:bg-[linear-gradient(90deg,rgba(255,255,255,.022),transparent_84%)]"
      }`}
    >
      <span className={`pointer-events-none absolute left-0 top-0 h-full w-px ${active ? "bg-[linear-gradient(180deg,transparent,rgba(239,51,79,.8),transparent)]" : "bg-[linear-gradient(180deg,transparent,rgba(255,255,255,.05),transparent)] opacity-0 group-hover:opacity-100"}`} />
      <span className={`flex h-8 w-8 items-center justify-center border [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)] ${active ? "border-[#f14a61]/24 bg-[#8f1429]/16 text-[#ffd5da] shadow-[0_0_18px_rgba(239,51,79,.07)]" : "border-white/[0.045] bg-black/15 text-[#818a97] group-hover:border-white/[0.07] group-hover:text-[#e87c8a]"}`}>
        <span className="h-[19px] w-[19px] [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]"><NavIcon name={item.icon}/></span>
      </span>
      <span className="min-w-0">
        <strong className={`block truncate text-[12px] font-black tracking-[-.015em] ${active ? "text-white" : "text-[#c1c6ce] group-hover:text-white"}`}>{item.label}</strong>
        <small className={`mt-0.5 block truncate text-[9px] font-semibold ${active ? "text-[#e8a5af]" : "text-[#6f7784]"}`}>{item.sublabel}</small>
      </span>
      <span className={`text-[12px] font-black transition ${active ? "text-[#ef596b]" : "text-[#3d434d] group-hover:translate-x-0.5 group-hover:text-[#9d4653]"}`}>›</span>
    </Link>
  );
}

export default function MM2Navbar() {
  const pathname = usePathname();
  const { user, loading } = useAuthSession();
  const operatorName = user?.user_metadata?.display_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Guest Operator";

  return (
    <>
      <aside className="mm2-control-rail fixed inset-y-0 left-0 z-50 hidden w-[288px] flex-col overflow-y-auto border-r border-white/[0.045] bg-[radial-gradient(ellipse_at_26%_0%,rgba(142,14,34,.15),transparent_28%),radial-gradient(ellipse_at_100%_18%,rgba(47,69,107,.09),transparent_34%),linear-gradient(180deg,rgba(6,8,12,.80)_0%,rgba(3,5,8,.74)_48%,rgba(6,7,11,.80)_100%)] shadow-[28px_0_80px_rgba(0,0,0,.48)] backdrop-blur-[14px] lg:flex">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,rgba(255,255,255,.015),transparent)]" />
        <div className="pointer-events-none absolute left-[14px] top-0 h-full w-px bg-[linear-gradient(180deg,transparent,rgba(236,47,72,.18)_18%,rgba(236,47,72,.05)_62%,transparent)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-px bg-[linear-gradient(180deg,transparent,rgba(236,47,72,.18)_24%,rgba(236,47,72,.04)_70%,transparent)] shadow-[8px_0_24px_rgba(166,13,35,.08)]" />

        <div className="relative px-5 pb-5 pt-4">
          <div className="mb-3 flex items-center gap-2 pl-1 text-[8px] font-black uppercase tracking-[.18em] text-[#6f7784]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#42c56b] shadow-[0_0_10px_rgba(66,197,107,.55)]" />
            Command Deck Online
          </div>
          <Link href="/mm2" className="group flex items-center gap-3.5 border-b border-white/[0.045] pb-5">
            <span className="relative flex h-[56px] w-[56px] shrink-0 overflow-hidden border border-[#ed3a54]/25 bg-black/40 shadow-[0_0_28px_rgba(192,20,45,.12)] [clip-path:polygon(0_0,calc(100%-9px)_0,100%_9px,100%_100%,0_100%)]">
              <Image src="/logo.png" alt="CSBT HUB" fill className="object-cover" sizes="56px" priority />
            </span>
            <span className="min-w-0">
              <strong className="block text-[21px] font-black leading-none tracking-[-.045em] text-white"><span className="text-[#ed344e]">CSBT</span> HUB</strong>
              <small className="mt-1.5 block text-[9px] font-black uppercase tracking-[.17em] text-[#747b88]">MM2 Trading HQ</small>
            </span>
          </Link>
        </div>

        <nav className="relative px-4 pb-4">
          <GroupLabel>Command Deck</GroupLabel>
          <div>{commandLinks.map((item) => <DesktopLink key={item.href} pathname={pathname} item={item} />)}</div>

          <div className="mt-5"><GroupLabel>Community</GroupLabel></div>
          <div>{communityLinks.map((item) => <DesktopLink key={item.href} pathname={pathname} item={item} />)}</div>
        </nav>

        <div className="relative mt-auto px-5 pb-5 pt-4">
          <Link href="/profile" className="mb-3 grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/[0.055] border-r border-white/[0.05] border-b border-white/[0.04] bg-[linear-gradient(145deg,rgba(16,20,27,.66),rgba(5,7,10,.78))] p-3 transition hover:border-[#e23c55]/20 [clip-path:polygon(0_0,calc(100%-9px)_0,100%_9px,100%_100%,0_100%)]">
            <span className="flex h-8 w-8 items-center justify-center border border-[#e33b54]/16 bg-[#841126]/14 text-[12px] font-black text-[#f08b98]">{operatorName.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0">
              <strong className="block truncate text-[11px] font-black text-[#d7dbe1]">{loading ? "Checking operator…" : operatorName}</strong>
              <small className="mt-0.5 block truncate text-[8px] font-bold uppercase tracking-[.09em] text-[#6f7784]">{user ? "CSBT operator · Profile" : "Guest mode · Profile"}</small>
            </span>
            <span className="text-[11px] font-black text-[#6e7683]">›</span>
          </Link>

          <div className="mb-3 border-t border-white/[0.055] border-r border-white/[0.05] border-b border-white/[0.04] bg-[linear-gradient(145deg,rgba(16,20,27,.62),rgba(5,7,10,.76))] p-3 [clip-path:polygon(0_0,calc(100%-9px)_0,100%_9px,100%_100%,0_100%)]">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[.14em] text-[#757d8a]"><span>System Status</span><span className="text-[#70c88c]">Local</span></div>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-[#cbd0d7]"><i className="h-1.5 w-1.5 rounded-full bg-[#43c66b] shadow-[0_0_10px_rgba(67,198,107,.7)]"/> MM2 COMMAND DECK READY</div>
          </div>

          <div className="mb-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[.15em] text-[#737b88]"><span>Game Mode</span><span className="text-[#ec4b60]">MM2 Active</span></div>
          <div className="grid grid-cols-2 overflow-hidden border-t border-white/[0.075] border-r border-white/[0.06] border-b border-white/[0.045] bg-black/30 [clip-path:polygon(0_0,calc(100%-9px)_0,100%_9px,100%_100%,0_100%)]">
            <Link href="/" className="flex min-h-[44px] items-center justify-center text-[11px] font-black text-[#858d9a] transition hover:bg-white/[0.035] hover:text-white">ADM</Link>
            <Link href="/mm2" aria-current="page" className="flex min-h-[44px] items-center justify-center border-l border-[#e33b54]/24 bg-[linear-gradient(135deg,rgba(105,11,28,.68),rgba(168,18,39,.35))] text-[11px] font-black text-[#ffd6dc] shadow-[inset_0_0_20px_rgba(224,37,59,.08)]">MM2</Link>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#04060a]/96 shadow-[0_14px_32px_rgba(0,0,0,.30)] backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-3 pt-2.5">
          <Link href="/mm2" className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-9 w-9 shrink-0 overflow-hidden border border-[#e23a53]/25 bg-black/30 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)]"><Image src="/logo.png" alt="CSBT HUB" fill className="object-cover" sizes="36px"/></span>
            <strong className="truncate text-[15px] font-black leading-none tracking-[-.04em] text-white"><span className="text-[#ed344e]">CSBT</span> HUB</strong>
          </Link>
          <div className="grid shrink-0 grid-cols-2 overflow-hidden border border-white/[0.075] bg-black/30 [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)]">
            <Link href="/" className="flex min-h-[34px] min-w-[46px] items-center justify-center text-[10px] font-black text-[#858d9a]">ADM</Link>
            <Link href="/mm2" aria-current="page" className="flex min-h-[34px] min-w-[46px] items-center justify-center border-l border-[#e23a53]/24 bg-[#8e1228]/45 text-[10px] font-black text-[#ffd5da]">MM2</Link>
          </div>
        </div>
        <nav aria-label="MM2 sections" className="relative">
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2.5 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allLinks.map((item) => {
              const active = activeFor(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} aria-label={item.label} className={`flex min-h-10 shrink-0 items-center gap-1.5 border px-3 text-[11px] font-black transition [clip-path:polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,0_100%)] ${active ? "border-[#e23b54]/28 bg-[#8e1228]/42 text-[#ffd6db]" : "border-white/[0.06] bg-white/[0.02] text-[#868e9a]"}`}>
                  <span className="h-[14px] w-[14px] [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.7] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]"><NavIcon name={item.icon}/></span>
                  {item.shortLabel}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
