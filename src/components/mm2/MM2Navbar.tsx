"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "values" | "calculator" | "exchange" | "opinions" | "lounge";

type NavItem = {
  href: string;
  label: string;
  sublabel: string;
  icon: IconName;
  code: string;
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
  { href: "/mm2", label: "Home", sublabel: "Command Deck", icon: "home", code: "00" },
  { href: "/mm2/values", label: "Weapon Values", sublabel: "Values & Demand", icon: "values", code: "01" },
  { href: "/mm2/calculator", label: "Trade Calculator", sublabel: "Build & Analyze", icon: "calculator", code: "02" },
];

const communityLinks: NavItem[] = [
  { href: "/mm2/exchange", label: "CSBT Exchange", sublabel: "Listings & Offers", icon: "exchange", code: "03" },
  { href: "/mm2/trade-opinions", label: "Trade Opinions", sublabel: "Community W / F / L", icon: "opinions", code: "04" },
  { href: "/mm2/lounge", label: "CSBT Lounge", sublabel: "Community Room", icon: "lounge", code: "05" },
];

function DesktopNavLink({ pathname, item }: { pathname: string; item: NavItem }) {
  const active = activeFor(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-[68px] items-center gap-3 overflow-hidden border-y border-transparent px-3 py-2.5 transition ${
        active
          ? "border-white/[0.055] bg-[linear-gradient(90deg,rgba(104,12,29,.34),rgba(15,11,16,.58)_60%,rgba(5,7,10,.18))] shadow-[inset_3px_0_0_rgba(240,55,77,.8),inset_0_1px_0_rgba(255,255,255,.025)]"
          : "border-b-white/[0.025] hover:border-b-white/[0.05] hover:bg-white/[0.018]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center border transition ${
          active
            ? "border-red-400/20 bg-[linear-gradient(145deg,rgba(179,20,42,.16),rgba(26,8,13,.25))] text-red-100 shadow-[0_0_20px_rgba(214,35,57,.08)]"
            : "border-white/[0.045] bg-[linear-gradient(145deg,rgba(255,255,255,.022),rgba(0,0,0,.08))] text-zinc-600 group-hover:border-red-400/10 group-hover:text-red-300/80"
        }`}
      >
        <span className="h-[21px] w-[21px] [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]">
          <NavIcon name={item.icon} />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <strong className={`block truncate text-[12px] font-black ${active ? "text-white" : "text-zinc-300"}`}>
            {item.label}
          </strong>
          <span className={`text-[7px] font-black tracking-[.12em] ${active ? "text-red-300/65" : "text-zinc-800 group-hover:text-zinc-700"}`}>
            {item.code}
          </span>
        </span>
        <small className={`mt-0.5 block truncate text-[9px] font-semibold ${active ? "text-red-100/45" : "text-zinc-700"}`}>
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
        <div className="pointer-events-none absolute right-0 top-[14%] h-[57%] w-px bg-[linear-gradient(180deg,transparent,rgba(228,43,66,.15)_22%,rgba(228,43,66,.035)_68%,transparent)] shadow-[7px_0_24px_rgba(160,12,34,.08)]" />

        <div className="relative border-b border-white/[0.035] px-5 pb-5 pt-5">
          <Link href="/mm2" className="group flex items-center gap-3.5 py-2">
            <span className="relative flex h-[58px] w-[58px] shrink-0 overflow-hidden border border-red-400/12 bg-black/35 shadow-[0_0_28px_rgba(150,15,35,.08)]">
              <Image src="/logo.png" alt="CSBT HUB" fill className="object-cover" sizes="58px" priority />
            </span>
            <span className="min-w-0">
              <span className="block text-[8px] font-black uppercase tracking-[.18em] text-red-400/55">Secure Market System</span>
              <strong className="mt-1 block text-[20px] font-black tracking-[-.045em] text-white"><span className="text-red-400">CSBT</span> HUB</strong>
              <small className="mt-1 block text-[8px] font-black uppercase tracking-[.16em] text-zinc-600">MM2 Trading Headquarters</small>
            </span>
          </Link>
        </div>

        <nav className="relative px-4 py-4">
          <div className="mb-2 flex items-center gap-2 px-3 text-[7px] font-black uppercase tracking-[.23em] text-zinc-700">
            <span className="h-px w-5 bg-red-500/25" /> Trading Operations
          </div>
          <div>
            {mainLinks.map((item) => <DesktopNavLink key={item.href} pathname={pathname} item={item} />)}
          </div>

          <div className="mb-2 mt-5 flex items-center gap-2 px-3 text-[7px] font-black uppercase tracking-[.23em] text-zinc-700">
            <span className="h-px w-5 bg-red-500/25" /> Community Network
          </div>
          <div>
            {communityLinks.map((item) => <DesktopNavLink key={item.href} pathname={pathname} item={item} />)}
          </div>
        </nav>

        <div className="relative mt-auto border-t border-white/[0.035] px-5 pb-5 pt-4">
          <div className="mb-2 flex items-center justify-between text-[7px] font-black uppercase tracking-[.17em] text-zinc-700">
            <span>Game Network</span><span>MM2 ACTIVE</span>
          </div>
          <div className="grid grid-cols-2 overflow-hidden border border-white/[0.055] bg-black/30">
            <Link href="/" className="flex min-h-[45px] items-center justify-center text-[10px] font-black text-zinc-600 transition hover:bg-white/[0.025] hover:text-zinc-300">ADM</Link>
            <Link href="/mm2" className="flex min-h-[45px] items-center justify-center border-l border-red-500/15 bg-[linear-gradient(135deg,rgba(105,11,28,.55),rgba(168,18,39,.28))] text-[10px] font-black text-red-100 shadow-[inset_0_0_20px_rgba(224,37,59,.055)]">MM2</Link>
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-50 border-b border-white/[0.055] bg-[#04060a]/96 px-3 py-2.5 shadow-[0_14px_32px_rgba(0,0,0,.30)] backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/mm2" className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-9 w-9 shrink-0 overflow-hidden border border-red-400/12 bg-black/30">
              <Image src="/logo.png" alt="CSBT HUB" fill className="object-cover" sizes="36px" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-[12px] font-black text-white"><span className="text-red-400">CSBT</span> HUB</strong>
              <small className="block text-[7px] font-black uppercase tracking-[.14em] text-zinc-600">MM2 Command Deck</small>
            </span>
          </Link>

          <div className="flex items-center gap-1 overflow-x-auto">
            {[...mainLinks, ...communityLinks].map((item) => {
              const active = activeFor(pathname, item.href);
              const label = item.label === "Weapon Values" ? "Values" : item.label === "Trade Calculator" ? "Calc" : item.label === "CSBT Exchange" ? "Exchange" : item.label === "Trade Opinions" ? "Opinions" : item.label === "CSBT Lounge" ? "Lounge" : "Home";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={`flex h-8 min-w-8 items-center justify-center border px-2 text-[8px] font-black transition ${active ? "border-red-500/30 bg-red-500/10 text-red-100" : "border-white/[0.045] bg-white/[0.018] text-zinc-600"}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
