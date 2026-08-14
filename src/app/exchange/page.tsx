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
    <main className="csbt-page">
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <div className="csbt-workspace max-w-[1500px] pb-28 sm:pb-32">
          <Suspense fallback={<div className="min-h-[520px] animate-pulse rounded-[var(--radius-section)] bg-[var(--surface-1)] ring-1 ring-[var(--border)]" aria-label="Loading CSBT Exchange" />}>
            <ExchangeHub />
          </Suspense>
        </div>
        <Footer />
      </div>
    </main>
  );
}
