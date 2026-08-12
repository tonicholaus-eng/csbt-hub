import Footer from "../../../components/Footer";
import Navbar from "../../../components/Navbar";
import MiddlemanDesk from "../../../components/exchange/MiddlemanDesk";

export const metadata = {
  title: "Middleman Desk — CSBT Exchange",
  description: "Staff-only CSBT Exchange middleman request queue and case management.",
};

export default function MiddlemanDeskPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-900 dark:bg-[#07111f] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_38%,#fff1dd_68%,#edf7ff_100%)] dark:bg-[linear-gradient(180deg,#07111f_0%,#0b1829_45%,#11182b_100%)]" />
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-72">
        <div className="mx-auto w-full max-w-[1360px] px-3 pb-28 pt-4 sm:px-6 sm:pt-7 lg:px-8 lg:pt-8">
          <MiddlemanDesk />
        </div>
        <Footer />
      </div>
    </main>
  );
}
