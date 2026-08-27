import MM2Navbar from "../../../../../components/mm2/MM2Navbar";
import TradeRoomExperience from "../../../../../components/exchange/TradeRoomExperience";

export default async function MM2ExchangeRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="mm2-social-mode min-h-screen bg-[#07080d] text-white"><MM2Navbar/><div className="relative z-10 min-w-0 lg:pl-[288px]"><div className="csbt-app-workspace max-w-[1640px]"><TradeRoomExperience roomId={id} expectedGameId="mm2" exchangeBasePath="/mm2/exchange"/></div></div></main>;
}
