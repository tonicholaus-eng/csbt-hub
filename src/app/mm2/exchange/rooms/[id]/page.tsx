import MM2Shell from "../../../../../components/mm2/MM2Shell";
import TradeRoomExperience from "../../../../../components/exchange/TradeRoomExperience";

export default async function MM2ExchangeRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <MM2Shell measure="wide" social>
      <TradeRoomExperience roomId={id} expectedGameId="mm2" exchangeBasePath="/mm2/exchange" />
    </MM2Shell>
  );
}
