import MM2Shell from "../../../components/mm2/MM2Shell";
import MM2ValuesBrowser from "../../../components/mm2/MM2ValuesBrowser";
import mm2Items from "../../../data/mm2Items.json";

export default function MM2ValuesPage() {
  return (
    <MM2Shell measure="standard">
      <MM2ValuesBrowser items={mm2Items} />
    </MM2Shell>
  );
}
