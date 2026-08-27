import MM2Shell from "../../../../components/mm2/MM2Shell";
import ModerationDesk from "../../../../components/exchange/ModerationDesk";

export const metadata = { title: "MM2 Exchange Moderation — CSBT HUB" };

export default function MM2ModerationPage() {
  return (
    <MM2Shell measure="standard" social>
      <ModerationDesk exchangeBasePath="/mm2/exchange" />
    </MM2Shell>
  );
}
