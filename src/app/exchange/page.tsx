import { Suspense } from "react";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import ExchangeHub from "../../components/exchange/ExchangeHub";

export const metadata = {
  title: "CSBT Exchange — Smart Adopt Me Trading",
  description: "Find inventory-aware matches, build offers, negotiate counteroffers, use secure trade rooms, and follow live market activity on CSBT Exchange.",
};

export default function ExchangePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-900 dark:bg-[#07111f] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_38%,#fff1dd_68%,#edf7ff_100%)] dark:bg-[linear-gradient(180deg,#07111f_0%,#0b1829_45%,#11182b_100%)]" />
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-72">
        <div className="mx-auto w-full max-w-[1560px] px-3 pb-28 pt-4 sm:px-6 sm:pt-7 lg:px-8 lg:pt-8">
          <Suspense fallback={<div className="min-h-[520px] animate-pulse rounded-[30px] border border-white/50 bg-white/55 dark:border-white/10 dark:bg-white/5" />}><ExchangeHub /></Suspense>
        </div>
        <Footer />
      </div>
    </main>
  );
}
