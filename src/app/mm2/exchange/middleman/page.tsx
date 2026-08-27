import MM2Shell from "../../../../components/mm2/MM2Shell";
import MiddlemanDesk from "../../../../components/exchange/MiddlemanDesk";

export const metadata = { title: "MM2 Middleman Desk — CSBT HUB" };

export default function MM2MiddlemanDeskPage() {
  return (
    <MM2Shell measure="standard" social>
      <MiddlemanDesk exchangeBasePath="/mm2/exchange" />
    </MM2Shell>
  );
}
