"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import AuthCard from "./AuthCard";
import { useAuthSession } from "../../hooks/useAuthSession";
import type { ProfileRow } from "../../lib/accountTypes";
import type { TrustStats } from "../../lib/exchange/types";

const countries = [
  ["", "Not set"],
  ["PH", "Philippines"],
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["SG", "Singapore"],
  ["MY", "Malaysia"],
  ["ID", "Indonesia"],
  ["TH", "Thailand"],
  ["VN", "Vietnam"],
  ["OT", "Other"],
] as const;

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "C";
}

export default function ProfileDashboard() {
  const { supabase, user, loading } = useAuthSession();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [robloxUsername, setRobloxUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [activityCounts, setActivityCounts] = useState({ inventory: 0, wishlist: 0, watches: 0, completedTrades: 0, unread: 0 });
  const [exchangeTrust, setExchangeTrust] = useState<TrustStats | null>(null);

  useEffect(() => {
    if (!supabase || !user) {
      queueMicrotask(() => setProfile(null));
      return;
    }

    let active = true;
    void (async () => {
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("user_id,display_name,avatar_path,country_code,roblox_username,roblox_user_id,bio,created_at,updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (loadError) {
        setSchemaMissing(/column|relation|schema/i.test(loadError.message));
        setError(loadError.message);
        return;
      }

      const fallbackName =
        (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()) ||
        user.email?.split("@")[0] ||
        "CSBT Member";

      const row = (data as ProfileRow | null) ?? {
        user_id: user.id,
        display_name: fallbackName.slice(0, 32),
        avatar_path: null,
        country_code: null,
        roblox_username: null,
        roblox_user_id: null,
        bio: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setProfile(row);
      setDisplayName(row.display_name);
      setCountryCode(row.country_code ?? "");
      setRobloxUsername(row.roblox_username ?? "");
      setBio(row.bio ?? "");

      if (row.avatar_path) {
        setAvatarUrl(
          `${supabase.storage.from("avatars").getPublicUrl(row.avatar_path).data.publicUrl}?v=${encodeURIComponent(row.updated_at)}`,
        );
      } else {
        setAvatarUrl(null);
      }
    })();

    return () => { active = false; };
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase || !user) {
      queueMicrotask(() => setActivityCounts({ inventory: 0, wishlist: 0, watches: 0, completedTrades: 0, unread: 0 }));
      queueMicrotask(() => setExchangeTrust(null));
      return;
    }

    let active = true;
    void (async () => {
      const [inventory, wishlist, watches, completedTrades, unread, exchangeTrustResult] = await Promise.all([
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("value_watchlist").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("enabled", true),
        supabase.from("trade_history").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
        supabase.from("marketplace_user_stats").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setActivityCounts({
        inventory: inventory.count ?? 0,
        wishlist: wishlist.count ?? 0,
        watches: watches.count ?? 0,
        completedTrades: completedTrades.count ?? 0,
        unread: unread.count ?? 0,
      });
      setExchangeTrust((exchangeTrustResult.data as TrustStats | null) ?? null);
    })();

    return () => { active = false; };
  }, [supabase, user]);

  const tradingIdentitySteps = useMemo(() => [
    { done: displayName.trim().length >= 2, label: "Display identity", href: "#profile-details" },
    { done: Boolean(robloxUsername.trim()), label: "Roblox username", href: "#profile-details" },
    { done: activityCounts.inventory > 0, label: "Inventory added", href: "/inventory" },
    { done: activityCounts.wishlist > 0, label: "Wishlist target", href: "/wishlist" },
  ], [activityCounts.inventory, activityCounts.wishlist, displayName, robloxUsername]);
  const identityCompletion = Math.round(tradingIdentitySteps.filter((step) => step.done).length / tradingIdentitySteps.length * 100);

  const joinedLabel = useMemo(() => {
    const date = profile?.created_at ?? user?.created_at;
    if (!date) return "CSBT member";
    return `Joined ${new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric" }).format(new Date(date))}`;
  }, [profile?.created_at, user?.created_at]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;

    const cleanName = displayName.trim().slice(0, 32);
    if (cleanName.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const { data, error: saveError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: cleanName,
          country_code: countryCode || null,
          roblox_username: robloxUsername.trim().slice(0, 32) || null,
          bio: bio.trim().slice(0, 180) || null,
        },
        { onConflict: "user_id", defaultToNull: false },
      )
      .select("user_id,display_name,avatar_path,country_code,roblox_username,roblox_user_id,bio,created_at,updated_at")
      .single();

    if (saveError) {
      setError(saveError.message);
      setSchemaMissing(/column|relation|schema/i.test(saveError.message));
    } else {
      setProfile(data as ProfileRow);
      setNotice("Profile saved.");
    }
    setSaving(false);
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !user) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("Profile pictures must be 1 MB or smaller.");
      return;
    }

    setAvatarBusy(true);
    setError(null);
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

    if (uploadError) {
      setError(uploadError.message);
      setAvatarBusy(false);
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: displayName.trim().slice(0, 32) || "CSBT Member",
          avatar_path: path,
        },
        { onConflict: "user_id", defaultToNull: false },
      )
      .select("user_id,display_name,avatar_path,country_code,roblox_username,roblox_user_id,bio,created_at,updated_at")
      .single();

    if (profileError) {
      setError(profileError.message);
    } else {
      const row = data as ProfileRow;
      setProfile(row);
      setAvatarUrl(`${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`);
      setNotice("Profile picture updated.");
    }
    setAvatarBusy(false);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setPasswordBusy(true);
    setError(null);
    setNotice(null);
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError) setError(passwordError.message);
    else {
      setNewPassword("");
      setNotice("Password updated.");
    }
    setPasswordBusy(false);
  }

  if (loading) {
    return <div className="min-h-64 animate-pulse rounded-[30px] border border-white/60 bg-white/55 dark:border-white/10 dark:bg-white/5" />;
  }

  if (!supabase) {
    return (
      <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
        <h2 className="text-xl font-black">Supabase is not configured</h2>
        <p className="mt-2 text-sm">Add your Supabase URL and public key to <code>.env.local</code>.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <AuthCard supabase={supabase} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="h-fit rounded-[30px] border border-white/65 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-3xl font-black text-white ring-4 ring-white shadow-lg dark:ring-slate-900">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Profile avatar" fill unoptimized className="object-cover" />
            ) : (
              initials(displayName || "CSBT Member")
            )}
          </div>
          <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            {avatarBusy ? "Uploading…" : "Change photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="sr-only" disabled={avatarBusy} />
          </label>
          <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{displayName || "CSBT Member"}</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">{joinedLabel}</p>
          <p className="mt-3 max-w-full truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 xl:grid-cols-1">
          <Link href="/exchange" className="col-span-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-black text-white xl:col-span-1">🔄 CSBT Exchange</Link>
          <Link href="/inventory" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">🎒 Inventory</Link>
          <Link href="/wishlist" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">⭐ Wishlist & alerts</Link>
          <Link href="/notifications" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">🔔 Notifications</Link>
          <Link href="/trades" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">🧮 Saved trades</Link>
          <Link href="/trade-feed" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">⚖️ Trade voting</Link>
          <Link href="/feedback" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 dark:bg-white/5 dark:text-slate-200">💬 Send feedback</Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("csbt-open-guide"))}
            className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-black text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15 xl:col-span-1"
          >
            🧭 Open CSBT Guide
          </button>
        </div>
      </aside>

      <div className="space-y-6">
        <section className="rounded-[28px] border border-cyan-100 bg-cyan-50/70 p-5 dark:border-cyan-400/10 dark:bg-cyan-400/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-700 dark:text-cyan-300">Trading identity</p><h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Profile setup · {identityCompletion}%</h2><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Complete these basics to get more useful Exchange matches and a clearer trader identity.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm dark:bg-white/5 dark:text-cyan-200">{tradingIdentitySteps.filter((step) => step.done).length}/{tradingIdentitySteps.length} ready</span></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{tradingIdentitySteps.map((step) => <Link key={step.label} href={step.href} className={`rounded-2xl border p-3 text-xs font-black ${step.done ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/10 dark:bg-emerald-400/[0.05] dark:text-emerald-300" : "border-white bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300"}`}>{step.done ? "✓" : "○"} {step.label}</Link>)}</div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["🎒", activityCounts.inventory, "Inventory entries"],
            ["⭐", activityCounts.wishlist, "Wishlist"],
            ["🔔", activityCounts.watches, "Value alerts"],
            ["✅", activityCounts.completedTrades, "Completed trades"],
            ["📬", activityCounts.unread, "Unread"],
          ].map(([icon, value, label]) => (
            <div key={String(label)} className="rounded-2xl border border-white/65 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-lg" aria-hidden="true">{icon}</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{Number(value).toLocaleString()}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            </div>
          ))}
        </section>

        {exchangeTrust && <section className="rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 dark:border-indigo-400/10 dark:from-indigo-400/[0.05] dark:via-slate-950 dark:to-violet-400/[0.04]"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">CSBT Exchange reputation</p><h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Trust {exchangeTrust.trust_score}/100</h2><p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-slate-500">Built from real Exchange behavior: completed rooms, completion rate, reviews, account age, Roblox verification, protected middleman trades, and upheld reports.</p></div><Link href="/exchange" className="rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white">Open Exchange</Link></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-2xl bg-white/75 p-3 dark:bg-white/5"><p className="text-xl font-black">{exchangeTrust.completed_trades}</p><p className="text-[9px] font-black uppercase text-slate-400">Completed</p></div><div className="rounded-2xl bg-white/75 p-3 dark:bg-white/5"><p className="text-xl font-black">{exchangeTrust.completion_rate != null ? `${exchangeTrust.completion_rate}%` : "—"}</p><p className="text-[9px] font-black uppercase text-slate-400">Completion rate</p></div><div className="rounded-2xl bg-white/75 p-3 dark:bg-white/5"><p className="text-xl font-black">{exchangeTrust.avg_rating ? `${exchangeTrust.avg_rating}★` : "—"}</p><p className="text-[9px] font-black uppercase text-slate-400">{exchangeTrust.review_count} reviews</p></div><div className="rounded-2xl bg-white/75 p-3 dark:bg-white/5"><p className="text-xl font-black">{exchangeTrust.middleman_trades ?? 0}</p><p className="text-[9px] font-black uppercase text-slate-400">MM trades</p></div></div></section>}

        {schemaMissing && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            Profile services are temporarily unavailable. Please try again later.
          </div>
        )}

        <form id="profile-details" onSubmit={saveProfile} className="rounded-[30px] border border-white/65 bg-white/75 p-5 shadow-[0_24px_70px_rgba(15,23,42,.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 sm:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">My profile</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Account details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">These details power your inventory, wishlist, saved trades, notifications, and future Roblox verification.</p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-300">Display name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-300">Country / market</span>
              <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900">
                {countries.map(([value, label]) => <option key={value || 'none'} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300"><span>Roblox username</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-400 dark:bg-white/5">Unverified</span></span>
              <input value={robloxUsername} onChange={(e) => setRobloxUsername(e.target.value)} maxLength={32} placeholder="Optional for now" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900" />
              <p className="mt-2 text-xs text-slate-400">The future Connect Roblox flow will verify and lock the Roblox user ID separately.</p>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-300">Short bio</span>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={180} rows={3} className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900" placeholder="Optional" />
              <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{bio.length}/180</span>
            </label>
          </div>

          {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
          {notice && <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="min-h-12 rounded-2xl csbt-theme-primary px-6 text-sm font-black text-slate-950 shadow-sm disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button>
            <button type="button" onClick={() => void supabase.auth.signOut()} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">Sign out</button>
          </div>
        </form>

        <form onSubmit={changePassword} className="rounded-[30px] border border-white/65 bg-white/75 p-5 shadow-[0_24px_70px_rgba(15,23,42,.1)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">Security</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Password</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">You can also use this after opening a password recovery link.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" className="min-h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-900" />
            <button type="submit" disabled={passwordBusy || newPassword.length < 8} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{passwordBusy ? "Updating…" : "Update password"}</button>
          </div>
        </form>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["/inventory", "Inventory", "Live", "Save your whole Adopt Me inventory and calculate its latest GCash or Elve value."],
            ["/wishlist", "Wishlist & Watchlist", "Live", "Save wanted items and control your value-change alert thresholds."],
            ["/trades", "Saved Trade History", "Live", "Keep calculator comparisons and mark them Draft, Pending, Completed, or Cancelled."],
            ["/notifications", "Notifications", "Live", "See value alerts and account activity in one inbox."],
            ["/trade-feed", "Community W/F/L", "Live", "Post trades and learn from community Win, Fair, or Lose voting."],
            ["/exchange", "CSBT Exchange", "Live", "Smart matches, offers, counteroffers, Trade Rooms, trust scores, reviews, and market intelligence."],
          ].map(([href, title, status, text]) => (
            href === "#" ? <article key={title} className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{status}</p><h3 className="mt-2 font-black text-slate-950 dark:text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</p></article>
            : <Link key={title} href={href} className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5 transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-white/10 dark:bg-white/5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">{status}</p><h3 className="mt-2 font-black text-slate-950 dark:text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</p></Link>
          ))}
        </section>
      </div>
    </div>
  );
}
