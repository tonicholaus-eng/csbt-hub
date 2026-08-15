import type { Metadata } from "next";

import Navbar from "../../components/Navbar";
import TradingServersDirectory from "../../components/trading-servers/TradingServersDirectory";
import { PageHeader } from "../../components/ui/CSBTUI";

export const metadata: Metadata = {
  title: "Trading Servers",
  description: "Browse CSBT HUB's directory of Discord, Facebook, and Roblox Adopt Me trading communities and server links.",
};

export default function TradingServersPage() {
  return (
    <main className="csbt-page overflow-x-hidden">
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <div className="csbt-workspace max-w-[1350px] pb-28 sm:pb-32">
          <PageHeader eyebrow="Lounge" title="Trading Servers" description="Browse community Discord, Facebook, and Roblox destinations from one organized CSBT directory." />
          <TradingServersDirectory />
        </div>
        
      </div>
    </main>
  );
}
