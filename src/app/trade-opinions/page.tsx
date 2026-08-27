import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "../../components/Navbar";
import TradeVotingBoard from "../../components/community/TradeVotingBoard";
import { PageHeader } from "../../components/ui/CSBTUI";

export const metadata: Metadata = {
  title: "CSBT Trade Opinions",
  description: "Post Adopt Me trades and ask the CSBT community to vote Win, Fair, or Lose.",
};

export default function TradeOpinionsPage() {
  return (
    <main className="csbt-page">
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <div className="csbt-app-workspace max-w-[1560px]">
          <PageHeader eyebrow="Community Trades" title="Trade Opinions" description="Build an Adopt Me trade, ask the community, and vote Win / Fair / Lose using the Adopt Me database." />
          <Suspense fallback={<div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface-raised)] p-6 text-sm font-semibold text-[var(--muted)]">Loading Trade Opinions…</div>}>
            <TradeVotingBoard fixedGameId="adopt-me" routeBasePath="/trade-opinions" loungeBasePath="/lounge" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
