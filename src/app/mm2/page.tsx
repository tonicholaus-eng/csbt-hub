import MM2Shell from "../../components/mm2/MM2Shell";
import MM2HQHome from "../../components/mm2/MM2HQHome";
import mm2Items from "../../data/mm2Items.json";
import mm2Meta from "../../data/mm2Meta.json";

export default function MM2HomePage() {
  return (
    <MM2Shell measure="flush">
      <MM2HQHome items={mm2Items} meta={mm2Meta} />
    </MM2Shell>
  );
}
