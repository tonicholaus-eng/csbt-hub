import { Suspense } from "react";
import MM2Navbar from "../../../components/mm2/MM2Navbar";
import TradeVotingBoard from "../../../components/community/TradeVotingBoard";

export const metadata = { title: "MM2 Trade Opinions — CSBT HUB", description: "Ask the CSBT community for Win, Fair, or Lose opinions without leaving MM2 mode." };

export default function MM2TradeOpinionsPage(){return <main className="mm2-social-mode min-h-screen bg-[#07080d] text-white"><MM2Navbar/><div className="relative z-10 min-w-0 lg:pl-[288px]"><div className="csbt-app-workspace max-w-[1560px]"><header className="mb-6 rounded-[24px] border border-red-500/15 bg-[#090d14] p-5 sm:p-7"><p className="text-[9px] font-black uppercase tracking-[.18em] text-red-300">MM2 Community Trades</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-white sm:text-4xl">Trade Opinions</h1><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-500">Post MM2 weapon trades and get community Win / Fair / Lose votes while staying inside the MM2 side of CSBT.</p></header><Suspense fallback={<div className="min-h-[420px] animate-pulse rounded-[24px] border border-white/[0.08] bg-[#090d14]"/>}><TradeVotingBoard fixedGameId="mm2" routeBasePath="/mm2/trade-opinions" loungeBasePath="/mm2/lounge"/></Suspense></div></div></main>}
