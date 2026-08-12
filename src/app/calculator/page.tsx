import type { Metadata } from "next";
import { Suspense } from "react";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import TradeCalculator from "../../components/trade/TradeCalculator";

export const metadata: Metadata = {
  title: "Trade Calculator",
  description:
    "Compare Adopt Me trade offers using the CSBT HUB Trade Calculator.",
};

export default function CalculatorPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100">
      {/* Light background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_42%,#fff3dc_72%,#eef9ff_100%)] transition-opacity duration-300 dark:opacity-0" />

      {/* Dark background */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 dark:opacity-100 dark:bg-[linear-gradient(180deg,#07111f_0%,#0a1728_28%,#0d1b2d_65%,#0b1626_100%)]" />

      {/* Atmospheric lighting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.95),rgba(255,248,214,.35)_42%,transparent_72%)] transition-opacity duration-300 dark:opacity-0" />

      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-[680px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,.18),rgba(15,23,42,.1)_45%,transparent_74%)] dark:block" />

      {/* Decorative glow */}
      <div className="pointer-events-none absolute -left-40 top-28 h-[440px] w-[440px] rounded-full bg-cyan-200/20 blur-[95px] dark:bg-cyan-500/10 sm:h-[580px] sm:w-[580px]" />

      <div className="pointer-events-none absolute -right-40 top-[520px] h-[420px] w-[420px] rounded-full bg-amber-200/20 blur-[95px] dark:bg-amber-500/10 sm:h-[560px] sm:w-[560px]" />

      {/* Texture */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.65)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-[0.045]" />

      <div className="relative z-10 min-w-0 lg:pl-72">
        <Navbar />

        <div className="mx-auto w-full max-w-7xl px-3 pb-24 pt-8 sm:px-6 sm:pb-32 sm:pt-12">
          <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
            <span className="inline-flex rounded-full border border-amber-200/80 bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-amber-700 shadow-sm backdrop-blur-xl dark:border-amber-400/15 dark:bg-white/5 dark:text-amber-300">
              Trade Tools
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Trade Calculator
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              Add pets to both sides and compare the estimated value of each
              offer before completing your trade.
            </p>
          </header>

          <section className="relative min-w-0">
            <div className="pointer-events-none absolute -inset-12 -z-10 hidden rounded-full bg-gradient-to-r from-cyan-100/15 via-white/20 to-amber-100/15 blur-3xl dark:from-cyan-500/5 dark:via-white/5 dark:to-amber-500/5 sm:block" />

            <Suspense fallback={<div className="h-96 animate-pulse rounded-[30px] bg-white/60 dark:bg-white/5" />}><TradeCalculator /></Suspense>
          </section>
        </div>

        <Footer />
      </div>
    </main>
  );
}