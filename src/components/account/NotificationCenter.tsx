"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AuthCard from "./AuthCard";
import { useAuthSession } from "../../hooks/useAuthSession";
import type { NotificationRow } from "../../lib/accountTypes";
import { EmptyState, Surface } from "../ui/CSBTUI";

type Preferences = {
  value_changes: boolean;
  trade_activity: boolean;
  community_updates: boolean;
  product_updates: boolean;
};

const defaultPreferences: Preferences = {
  value_changes: true,
  trade_activity: true,
  community_updates: true,
  product_updates: true,
};

function timeLabel(value: string) {
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(date);
}

export default function NotificationCenter() {
  const { supabase, user, loading } = useAuthSession();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setError(null);

    const [notificationsResult, preferencesResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("id,user_id,type,title,body,href,read_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("notification_preferences")
        .select("value_changes,trade_activity,community_updates,product_updates")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (notificationsResult.error) {
      setError(notificationsResult.error.message);
      setSchemaMissing(/relation|schema/i.test(notificationsResult.error.message));
    } else {
      setItems((notificationsResult.data ?? []) as NotificationRow[]);
    }

    if (!preferencesResult.error && preferencesResult.data) {
      setPreferences(preferencesResult.data as Preferences);
    }
  }, [supabase, user]);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id: string) {
    if (!supabase || !user) return;
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("notifications").update({ read_at: now }).eq("id", id).eq("user_id", user.id);
    if (!updateError) setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
  }

  async function markAllRead() {
    if (!supabase || !user) return;
    setBusy(true);
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    if (updateError) setError(updateError.message);
    else setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    setBusy(false);
  }

  async function savePreference(key: keyof Preferences, value: boolean) {
    if (!supabase || !user) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    const { error: prefError } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    if (prefError) {
      setError(prefError.message);
      setPreferences(preferences);
    }
  }

  if (loading) return <div className="min-h-64 animate-pulse rounded-[30px] bg-white/50 dark:bg-white/5" />;
  if (!supabase) return <p className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Supabase is not configured.</p>;
  if (!user) return <div className="mx-auto max-w-xl"><AuthCard supabase={supabase} /></div>;

  const unread = items.filter((item) => !item.read_at).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Surface as="section" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 p-5 dark:border-white/10 sm:p-6">
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Inbox</h2>
            <p className="mt-1 text-xs font-bold text-slate-400">{unread} unread · {items.length} total</p>
          </div>
          <button onClick={markAllRead} disabled={busy || unread === 0} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">Mark all read</button>
        </div>

        {schemaMissing && <p className="m-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Run <code>src/lib/supabase/foundation.sql</code> in Supabase to activate notifications.</p>}
        {error && !schemaMissing && <p className="m-5 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

        {!schemaMissing && items.length === 0 ? (
          <div className="p-5 sm:p-6"><EmptyState icon="◌" title="No notifications yet" description="Value alerts, trade activity, community notices, and important CSBT updates will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-200/70 dark:divide-white/10">
            {items.map((item) => {
              const content = (
                <div className={`flex gap-4 p-5 transition sm:p-6 ${item.read_at ? "opacity-65" : "bg-amber-50/50 dark:bg-amber-400/[0.04]"}`}>
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-slate-300 dark:bg-slate-600" : "bg-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-black text-slate-900 dark:text-white">{item.title}</h3>
                      <time className="text-[10px] font-bold text-slate-400">{timeLabel(item.created_at)}</time>
                    </div>
                    {item.body && <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.body}</p>}
                  </div>
                </div>
              );

              return item.href ? (
                <Link key={item.id} href={item.href} onClick={() => void markRead(item.id)}>{content}</Link>
              ) : (
                <button key={item.id} type="button" onClick={() => void markRead(item.id)} className="block w-full text-left">{content}</button>
              );
            })}
          </div>
        )}
      </Surface>

      <Surface as="aside" className="h-fit p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Preferences</p>
        <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">What should CSBT tell you?</h2>
        <div className="mt-5 space-y-3">
          {([
            ["value_changes", "Value changes", "Watchlist price and value movement"],
            ["trade_activity", "Trade activity", "Offers, accepted trades, and status"],
            ["community_updates", "Community", "Relevant community activity"],
            ["product_updates", "CSBT updates", "New HUB features and important notices"],
          ] as const).map(([key, label, description]) => (
            <label key={key} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
              <input type="checkbox" checked={preferences[key]} onChange={(event) => void savePreference(key, event.target.checked)} className="mt-1 h-4 w-4 accent-amber-500" />
              <span>
                <span className="block text-sm font-black text-slate-800 dark:text-slate-200">{label}</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{description}</span>
              </span>
            </label>
          ))}
        </div>
        <Link href="/profile" className="mt-5 inline-flex text-xs font-black text-amber-700 dark:text-amber-300">Manage profile →</Link>
      </Surface>
    </div>
  );
}
