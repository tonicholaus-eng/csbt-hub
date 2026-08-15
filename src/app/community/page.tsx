import type { Metadata } from "next";

import CSBTLounge from "../../components/community/CSBTLounge";

import Navbar from "../../components/Navbar";

export const metadata: Metadata = {
  title: "CSBT Lounge",
  description:
    "Join the live CSBT Lounge for Adopt Me trade chat, value discussions, screenshots, reactions, threads, and community activity.",
};

export default function CommunityPage() {
  return (
    <main className="csbt-page overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--surface-0)_0%,color-mix(in_srgb,var(--background-secondary)_88%,transparent)_45%,var(--background-secondary)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,var(--glow-secondary),transparent_66%)]" />

      <Navbar />

      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <div className="mx-auto w-full max-w-[1680px] px-3 pb-24 pt-4 sm:px-5 sm:pb-32 sm:pt-6 lg:px-9 lg:pb-20 lg:pt-10">
          <header className="csbt-feature-panel csbt-panel-accent-community mb-6 flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:mb-10 lg:px-9 lg:py-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.15em] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live community</span>
                <span className="rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[.15em] text-violet-300">Community channels</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-[var(--foreground)] sm:text-4xl">CSBT Lounge</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--foreground-muted)]">The live hangout for CSBT traders — talk trades, discuss values, share screenshots, react, reply and stay connected.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black">
              <span className="rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 text-[var(--foreground-muted)]">💬 Channel-based chat</span>
              <span className="rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 text-[var(--foreground-muted)]">🔥 Reactions & threads</span>
              <span className="rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2 text-[var(--foreground-muted)]">🟢 Live presence</span>
            </div>
          </header>

          <CSBTLounge />
        </div>
        
      </div>
    </main>
  );
}
