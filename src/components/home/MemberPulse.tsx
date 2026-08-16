"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";

type Pulse = { inventory: number; wishlist: number; unread: number; offers: number; robloxUsername: string | null };

export default function MemberPulse() {
  const { supabase, user, loading } = useAuthSession();
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    if (!supabase || !user) { queueMicrotask(() => setPulse(null)); return; }
    let active = true;
    void (async () => {
      const [inventory, wishlist, unread, offers, profile] = await Promise.all([
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
        supabase.from("marketplace_offers").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("status", "PENDING"),
        supabase.from("profiles").select("roblox_username").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setPulse({
        inventory: inventory.count ?? 0,
        wishlist: wishlist.count ?? 0,
        unread: unread.count ?? 0,
        offers: offers.count ?? 0,
        robloxUsername: typeof profile.data?.roblox_username === "string" ? profile.data.roblox_username : null,
      });
    })();
    return () => { active = false; };
  }, [supabase, user]);

  const nextAction = useMemo(() => {
    if (!pulse) return null;
    if (!pulse.robloxUsername) return { href: "/profile", label: "Add Roblox username", text: "Complete your trading identity so Exchange partners know who to add." };
    if (!pulse.inventory) return { href: "/inventory", label: "Build my inventory", text: "Add a few items to unlock inventory-aware Exchange matching." };
    if (!pulse.wishlist) return { href: "/wishlist", label: "Add a wishlist target", text: "Tell CSBT what you want so Smart Match can prioritize useful trades." };
    if (pulse.offers) return { href: "/exchange?tab=offers", label: `Review ${pulse.offers} offer${pulse.offers === 1 ? "" : "s"}`, text: "You have an Exchange negotiation waiting for you." };
    return { href: "/exchange", label: "Find my next trade", text: "Your account is ready for personalized Exchange matches." };
  }, [pulse]);

  if (loading || !user || !pulse || !nextAction) return null;

  return (
    <section className="rounded-[var(--radius-section)] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-sm)] sm:p-6" aria-labelledby="member-pulse-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--brand-primary)]">Continue where you left off</p>
          <h2 id="member-pulse-title" className="mt-1 text-xl font-black text-[var(--foreground)]">Your CSBT activity, ready when you are.</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--foreground-muted)]">{nextAction.text}</p>
        </div>
        <Link href={nextAction.href} className="csbt-btn-primary min-h-11 shrink-0 px-5 py-3 text-sm font-black">{nextAction.label} →</Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PulseMetric value={pulse.inventory} label="Inventory" />
        <PulseMetric value={pulse.wishlist} label="Wishlist" />
        <PulseMetric value={pulse.offers} label="Offers waiting" />
        <PulseMetric value={pulse.unread} label="Unread" />
      </div>
    </section>
  );
}

function PulseMetric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-2xl bg-[var(--surface-3)] p-3"><p className="text-xl font-black text-[var(--foreground)]">{value.toLocaleString()}</p><p className="mt-1 text-xs font-black uppercase tracking-[.1em] text-[var(--foreground-muted)]">{label}</p></div>;
}
