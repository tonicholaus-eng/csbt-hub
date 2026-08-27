import { Suspense } from "react";
import MM2Shell from "../../../components/mm2/MM2Shell";
import MM2PageHeader from "../../../components/mm2/MM2PageHeader";
import CSBTLounge from "../../../components/community/CSBTLounge";

export const metadata = {
  title: "MM2 Lounge — CSBT HUB",
  description:
    "The MM2-scoped CSBT Lounge for weapon trades, values, demand, screenshots, reactions, and threads.",
};

export default function MM2LoungePage() {
  return (
    <MM2Shell measure="wide" social>
      <MM2PageHeader
        eyebrow="MM2 Community"
        title="CSBT Lounge"
        description="MM2 trade chat, value discussion, demand talk, screenshots, reactions and threads — without leaving MM2 mode."
      />
      <Suspense
        fallback={<div className="min-h-[520px] animate-pulse rounded-[24px] border border-white/[0.08] bg-[var(--mm2-panel)]" />}
      >
        <CSBTLounge
          fixedGameId="mm2"
          routeBasePath="/mm2/lounge"
          exchangeBasePath="/mm2/exchange"
          tradeOpinionsBasePath="/mm2/trade-opinions"
        />
      </Suspense>
    </MM2Shell>
  );
}
