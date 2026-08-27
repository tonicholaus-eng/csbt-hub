import MM2Navbar from "../../../../components/mm2/MM2Navbar";
import ListingDetail from "../../../../components/exchange/ListingDetail";

export default async function MM2ExchangeListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="mm2-social-mode min-h-screen bg-[#07080d] text-white"><MM2Navbar/><div className="relative z-10 min-w-0 lg:pl-[288px]"><div className="csbt-app-workspace max-w-[1640px]"><ListingDetail listingId={id} expectedGameId="mm2" exchangeBasePath="/mm2/exchange" tradeOpinionsHref="/mm2/trade-opinions" loungeHref="/mm2/lounge"/></div></div></main>;
}
