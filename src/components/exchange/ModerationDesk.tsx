"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";

type StaffRow = { user_id: string; display_name: string; role: "MODERATOR" | "ADMIN" };
type ReportRow = {
  id: string;
  reporter_id: string;
  target_user_id: string | null;
  listing_id: string | null;
  room_id: string | null;
  category: string;
  details: string;
  status: "NEW" | "REVIEWING" | "UPHELD" | "DISMISSED";
  created_at: string;
  reviewed_at: string | null;
};
type Profile = { user_id: string; display_name: string };

function ago(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ModerationDesk() {
  const { supabase, user, loading: authLoading } = useAuthSession();
  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [filter, setFilter] = useState<"OPEN" | "ALL">("OPEN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = supabase;
    if (!client || !user) return;
    setLoading(true);
    setError(null);
    const { data: staffData, error: staffError } = await client
      .from("exchange_staff")
      .select("user_id,display_name,role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (staffError) {
      setError(staffError.message);
      setLoading(false);
      return;
    }
    const nextStaff = (staffData as StaffRow | null) ?? null;
    setStaff(nextStaff);
    if (!nextStaff) {
      setReports([]);
      setLoading(false);
      return;
    }

    const { data: reportData, error: reportError } = await client
      .from("marketplace_reports")
      .select("id,reporter_id,target_user_id,listing_id,room_id,category,details,status,created_at,reviewed_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (reportError) {
      setError(reportError.message);
      setLoading(false);
      return;
    }
    const nextReports = (reportData ?? []) as ReportRow[];
    setReports(nextReports);
    const ids = Array.from(new Set(nextReports.flatMap((row) => [row.reporter_id, row.target_user_id].filter(Boolean) as string[])));
    if (ids.length) {
      const { data: profileRows } = await client.from("public_profiles").select("user_id,display_name").in("user_id", ids);
      setProfiles(new Map(((profileRows ?? []) as Profile[]).map((row) => [row.user_id, row.display_name])));
    } else setProfiles(new Map());
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => { if (!authLoading) void queueMicrotask(() => load()); }, [authLoading, load]);
  useEffect(() => {
    const client = supabase;
    if (!client || !staff) return;
    const channel = client.channel("exchange-moderation-desk")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_reports" }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [load, staff, supabase]);

  const visible = useMemo(() => filter === "ALL" ? reports : reports.filter((row) => row.status === "NEW" || row.status === "REVIEWING"), [filter, reports]);
  const newCount = reports.filter((row) => row.status === "NEW").length;

  async function moderate(reportId: string, status: "REVIEWING" | "UPHELD" | "DISMISSED") {
    const client = supabase;
    if (!client) return;
    const { error: rpcError } = await client.rpc("marketplace_moderate_report", { p_report_id: reportId, p_status: status, p_note: null });
    if (rpcError) setError(rpcError.message); else await load();
  }

  if (authLoading || loading) return <div className="min-h-80 animate-pulse rounded-[30px] bg-white/60 dark:bg-white/5" />;
  if (!user) return <div className="rounded-[28px] bg-white/80 p-6 text-center dark:bg-white/5"><p className="font-black">Sign in with your CSBT staff account.</p><Link href="/profile" className="mt-3 inline-flex rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-white">Sign in</Link></div>;
  if (!staff) return <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"><p className="text-[10px] font-black uppercase tracking-[0.16em]">Staff-only tool</p><h1 className="mt-2 text-2xl font-black">Exchange moderation access required</h1><p className="mt-2 text-sm font-semibold leading-6">Only accounts manually placed in <code>exchange_staff</code> can review reports. Users cannot promote themselves.</p><Link href="/exchange" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Back to Exchange</Link></div>;

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-300">🛡 CSBT Exchange Safety</p><h1 className="mt-2 text-3xl font-black">Moderation Desk</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/60">Review scam-risk, fake-listing, switch-attempt, spam, and harassment reports. Upheld reports feed the behavior-based Trust Score and can automatically close the reported listing.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-right"><p className="font-black">{staff.display_name}</p><p className="mt-1 text-xs font-bold text-white/50">{staff.role}</p></div></div>
        <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-rose-500/20 px-3 py-2 text-xs font-black text-rose-200">{newCount} new</span><button onClick={() => setFilter("OPEN")} className={`rounded-full px-3 py-2 text-xs font-black ${filter === "OPEN" ? "bg-white text-slate-950" : "border border-white/15 text-white/60"}`}>Open queue</button><button onClick={() => setFilter("ALL")} className={`rounded-full px-3 py-2 text-xs font-black ${filter === "ALL" ? "bg-white text-slate-950" : "border border-white/15 text-white/60"}`}>All reports</button></div>
      </section>

      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}

      <section className="grid gap-4 lg:grid-cols-2">
        {visible.map((report) => <article key={report.id} className="rounded-[26px] border border-white/70 bg-white/82 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/65"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-500">{report.category.replaceAll("_", " ")}</p><h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Report #{report.id.slice(0, 8)}</h2><p className="mt-1 text-[10px] font-bold text-slate-400">{ago(report.created_at)} • Reporter: {profiles.get(report.reporter_id) ?? "CSBT Member"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${report.status === "UPHELD" ? "bg-rose-100 text-rose-600" : report.status === "DISMISSED" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"}`}>{report.status}</span></div><p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-600 dark:bg-white/[0.035] dark:text-slate-300">{report.details}</p>{report.target_user_id && <p className="mt-3 text-[10px] font-bold text-slate-400">Reported trader: {profiles.get(report.target_user_id) ?? report.target_user_id.slice(0, 8)}</p>}<div className="mt-3 flex flex-wrap gap-2">{report.listing_id && <Link href={`/exchange/${report.listing_id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black dark:border-white/10">Open listing</Link>}{report.room_id && <Link href={`/exchange/rooms/${report.room_id}`} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black dark:border-white/10">Open room</Link>}{(report.status === "NEW" || report.status === "REVIEWING") && <><button onClick={() => void moderate(report.id, "REVIEWING")} className="rounded-xl bg-amber-100 px-3 py-2 text-[10px] font-black text-amber-700">Reviewing</button><button onClick={() => void moderate(report.id, "UPHELD")} className="rounded-xl bg-rose-500 px-3 py-2 text-[10px] font-black text-white">Uphold</button><button onClick={() => void moderate(report.id, "DISMISSED")} className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600 dark:bg-white/5">Dismiss</button></>}</div></article>)}
      </section>
      {!visible.length && <p className="rounded-[26px] border border-dashed border-slate-200 p-10 text-center text-sm font-black text-slate-400 dark:border-white/10">No reports in this queue.</p>}
    </div>
  );
}
