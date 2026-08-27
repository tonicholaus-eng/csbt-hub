import MM2Shell from "../../../../components/mm2/MM2Shell";
import ListingDetail from "../../../../components/exchange/ListingDetail";

export default async function MM2ExchangeListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <MM2Shell measure="wide" social>
      <ListingDetail
        listingId={id}
        expectedGameId="mm2"
        exchangeBasePath="/mm2/exchange"
        tradeOpinionsHref="/mm2/trade-opinions"
        loungeHref="/mm2/lounge"
      />
    </MM2Shell>
  );
}
