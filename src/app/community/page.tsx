import type { Metadata } from "next";

import Footer from "../../components/Footer";
import LiveCommunityFeed from "../../components/home/LiveCommunityFeed";
import Navbar from "../../components/Navbar";

export const metadata: Metadata = {
  title: "Live Community",
  description:
    "Read and share live CSBT community posts, trading updates, questions, and screenshots.",
};

export default function CommunityPage() {
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

            <div className="relative max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-green-700 dark:border-green-400/20 dark:bg-green-400/10 dark:text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live community
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                CSBT Community Feed
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
                Read community updates, ask trading questions, and share text or screenshots in one dedicated live space.
              </p>
            </div>
          </section>

          <section
            aria-label="CSBT live community posts"
            className="relative mt-7 min-w-0 sm:mt-9"
          >
            <div className="pointer-events-none absolute -inset-12 -z-10 hidden rounded-full bg-gradient-to-r from-blue-100/15 via-white/20 to-cyan-100/10 blur-3xl dark:from-blue-500/10 dark:via-white/5 dark:to-cyan-500/5 sm:block" />

            <LiveCommunityFeed />
          </section>
        </div>

        <Footer />
      </div>
    </main>
  );
}
