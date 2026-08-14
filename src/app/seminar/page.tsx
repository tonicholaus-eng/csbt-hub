import type { Metadata } from "next";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import SeminarAcademy from "../../components/seminar/SeminarAcademy";
import { PageHeader } from "../../components/ui/CSBTUI";

export const metadata: Metadata = {
  title: "Safe Trader Academy",
  description: "Complete playful CSBT seminar missions about safe transactions, scam prevention, payment verification, community conduct, and responsible trading.",
};

export default function SeminarPage() {
  return (
    <main className="csbt-page overflow-x-hidden">
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <div className="csbt-workspace max-w-[1450px] pb-28 sm:pb-32">
          <PageHeader eyebrow="Help & Safety" title="Safe Trader Academy" description="Complete CSBT trading-safety missions and learn practical habits before making higher-risk trades." />
          <SeminarAcademy />
        </div>
        <Footer />
      </div>
    </main>
  );
}
