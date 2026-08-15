"use client";

import Link from "next/link";

export default function FeatureError({ title = "This part of CSBT hit a problem.", reset }: { title?: string; reset: () => void }) {
  return (
    <div className="mx-auto my-10 max-w-xl rounded-[28px] border border-rose-200 bg-rose-50/90 p-6 text-center shadow-sm dark:border-rose-400/20 dark:bg-rose-500/10">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-rose-600 dark:text-rose-300">Recovery mode</p>
      <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">Your account and saved data are not changed by this screen. Retry the feature, or return home and open it again.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-black text-white">Try again</button>
        <Link href="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">Back home</Link>
      </div>
    </div>
  );
}
