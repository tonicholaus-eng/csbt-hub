import { Suspense } from "react";

import Navbar from "../../components/Navbar";
import ExchangeHub from "../../components/exchange/ExchangeHub";

export const metadata = {
  title: "CSBT Exchange — Adopt Me Trading",
  description: "Find Adopt Me trades, build offers, negotiate counteroffers, use secure trade rooms, and follow market activity on CSBT Exchange.",
};

export default function ExchangePage() {
  return (
    <main className="csbt-page">
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <div className="csbt-app-workspace max-w-[1680px]">
          <Suspense fallback={<div className="min-h-[520px] animate-pulse rounded-[var(--radius-section)] bg-[var(--surface-1)] ring-1 ring-[var(--border)]" aria-label="Loading CSBT Exchange" />}>
            <ExchangeHub fixedGameId="adopt-me" exchangeBasePath="/exchange" tradeOpinionsHref="/trade-opinions" loungeHref="/lounge" />
          </Suspense>
        </div>
        
      </div>
    </main>
  );
}
