import MM2Shell from "../../../components/mm2/MM2Shell";
import MM2DemandIntelligence from "../../../components/mm2/MM2DemandIntelligence";
import mm2Items from "../../../data/mm2Items.json";

export default function MM2DemandPage() {
  return (
    <MM2Shell measure="standard">
      <MM2DemandIntelligence items={mm2Items} />
    </MM2Shell>
  );
}
