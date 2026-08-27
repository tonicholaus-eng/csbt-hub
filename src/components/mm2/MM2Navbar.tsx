"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "values" | "calculator" | "exchange" | "opinions" | "lounge";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  sublabel: string;
  icon: IconName;
};

function NavIcon({ name }: { name: IconName }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 11 8-7 8 7" />
        <path d="M6.5 10v10h11V10M10 20v-6h4v6" />
      </svg>
    );
  }

  if (name === "values") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 19 8-8M13 11l5-6 1 1-6 5" />
        <path d="m7 17-2-2M9 15l-2-2" />
      </svg>
    );
  }

  if (name === "calculator") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v16M5 7h14" />
        <path d="M7 7 4 13h6L7 7ZM17 7l-3 6h6l-3-6Z" />
        <path d="M8 20h8" />
      </svg>
    );
  }

  if (name === "exchange") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h12M13 5l3 3-3 3" />
        <path d="M20 16H8M11 13l-3 3 3 3" />
      </svg>
    );
  }

  if (name === "opinions") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5.5h14v10H9l-4 3v-13Z" />
        <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="17" cy="10" r="2.2" />
      <path d="M3 20c.5-4.2 2.4-6.3 5.5-6.3S13.5 15.8 14 20M14 15.5c3.4-.3 5.5 1.2 6.5 4.5" />
    </svg>
  );
}

function activeFor(pathname: string, href: string) {
  if (href === "/mm2") return pathname === "/mm2";
  if (href === "/mm2/values") {
    return pathname.startsWith("/mm2/values") || pathname.startsWith("/mm2/demand");
  }
  return pathname.startsWith(href);
}

const mainLinks: NavItem[] = [
  { href: "/mm2", label: "Home", shortLabel: "Home", sublabel: "Command Deck", icon: "home" },
  { href: "/mm2/values", label: "Weapon Values", shortLabel: "Values", sublabel: "Values & Demand", icon: "values" },
  { href: "/mm2/calculator", label: "Trade Calculator", shortLabel: "Calculator", sublabel: "Build & Analyze", icon: "calculator" },
];

const communityLinks: NavItem[] = [
  { href: "/mm2/exchange", label: "CSBT Exchange", shortLabel: "Exchange", sublabel: "Listings & Offers", icon: "exchange" },
  { href: "/mm2/trade-opinions", label: "Trade Opinions", shortLabel: "Opinions", sublabel: "Community W / F / L", icon: "opinions" },
  { href: "/mm2/lounge", label: "CSBT Lounge", shortLabel: "Lounge", sublabel: "Community Room", icon: "lounge" },
];

const allLinks = [...mainLinks, ...communityLinks];

function RailGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-2.5 px-3 text-[10px] font-black uppercase tracking-[.18em] text-[var(--mm2-ink-4)]">
      <span className="h-px w-4 bg-[var(--mm2-crimson)]/40" />
      {children}
    </div>
  );
}

function DesktopNavLink({ pathname, item }: { pathname: string; item: NavItem }) {
  const active = activeFor(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-[64px] items-center gap-3.5 overflow-hidden border-y border-transparent px-3 py-2.5 transition ${
        active
          ? "border-white/[0.055] bg-[linear-gradient(90deg,rgba(104,12,29,.34),rgba(15,11,16,.58)_60%,rgba(5,7,10,.18))] shadow-[inset_3px_0_0_var(--mm2-crimson),inset_0_1px_0_rgba(255,255,255,.025)]"
          : "border-b-white/[0.025] hover:border-b-white/[0.05] hover:bg-white/[0.022]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border transition ${
          active
            ? "border-[var(--mm2-edge-lit)] bg-[linear-gradient(145deg,rgba(179,20,42,.20),rgba(26,8,13,.28))] text-[#ffd7dc] shadow-[0_0_22px_rgba(214,35,57,.12)]"
            : "border-white/[0.07] bg-[linear-gradient(145deg,rgba(255,255,255,.03),rgba(0,0,0,.10))] text-[var(--mm2-ink-3)] group-hover:border-[var(--mm2-edge-lit)] group-hover:text-[var(--mm2-crimson-lift)]"
        }`}
      >
        <span className="h-[21px] w-[21px] [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]">
          <NavIcon name={item.icon} />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <strong
          className={`block truncate text-[13.5px] font-black tracking-[-.01em] ${
            active ? "text-white" : "text-[var(--mm2-ink-2)] group-hover:text-white"
          }`}
        >
          {item.label}
        </strong>
        <small
          className={`mt-0.5 block truncate text-[11px] font-semibold ${
            active ? "text-[#e6a6b0]" : "text-[var(--mm2-ink-4)]"
          }`}
        >
          {item.sublabel}
        </small>
      </span>
    </Link>
  );
}

export default function MM2Navbar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="mm2-control-rail fixed inset-y-0 left-0 z-50 hidden w-[288px] flex-col overflow-y-auto border-r border-white/[0.045] bg-[linear-gradient(180deg,#05070a,#030509_48%,#05070a)] lg:flex">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_50%_0%,rgba(135,13,32,.11),transparent_66%)]" />

        <div className="relative border-b border-white/[0.035] px-5 pb-5 pt-5">
          <Link href="/mm2" className="group flex items-center gap-3.5 py-2">
            <span className="relative flex h-[54px] w-[54px] shrink-0 overflow-hidden rounded-[12px] border border-[var(--mm2-edge-lit)] bg-black/35 shadow-[0_0_28px_rgba(150,15,35,.10)]">
              <Image src="/logo.png" alt="CSBT HUB" fill className="object-cover" sizes="54px" priority />
            </span>
            <span className="min-w-0">
              <strong className="block text-[21px] font-black leading-none tracking-[-.045em] text-white">
                <span className="text-[var(--mm2-crimson-text)]">CSBT</span> HUB
              </strong>
              <small className="mt-1.5 block text-[10px] font-black uppercase tracking-[.15em] text-[var(--mm2-ink-4)]">
                MM2 Trading HQ
              </small>
            </span>
          </Link>
        </div>

        <nav className="relative px-4 py-4">
          <RailGroupLabel>Trading Operations</RailGroupLabel>
          <div>
            {mainLinks.map((item) => (
              <DesktopNavLink key={item.href} pathname={pathname} item={item} />
            ))}
          </div>

          <div className="mt-5">
            <RailGroupLabel>Community Network</RailGroupLabel>
          </div>
          <div>
            {communityLinks.map((item) => (
              <DesktopNavLink key={item.href} pathname={pathname} item={item} />
            ))}
          </div>
        </nav>

        <div className="relative mt-auto border-t border-white/[0.035] px-5 pb-5 pt-4">
          <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[.15em] text-[var(--mm2-ink-4)]">
            <span>Game Network</span>
            <span className="text-[var(--mm2-crimson-text)]">MM2 Active</span>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-[12px] border border-white/[0.075] bg-black/30">
            <Link
              href="/"
              className="flex min-h-[46px] items-center justify-center text-[12px] font-black text-[var(--mm2-ink-3)] transition hover:bg-white/[0.04] hover:text-white"
            >
              ADM
            </Link>
            <Link
              href="/mm2"
              aria-current="page"
              className="flex min-h-[46px] items-center justify-center border-l border-[var(--mm2-edge-lit)] bg-[linear-gradient(135deg,rgba(105,11,28,.6),rgba(168,18,39,.32))] text-[12px] font-black text-[#ffd7dc] shadow-[inset_0_0_20px_rgba(224,37,59,.07)]"
            >
              MM2
            </Link>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#04060a]/96 shadow-[0_14px_32px_rgba(0,0,0,.30)] backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-3 pt-2.5">
          <Link href="/mm2" className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-[9px] border border-[var(--mm2-edge-lit)] bg-black/30">
              <Image src="/logo.png" alt="CSBT HUB" fill className="object-cover" sizes="36px" />
            </span>
            <strong className="truncate text-[15px] font-black leading-none tracking-[-.04em] text-white">
              <span className="text-[var(--mm2-crimson-text)]">CSBT</span> HUB
            </strong>
          </Link>

          <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-[10px] border border-white/[0.075] bg-black/30">
            <Link
              href="/"
              className="flex min-h-[34px] min-w-[46px] items-center justify-center text-[11px] font-black text-[var(--mm2-ink-3)]"
            >
              ADM
            </Link>
            <Link
              href="/mm2"
              aria-current="page"
              className="flex min-h-[34px] min-w-[46px] items-center justify-center border-l border-[var(--mm2-edge-lit)] bg-[linear-gradient(135deg,rgba(105,11,28,.6),rgba(168,18,39,.32))] text-[11px] font-black text-[#ffd7dc]"
            >
              MM2
            </Link>
          </div>
        </div>

        <nav aria-label="MM2 sections" className="relative">
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 pb-2.5 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allLinks.map((item) => {
              const active = activeFor(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-[11px] border px-3 text-[12px] font-black transition ${
                    active
                      ? "border-[var(--mm2-edge-lit)] bg-[linear-gradient(135deg,rgba(105,11,28,.5),rgba(168,18,39,.24))] text-[#ffd7dc]"
                      : "border-white/[0.07] bg-white/[0.025] text-[var(--mm2-ink-3)]"
                  }`}
                >
                  <span className="h-[15px] w-[15px] [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.7] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]">
                    <NavIcon name={item.icon} />
                  </span>
                  {item.shortLabel}
                </Link>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-[linear-gradient(90deg,transparent,#04060a)]"
          />
        </nav>
      </div>
    </>
  );
}
