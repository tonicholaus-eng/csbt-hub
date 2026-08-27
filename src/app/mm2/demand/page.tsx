import MM2Navbar from "../../../components/mm2/MM2Navbar";
import MM2DemandIntelligence from "../../../components/mm2/MM2DemandIntelligence";
import mm2Items from "../../../data/mm2Items.json";

export default function MM2DemandPage() {
  return (
    <main className="min-h-screen bg-[#07080d] text-white">
      <MM2Navbar />
      <div className="lg:pl-[288px]">
        <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <MM2DemandIntelligence items={mm2Items} />
        </div>
      </div>
    </main>
  );
}
