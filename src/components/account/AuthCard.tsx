"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { FormEvent, useState } from "react";

type Props = {
  supabase: SupabaseClient;
  onAuthenticated?: (session: Session | null) => void;
  compact?: boolean;
};

export default function AuthCard({ supabase, onAuthenticated, compact = false }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.length < 6) {
      setError("Enter a valid email and a password with at least 6 characters.");
      return;
    }

    if (mode === "signup" && displayName.trim().length < 2) {
      setError("Choose a display name with at least 2 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { display_name: displayName.trim().slice(0, 32) },
          },
        });
        if (authError) throw authError;
        onAuthenticated?.(data.session);
        setMessage(
          data.session
            ? "Account created."
            : "Account created. Check your email to confirm it, then sign in.",
        );
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (authError) throw authError;
        onAuthenticated?.(data.session);
        setMessage("Signed in successfully.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReset() {
    const cleanEmail = email.trim().toLowerCase();
    setError(null);
    setMessage(null);
    if (!cleanEmail) {
      setError("Enter your email first.");
      return;
    }
    setBusy(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/profile` : undefined;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
    if (resetError) setError(resetError.message);
    else setMessage("Password reset link sent. Open it, then set a new password on your profile.");
    setBusy(false);
  }

  return (
    <div className={`rounded-[28px] border border-slate-200/80 bg-white/85 shadow-sm dark:border-white/10 dark:bg-white/5 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-950/60">
        {([['signin', 'Sign in'], ['signup', 'Create account']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => { setMode(value); setError(null); setMessage(null); }}
            className={`rounded-xl px-3 py-2.5 text-xs font-black transition ${mode === value ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-slate-300">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={32}
              autoComplete="nickname"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-950/70"
              placeholder="How members will see you"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-slate-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-950/70"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-slate-300">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-slate-950/70"
          />
        </label>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{message}</p>}

        {mode === "signin" && (
          <button type="button" onClick={() => void sendReset()} disabled={busy} className="w-full text-center text-xs font-black text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-300">
            Forgot password?
          </button>
        )}

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-2xl csbt-theme-primary px-4 font-black text-slate-950 shadow-sm disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "signup" ? "Create CSBT account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
