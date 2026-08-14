import type { Metadata } from "next";
import Footer from "../../components/Footer";
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
        <div className="csbt-workspace max-w-[1280px] pb-28 sm:pb-32">
          <PageHeader
            eyebrow="Community Trades"
            title="Win / Fair / Lose"
            description="See real trades from the CSBT community and vote on whether they look like a Win, Fair, or Loss."
          />
          <TradeVotingBoard />
        </div>
        <Footer />
      </div>
    </main>
  );
}
