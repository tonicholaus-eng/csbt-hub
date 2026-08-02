import type { Metadata } from "next";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import TradingServersDirectory from "../../components/trading-servers/TradingServersDirectory";

export const metadata: Metadata = {
  title: "Trading Servers",
  description:
    "Browse CSBT HUB's directory of Discord, Facebook, and Roblox Adopt Me trading communities and server links.",
};

export default function TradingServersPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100">
      {/* Shared CSBT background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#f1fbff_20%,#fff9e8_48%,#fdf0ff_78%,#eef9ff_100%)] transition-opacity duration-300 dark:opacity-0" />

      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 dark:opacity-100 dark:bg-[linear-gradient(180deg,#07111f_0%,#0a1728_24%,#0d1b2d_58%,#0b1626_100%)]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.96),rgba(255,248,214,.32)_42%,transparent_74%)] transition-opacity duration-300 dark:opacity-0" />

      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-[760px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,.2),rgba(15,23,42,.1)_42%,transparent_74%)] dark:block" />

      <div className="pointer-events-none absolute -left-44 top-20 h-[520px] w-[520px] rounded-full bg-cyan-200/20 blur-[105px] dark:bg-blue-500/10" />

      <div className="pointer-events-none absolute -right-48 top-[520px] h-[560px] w-[560px] rounded-full bg-violet-200/20 blur-[110px] dark:bg-violet-500/10" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.65)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 transition-opacity duration-300 dark:opacity-[0.045]" />

      <Navbar />

      <div className="relative z-10 min-w-0 transition-[padding] duration-300 lg:pl-72">
        <div className="mx-auto w-full max-w-[1500px] px-3 pb-24 pt-6 sm:px-6 sm:pb-32 sm:pt-8 lg:px-8 lg:pt-10">
          <section className="relative overflow-hidden rounded-[30px] border border-white/65 bg-white/68 px-5 py-8 shadow-[0_24px_75px_rgba(15,23,42,.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65 dark:shadow-[0_28px_90px_rgba(0,0,0,.35)] sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,.16),transparent_44%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,.12),transparent_44%)]" />

            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10" />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Trading directory
                </span>

                <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                  Adopt Me Trading Servers
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
                  Find Discord communities, Facebook trading groups, Roblox servers, and community buy-and-sell groups in one organized page.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <StatCard
                  value="23"
                  label="Links"
                />
                <StatCard
                  value="4"
                  label="Sections"
                />
                <StatCard
                  value="3"
                  label="Platforms"
                />
              </div>
            </div>
          </section>

          <section
            aria-label="Adopt Me trading server directory"
            className="relative mt-7 min-w-0 sm:mt-9"
          >
            <div className="pointer-events-none absolute -inset-12 -z-10 hidden rounded-full bg-gradient-to-r from-blue-100/15 via-white/20 to-cyan-100/10 blur-3xl dark:from-blue-500/10 dark:via-white/5 dark:to-cyan-500/5 sm:block" />

            <TradingServersDirectory />
          </section>
        </div>

        <Footer />
      </div>
    </main>
  );
}

function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-[76px] rounded-2xl border border-white/70 bg-white/65 px-3 py-3 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 sm:min-w-[92px] sm:px-4">
      <p className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
        {value}
      </p>

      <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}