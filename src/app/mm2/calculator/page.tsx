import type { Metadata } from "next";
import MM2Navbar from "../../../components/mm2/MM2Navbar";
import MM2TradeCalculator from "../../../components/mm2/MM2TradeCalculator";
import mm2Items from "../../../data/mm2Items.json";

export const metadata: Metadata = {
  title: "MM2 Trade Calculator | CSBT HUB",
  description:
    "Compare Murder Mystery 2 weapon offers using Supreme or GCash values from the connected CSBT MM2 dataset.",
};

export default function MM2CalculatorPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <MM2Navbar />

      <div className="relative z-10 min-w-0 lg:pl-[288px]">
        <div className="mx-auto w-full max-w-[1380px] px-3 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <MM2TradeCalculator items={mm2Items} />
        </div>
      </div>
    </main>
  );
}
