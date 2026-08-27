import type { Metadata } from "next";
import MM2Shell from "../../../components/mm2/MM2Shell";
import MM2TradeCalculator from "../../../components/mm2/MM2TradeCalculator";
import mm2Items from "../../../data/mm2Items.json";

export const metadata: Metadata = {
  title: "MM2 Trade Calculator | CSBT HUB",
  description:
    "Compare Murder Mystery 2 weapon offers using Supreme or GCash values from the connected CSBT MM2 dataset.",
};

export default function MM2CalculatorPage() {
  return (
    <MM2Shell measure="standard">
      <MM2TradeCalculator items={mm2Items} />
    </MM2Shell>
  );
}
