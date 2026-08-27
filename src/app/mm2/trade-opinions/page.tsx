import { Suspense } from "react";
import MM2Shell from "../../../components/mm2/MM2Shell";
import MM2PageHeader from "../../../components/mm2/MM2PageHeader";
import TradeVotingBoard from "../../../components/community/TradeVotingBoard";

export const metadata = {
  title: "MM2 Trade Opinions — CSBT HUB",
  description: "Ask the CSBT community for Win, Fair, or Lose opinions without leaving MM2 mode.",
};

export default function MM2TradeOpinionsPage() {
  return (
    <MM2Shell measure="standard" social>
      <MM2PageHeader
        eyebrow="MM2 Community Trades"
        title="Trade Opinions"
        description="Post MM2 weapon trades and get community Win / Fair / Lose votes while staying inside the MM2 side of CSBT."
      />
      <Suspense
        fallback={<div className="min-h-[420px] animate-pulse rounded-[24px] border border-white/[0.08] bg-[var(--mm2-panel)]" />}
      >
        {/* The page title above already says "Trade Opinions"; the shared feed
            heading would repeat it verbatim ~500px lower. */}
        <TradeVotingBoard
          fixedGameId="mm2"
          routeBasePath="/mm2/trade-opinions"
          loungeBasePath="/mm2/lounge"
          feedHeading={false}
        />
      </Suspense>
    </MM2Shell>
  );
}
