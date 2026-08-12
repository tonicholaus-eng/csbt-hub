"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "../../hooks/useAuthSession";

 type RosterRow = {
  user_id: string;
  display_name: string;
  status: "ONLINE" | "BUSY" | "OFFLINE";
  completed_cases: number;
};

type RequestRow = {
  id: string;
  room_id: string;
  requested_by: string;
  assigned_middleman: string | null;
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  note: string | null;
  created_at: string;
  updated_at: string;
};

function ago(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MiddlemanDesk() {
  const { supabase, user, loading: authLoading } = useAuthSession();
  const [roster, setRoster] = useState<RosterRow | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = supabase;
    if (!client || !user) return;
    setLoading(true);
    setError(null);
    const { data: rosterData, error: rosterError } = await client
      .from("middleman_roster")
      .select("user_id,display_name,status,completed_cases")
      .eq("user_id", user.id)
      .maybeSingle();

    if (rosterError) {
      setError(rosterError.message);
      setLoading(false);
      return;
    }

    const nextRoster = (rosterData as RosterRow | null) ?? null;
    setRoster(nextRoster);
    if (!nextRoster) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const { data: requestData, error: requestError } = await client
      .from("middleman_requests")
      .select("id,room_id,requested_by,assigned_middleman,status,note,created_at,updated_at")
      .in("status", ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (requestError) setError(requestError.message);
    setRequests((requestData ?? []) as RequestRow[]);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user || !roster) return;
    const channel = client
      .channel("csbt-middleman-desk")
      .on("postgres_changes", { event: "*", schema: "public", table: "middleman_requests" }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [load, roster, supabase, user]);

  const pending = useMemo(() => requests.filter((row) => row.status === "PENDING"), [requests]);
  const mine = useMemo(() => requests.filter((row) => row.assigned_middleman === user?.id && row.status !== "PENDING"), [requests, user?.id]);

  async function setAvailability(status: RosterRow["status"]) {
    const client = supabase;
    if (!client) return;
    const { error: rpcError } = await client.rpc("marketplace_set_middleman_status", { p_status: status });
    if (rpcError) setError(rpcError.message); else await load();
  }

  async function claim(requestId: string) {
    const client = supabase;
    if (!client) return;
    const { error: rpcError } = await client.rpc("marketplace_claim_middleman_request", { p_request_id: requestId });
    if (rpcError) setError(rpcError.message); else await load();
  }

  async function updateCase(requestId: string, status: "IN_PROGRESS" | "COMPLETED") {
    const client = supabase;
    if (!client) return;
    const { error: rpcError } = await client.rpc("marketplace_update_middleman_request", { p_request_id: requestId, p_status: status });
    if (rpcError) setError(rpcError.message); else await load();
  }

  if (authLoading || loading) return <div className="min-h-80 animate-pulse rounded-[30px] bg-white/60 dark:bg-white/5" />;
  if (!user) return <div className="rounded-[28px] bg-white/80 p-6 text-center dark:bg-white/5"><p className="font-black">Sign in with your approved CSBT staff account.</p><Link href="/profile" className="mt-3 inline-flex rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-white">Sign in</Link></div>;
  if (!roster) return <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"><p className="text-[10px] font-black uppercase tracking-[0.16em]">Staff-only tool</p><h1 className="mt-2 text-2xl font-black">Middleman Desk access required</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6">Only accounts manually approved in the Supabase <code>middleman_roster</code> can see or claim cases. Members cannot self-approve.</p><Link href="/exchange" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Back to Exchange</Link></div>;

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">🛡 CSBT Staff</p><h1 className="mt-2 text-3xl font-black">Middleman Desk</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/60">Claim member requests, open the locked Exchange snapshot, coordinate in the room, and close each middleman case with an auditable status trail.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-right"><p className="font-black">{roster.display_name}</p><p className="mt-1 text-xs font-bold text-white/50">{roster.completed_cases} completed cases</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(["ONLINE", "BUSY", "OFFLINE"] as const).map((status) => <button key={status} onClick={() => void setAvailability(status)} className={`rounded-full px-4 py-2 text-xs font-black ${roster.status === status ? "bg-amber-400 text-white" : "border border-white/15 bg-white/5 text-white/65"}`}>{status === "ONLINE" ? "🟢" : status === "BUSY" ? "🟡" : "⚫"} {status}</button>)}
        </div>
      </section>

      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/70 bg-white/82 p-5 dark:border-white/10 dark:bg-slate-950/65">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">Available queue</p><h2 className="mt-1 text-xl font-black">Pending requests</h2></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">{pending.length}</span></div>
          <div className="mt-4 space-y-3">{pending.map((request) => <article key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">Case {request.id.slice(0, 8)}</p><p className="mt-1 text-[10px] font-bold text-slate-400">Requested {ago(request.created_at)}</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">PENDING</span></div>{request.note && <p className="mt-3 text-xs font-semibold text-slate-500">{request.note}</p>}<button onClick={() => void claim(request.id)} disabled={roster.status === "OFFLINE"} className="mt-3 w-full rounded-xl bg-amber-400 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Claim case</button></article>)}{!pending.length && <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-bold text-slate-400 dark:border-white/10">No pending middleman requests.</p>}</div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/82 p-5 dark:border-white/10 dark:bg-slate-950/65">
          <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">Assigned to you</p><h2 className="mt-1 text-xl font-black">My cases</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">{mine.filter((row) => row.status !== "COMPLETED").length} active</span></div>
          <div className="mt-4 space-y-3">{mine.map((request) => <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">Case {request.id.slice(0, 8)}</p><p className="mt-1 text-[10px] font-bold text-slate-400">Room {request.room_id.slice(0, 8)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black dark:bg-white/5">{request.status.replaceAll("_", " ")}</span></div><div className="mt-3 grid grid-cols-2 gap-2"><Link href={`/exchange/rooms/${request.room_id}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 text-[10px] font-black dark:border-white/10">Open locked room</Link>{request.status === "ASSIGNED" ? <button onClick={() => void updateCase(request.id, "IN_PROGRESS")} className="rounded-xl bg-cyan-500 text-[10px] font-black text-white">Start case</button> : request.status === "IN_PROGRESS" ? <button onClick={() => void updateCase(request.id, "COMPLETED")} className="rounded-xl bg-emerald-500 text-[10px] font-black text-white">Complete case</button> : <span className="inline-flex items-center justify-center rounded-xl bg-emerald-50 text-[10px] font-black text-emerald-600 dark:bg-emerald-400/10">✓ Closed</span>}</div></article>)}{!mine.length && <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-bold text-slate-400 dark:border-white/10">You have not claimed a case yet.</p>}</div>
        </section>
      </div>
    </div>
  );
}
