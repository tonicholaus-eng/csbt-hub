import { Suspense } from "react";
import MM2Navbar from "../../../components/mm2/MM2Navbar";
import ExchangeHub from "../../../components/exchange/ExchangeHub";

export const metadata = { title: "MM2 Exchange — CSBT HUB", description: "CSBT Exchange inside MM2 mode, powered by the MM2 weapon database." };

export default function MM2ExchangePage() {
  return <main className="mm2-social-mode min-h-screen bg-[#07080d] text-white"><MM2Navbar/><div className="relative z-10 min-w-0 lg:pl-[288px]"><div className="csbt-app-workspace max-w-[1680px]"><Suspense fallback={<div className="min-h-[520px] animate-pulse rounded-[24px] border border-white/[0.08] bg-[#090d14]"/>}><ExchangeHub fixedGameId="mm2" exchangeBasePath="/mm2/exchange" tradeOpinionsHref="/mm2/trade-opinions" loungeHref="/mm2/lounge"/></Suspense></div></div></main>;
}
