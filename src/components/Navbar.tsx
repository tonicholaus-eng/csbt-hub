"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import { useCSBTTheme } from "./ThemeProvider";
import AppearanceSelector from "./theme/AppearanceSelector";
import { CSBT_THEMES } from "../lib/theme";
import GameModeSwitch from "./games/GameModeSwitch";
import { useBirthdayEventActive } from "../hooks/useBirthdayEventActive";
import { openBirthdayEvent } from "../config/birthdayEvent";
import { BirthdayGift, PartyHat } from "./birthday/BirthdayIcons";

import {
  mobilePrimaryLinks,
  navGroups,
  SIDEBAR_GROUP_STORAGE_KEY,
  type CSBTNavGroup,
  type CSBTNavLink,
  type NavBadge,
  type NavIconName,
} from "../lib/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((group) => [group.id, group.defaultOpen])),
  );
  const { theme, mounted } = useCSBTTheme();
  const unread = useUnreadNotifications();
  const birthdayActive = useBirthdayEventActive();
  const tourGroupSnapshot = useRef<Record<string, boolean> | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_GROUP_STORAGE_KEY);
      if (saved) queueMicrotask(() => setOpenGroups((current) => ({ ...current, ...JSON.parse(saved) })));
    } catch {
      // Sidebar still works when storage is unavailable.
    }
  }, []);
  useEffect(() => queueMicrotask(() => setMoreOpen(false)), [pathname]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setMoreOpen(Boolean(detail?.open));
    };
    window.addEventListener("csbt-tour-more", handler as EventListener);
    return () => window.removeEventListener("csbt-tour-more", handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ groupId?: string; action?: "open" | "restore" }>).detail;
      if (detail?.action === "restore") {
        if (tourGroupSnapshot.current) {
          const snapshot = tourGroupSnapshot.current;
          tourGroupSnapshot.current = null;
          setOpenGroups(snapshot);
        }
        return;
      }
      if (detail?.action === "open" && detail.groupId) {
        setOpenGroups((current) => {
          if (!tourGroupSnapshot.current) tourGroupSnapshot.current = { ...current };
          return { ...current, [detail.groupId!]: true };
        });
      }
    };
    window.addEventListener("csbt-tour-sidebar-group", handler as EventListener);
    return () => window.removeEventListener("csbt-tour-sidebar-group", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [moreOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") setMoreOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const activeGroupId = navGroups.find((group) => group.links.some((link) => active(link.href)))?.id;

  useEffect(() => {
    if (!activeGroupId) return;
    queueMicrotask(() => setOpenGroups((current) => current[activeGroupId] ? current : { ...current, [activeGroupId]: true }));
  }, [activeGroupId]);

  function toggleGroup(id: string) {
    setOpenGroups((current) => {
      const next = { ...current, [id]: !current[id] };
      try { window.localStorage.setItem(SIDEBAR_GROUP_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <>
      <aside data-tour="sidebar-container" className="fixed inset-y-0 left-0 z-50 hidden w-[268px] p-3 lg:block" aria-label="CSBT HUB sidebar">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-md)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
            <span className="relative shrink-0"><Image src="/logo.png" alt="" width={52} height={52} className="h-[52px] w-[52px] rounded-full object-cover shadow-sm" />{birthdayActive && <PartyHat aria-hidden="true" className="birthday-logo-hat h-7 w-7" />}</span>
            <div className="min-w-0"><span className="block truncate text-[17px] font-black tracking-[-.035em] text-[var(--foreground)]">CSBT HUB</span><span className="block truncate text-[10px] font-bold uppercase tracking-[.12em] text-[var(--gold-dark)] dark:text-[var(--gold-bright)]">Adopt Me trading hub</span></div>
          </Link>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {navGroups.map((group) => (
              <NavGroup
                key={group.id}
                group={group}
                open={Boolean(openGroups[group.id])}
                onToggle={() => toggleGroup(group.id)}
                active={active}
                unread={unread}
              />
            ))}
          </div>

          <div className="border-t border-[var(--border)] p-3">
            <div className="grid gap-2.5">
              {/* The game switch lives in the shared rail, not in a hero, so it
                  survives every appearance and every page. */}
              <GameModeSwitch variant="rail" />
              <button type="button" onClick={() => setAppearanceOpen(true)} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-[var(--surface-3)] px-3.5 text-left text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]" aria-label="Choose CSBT appearance">
                <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-base">{mounted ? CSBT_THEMES[theme].icon : "🌙"}</span><span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[.13em] text-[var(--foreground-muted)]">Appearance</span><span className="block truncate text-xs font-black">{mounted ? CSBT_THEMES[theme].label : "CSBT Dark"}</span></span></span><span aria-hidden="true" className="text-sm text-[var(--foreground-muted)]">›</span>
              </button>
              <a href="https://www.facebook.com/groups/5352107604807631" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--surface-3)] px-4 text-sm font-black text-[var(--foreground)]">Join CSBT →</a>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-50 px-3 py-2.5 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[16px] border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 shadow-[0_10px_35px_rgba(15,23,42,.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="CSBT HUB home">
            <span className="relative shrink-0"><Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />{birthdayActive && <PartyHat aria-hidden="true" className="birthday-logo-hat birthday-logo-hat--mobile h-6 w-6" />}</span>
            {/* Below 380px the header carries a logo, the game switch and three
                controls; the wordmark is the one element that can go without
                losing a destination. */}
            <div className="hidden min-w-0 [@media(min-width:380px)]:block"><span className="block truncate text-base font-black text-amber-900 dark:text-amber-300">CSBT HUB</span><span className="block truncate text-[10px] font-bold text-slate-400">Adopt Me trading hub</span></div>
          </Link>
          <div className="flex items-center gap-1.5">
            {/* Mirrors the MM2 header so the switch is one tap away at every
                width, in both games, without opening a drawer. */}
            <GameModeSwitch variant="compact" className="mr-0.5" />
            <button type="button" data-tour="nav-more" onClick={() => setMoreOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10" aria-label="More navigation"><NavIcon name="more" /></button>
            <Link href="/notifications" aria-label="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"><NavIcon name="notifications" />{unread > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-black leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}</Link>
            <Link href="/profile" aria-label="My profile" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"><NavIcon name="profile" /></Link>
          </div>
        </div>
      </header>

      <nav data-tour="mobile-dock" className="fixed inset-x-0 bottom-0 z-[70] border-t border-[var(--border)] bg-[var(--surface-1)] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(15,23,42,.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/96 lg:hidden" aria-label="Mobile primary navigation">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {mobilePrimaryLinks.map((link) => <MobileDockLink key={link.href} link={link} active={active(link.href)} />)}
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[85] lg:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
          <button type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div data-tour="mobile-more-panel" className="absolute inset-x-2 bottom-[calc(76px+env(safe-area-inset-bottom))] max-h-[min(76vh,680px)] overflow-y-auto rounded-[22px] border border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-[var(--shadow-lg)] sm:inset-x-4">
            <div className="flex items-center justify-between px-1 pb-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Navigation</p><h2 className="text-lg font-black text-slate-950 dark:text-white">Where do you want to go?</h2></div><button type="button" onClick={() => setMoreOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--surface-3)] text-xl font-black text-[var(--foreground)]">×</button></div>
            <div className="space-y-4">
              {navGroups.map((group) => (
                <section key={group.id}>
                  <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--foreground-muted)]">{group.title}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.links.map((link) => <MobileMenuLink key={link.href} link={link} active={active(link.href)} unread={unread} />)}
                  </div>
                </section>
              ))}
            </div>
            {birthdayActive && <button type="button" onClick={() => { setMoreOpen(false); openBirthdayEvent("main"); }} className="birthday-mobile-menu-event mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] px-3 text-xs font-black"><BirthdayGift className="h-4 w-4"/> Birthday Event</button>}
            <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setMoreOpen(false); setAppearanceOpen(true); }} className="min-h-12 rounded-[var(--radius-control)] bg-[var(--surface-3)] px-3 text-xs font-black text-[var(--foreground)]">🎨 Appearance</button><a href="https://www.facebook.com/groups/5352107604807631" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary-button)] px-3 text-xs font-black text-[var(--primary-button-text)]">Join CSBT</a></div>
          </div>
        </div>
      )}
      <AppearanceSelector open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </>
  );
}

function NavGroup({ group, open, onToggle, active, unread }: { group: CSBTNavGroup; open: boolean; onToggle: () => void; active: (href: string) => boolean; unread: number }) {
  return (
    <section className="mb-2 last:mb-0">
      <button type="button" data-tour={group.tour} onClick={onToggle} className="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.16em] text-[var(--foreground-muted)] transition hover:bg-slate-100/80 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300" aria-expanded={open}>
        <span>{group.title}</span><span className={`text-sm transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="mt-1 space-y-1">{group.links.map((link) => <DesktopCSBTNavLink key={link.href} link={link} selected={active(link.href)} unread={unread} />)}</div>}
    </section>
  );
}

function DesktopCSBTNavLink({ link, selected, unread }: { link: CSBTNavLink; selected: boolean; unread: number }) {
  return <Link href={link.href} data-tour={link.tour} aria-current={selected ? "page" : undefined} className={`group relative flex items-center gap-3 rounded-[13px] px-3 py-2.5 transition ${selected ? "bg-[var(--surface-selected)] text-[var(--foreground)] shadow-sm before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-[var(--gold)]" : "text-[var(--foreground-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"}`}>
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-3)] transition group-hover:scale-[1.03]"><NavIcon name={link.icon} />{link.icon === "notifications" && unread > 0 && <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-black leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}</span>
    <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-sm font-black">{link.label}</span>{link.badge && <Badge type={link.badge} />}</span><span className="mt-0.5 block truncate text-[10px] font-semibold opacity-55">{link.description}</span></span>
  </Link>;
}

function Badge({ type }: { type: NavBadge }) {
  return <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black tracking-[0.08em] ${type === "SMART" ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"}`}>{type}</span>;
}

function MobileMenuLink({ link, active, unread }: { link: CSBTNavLink; active: boolean; unread: number }) {
  return <Link href={link.href} data-tour={link.tour} aria-current={active ? "page" : undefined} className={`flex min-h-14 items-center gap-3 rounded-[14px] px-3 py-3 ${active ? "bg-[var(--surface-selected)] text-[var(--foreground)] ring-1 ring-[var(--border-gold)]" : "bg-[var(--surface-3)] text-[var(--foreground-muted)]"}`}><span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-3)] shadow-sm"><NavIcon name={link.icon} />{link.icon === "notifications" && unread > 0 && <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-black leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-sm font-black">{link.label}</span>{link.badge && <Badge type={link.badge} />}</span><span className="block truncate text-[10px] font-medium opacity-60">{link.description}</span></span></Link>;
}

function MobileDockLink({ link, active }: { link: CSBTNavLink; active: boolean }) {
  const label = link.href === "/exchange" ? "Trade" : link.href === "/calculator" ? "Calculate" : link.label;
  return <Link href={link.href} data-tour={link.tour} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-black ${active ? "bg-[var(--nav-active)] text-[var(--nav-active-text)]" : "text-[var(--foreground-muted)]"}`}><NavIcon name={link.icon} /><span>{label}</span></Link>;
}


function NavIcon({ name }: { name: NavIconName }) {
  const common = "h-5 w-5";
  switch (name) {
    case "home": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
    case "values": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M7 3v4m10-4v4M5 11h14v9H5z"/><path d="m9 16 2 2 4-5"/></svg>;
    case "demand": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></svg>;
    case "calculator": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2"/></svg>;
    case "community": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H9l-5 3v-7a7 7 0 1 1 17 0Z"/></svg>;
    case "servers": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/></svg>;
    case "seminar": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v4c3 2 7 2 10 0v-4"/></svg>;
    case "nich": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="5" width="16" height="15" rx="4"/><path d="M12 2v3M8 10h.01M16 10h.01M9 15h6"/></svg>;
    case "about": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
    case "profile": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "notifications": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
    case "inventory": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8h16l-1 12H5L4 8Z"/><path d="M8 8V5a4 4 0 0 1 8 0v3"/></svg>;
    case "wishlist": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 21-1.5-1.35C5.4 15.1 2 12 2 8.2A4.2 4.2 0 0 1 6.2 4 4.6 4.6 0 0 1 12 7.1 4.6 4.6 0 0 1 17.8 4 4.2 4.2 0 0 1 22 8.2c0 3.8-3.4 6.9-8.5 11.45L12 21Z"/></svg>;
    case "tradefeed": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3"/></svg>;
    case "feedback": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 5h16v12H8l-4 4V5Z"/><path d="M8 9h8M8 13h5"/></svg>;
    case "exchange": return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h13l-3-3m3 3-3 3"/><path d="M20 17H7l3 3m-3-3 3-3"/><circle cx="5" cy="7" r="2"/><circle cx="19" cy="17" r="2"/></svg>;
    case "more": return <svg viewBox="0 0 24 24" className={common} fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>;
  }
}
