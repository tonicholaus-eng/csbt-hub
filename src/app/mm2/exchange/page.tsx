import { Suspense } from "react";
import MM2Shell from "../../../components/mm2/MM2Shell";
import ExchangeHub from "../../../components/exchange/ExchangeHub";

export const metadata = {
  title: "MM2 Exchange — CSBT HUB",
  description: "CSBT Exchange inside MM2 mode, powered by the MM2 weapon database.",
};

export default function MM2ExchangePage() {
  return (
    <MM2Shell measure="wide" social>
      <Suspense
        fallback={<div className="min-h-[520px] animate-pulse rounded-[24px] border border-white/[0.08] bg-[var(--mm2-panel)]" />}
      >
        <ExchangeHub
          fixedGameId="mm2"
          exchangeBasePath="/mm2/exchange"
          tradeOpinionsHref="/mm2/trade-opinions"
          loungeHref="/mm2/lounge"
        />
      </Suspense>
    </MM2Shell>
  );
}
