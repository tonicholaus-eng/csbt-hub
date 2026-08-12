import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/40 bg-white/60 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/70">
      {/* Background glow */}
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-500/5" />

      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-pink-300/15 blur-3xl dark:bg-fuchsia-500/5" />

      {/* Top highlight */}
      <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/15" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-10 px-6 py-12 text-center md:flex-row md:text-left lg:px-8">
        {/* Brand */}
        <div className="max-w-lg">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-lg dark:border-white/10 dark:bg-white/5">
              <Image
                src="/logo.png"
                alt="CSBT HUB logo"
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <h3 className="text-2xl font-black tracking-tight text-amber-900 dark:text-amber-300">
                CSBT HUB
              </h3>

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Adopt Me Value Checker
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-md leading-relaxed text-slate-600 dark:text-slate-400">
            Search values, calculate inventories, compare trades, follow market movement, and learn from the CSBT community.
          </p>
        </div>

        {/* Links and legal information */}
        <div className="flex flex-col items-center gap-4 md:items-end">
          <div className="flex flex-wrap justify-center gap-2 md:justify-end">
            <Link href="/inventory" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">🎒 Inventory</Link>
            <Link href="/trade-feed" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">🗳️ Trade Voting</Link>
            <Link href="/feedback" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-amber-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">💬 Feedback</Link>
          </div>

          <a
            href="https://www.facebook.com/groups/5352107604807631"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit the CSBT HUB Facebook community"
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-2.5 font-black text-blue-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-400/15 dark:hover:text-blue-200 dark:focus-visible:ring-blue-400/20"
          >
            <span aria-hidden="true">💬</span>
            Facebook Community
            <span aria-hidden="true">↗</span>
          </a>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} CSBT HUB.
              All rights reserved.
            </p>

            <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              Not affiliated with Uplift Games or
              Adopt Me.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}