import type { Metadata } from "next";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import TradeHistory from "../../components/account/TradeHistory";

export const metadata: Metadata = {
  title: "Trade History",
  description: "Review saved CSBT HUB trade comparisons and track their status.",
};

export default function TradesPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 dark:bg-[#07111f] dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_45%,#eef9ff_100%)] dark:bg-[linear-gradient(180deg,#07111f_0%,#0a1728_45%,#0b1626_100%)]" />
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-72">
        <div className="mx-auto w-full max-w-[1320px] px-3 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-9 lg:px-8">
          <header className="mb-7 sm:mb-9">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">My CSBT</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Trade history</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">Keep useful calculator comparisons tied to your CSBT account and update their status later.</p>
          </header>
          <TradeHistory />
        </div>
        <Footer />
      </div>
    </main>
  );
}
