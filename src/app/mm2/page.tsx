import MM2Navbar from "../../components/mm2/MM2Navbar";
import MM2HQHome from "../../components/mm2/MM2HQHome";
import mm2Items from "../../data/mm2Items.json";
import mm2Meta from "../../data/mm2Meta.json";

export default function MM2HomePage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <MM2Navbar />
      <div className="lg:pl-[288px]">
        <MM2HQHome items={mm2Items} meta={mm2Meta} />
      </div>
    </main>
  );
}
