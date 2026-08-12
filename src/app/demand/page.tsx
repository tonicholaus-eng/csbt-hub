import type { Metadata } from "next";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import DemandBoard from "../../components/demand/DemandBoard";

export const metadata: Metadata = {
  title: "Demand Trends",
  description:
    "Browse recent Adopt Me pet demand movements without displaying prices.",
};

export default function DemandPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_40%,#fff3dc_70%,#eef9ff_100%)] transition-opacity duration-300 dark:opacity-0" />

      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 dark:opacity-100 dark:bg-[linear-gradient(180deg,#07111f_0%,#0b1729_25%,#111c2f_65%,#0b1626_100%)]" />

      <div className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-emerald-200/20 blur-[90px] dark:bg-emerald-500/10" />

      <div className="pointer-events-none absolute -right-44 top-[500px] h-[520px] w-[520px] rounded-full bg-orange-200/20 blur-[90px] dark:bg-amber-500/10" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.65)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-[0.04]" />

      <div className="relative z-10 min-w-0 lg:pl-72">
        <Navbar />

        <div className="mx-auto max-w-7xl px-3 pb-24 pt-8 sm:px-6 sm:pb-32 sm:pt-12">
          <header className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-emerald-200/70 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-700 backdrop-blur-xl dark:border-emerald-400/15 dark:bg-white/5 dark:text-emerald-300">
              Market Activity
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Demand Trends
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              See which Adopt Me pets are rising,
              dropping, mixed, or stable based on
              their latest recorded update—without
              showing prices.
            </p>
          </header>

          <DemandBoard />
        </div>

        <Footer />
      </div>
    </main>
  );
}
