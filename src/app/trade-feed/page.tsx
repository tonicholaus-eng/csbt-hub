import type { Metadata } from "next";
import { Suspense } from "react";

import Navbar from "../../components/Navbar";
import TradeVotingBoard from "../../components/community/TradeVotingBoard";
import { PageHeader } from "../../components/ui/CSBTUI";

export const metadata: Metadata = {
  title: "Community Trade Voting",
  description: "Post Adopt Me trades and vote Win, Fair, or Lose with the CSBT community.",
};

export default function TradeFeedPage() {
  return (
    <main className="csbt-page">
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <div className="csbt-app-workspace max-w-[1560px]">
          <PageHeader
            eyebrow="Community Trades"
            title="Win / Fair / Lose"
            description="See real trades from the CSBT community and vote on whether they look like a Win, Fair, or Loss."
          />
          <Suspense fallback={<div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-raised)] p-6 text-sm font-semibold text-[var(--muted)]">Loading community trades…</div>}><TradeVotingBoard /></Suspense>
        </div>
        
      </div>
    </main>
  );
}
