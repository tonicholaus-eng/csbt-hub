import type { Metadata } from "next";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import SeminarAcademy from "../../components/seminar/SeminarAcademy";

export const metadata: Metadata = {
  title: "Safe Trader Academy",
  description:
    "Complete playful CSBT seminar missions about safe transactions, scam prevention, payment verification, community conduct, and responsible trading.",
};

export default function SeminarPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff4dc] text-slate-800 transition-colors duration-300 dark:bg-[#060816] dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#c9f5ff_0%,#eefbff_20%,#fff3c4_45%,#ffdff3_72%,#e5dcff_100%)] transition-opacity duration-300 dark:opacity-0" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 dark:opacity-100 dark:bg-[linear-gradient(180deg,#071225_0%,#11133a_30%,#28143a_63%,#091624_100%)]" />

      <div className="pointer-events-none absolute -left-24 top-24 h-[420px] w-[420px] rounded-full bg-cyan-300/35 blur-[95px] dark:bg-cyan-500/15" />
      <div className="pointer-events-none absolute -right-24 top-48 h-[460px] w-[460px] rounded-full bg-fuchsia-300/35 blur-[100px] dark:bg-fuchsia-500/15" />
      <div className="pointer-events-none absolute left-[35%] top-[760px] h-[430px] w-[430px] rounded-full bg-amber-300/28 blur-[110px] dark:bg-amber-500/10" />
      <div className="pointer-events-none absolute right-[10%] top-[1500px] h-[500px] w-[500px] rounded-full bg-violet-300/28 blur-[110px] dark:bg-violet-500/10" />

      <div className="pointer-events-none absolute inset-0 opacity-35 dark:opacity-[0.08]">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.95)_1.5px,transparent_1.5px)] bg-[size:34px_34px]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0_46%,rgba(255,255,255,.18)_46%_54%,transparent_54%_100%)] bg-[size:120px_120px]" />
      </div>

      <div className="pointer-events-none absolute left-[5%] top-36 hidden rotate-[-12deg] text-5xl drop-shadow-xl xl:block">
        🌈
      </div>
      <div className="pointer-events-none absolute right-[5%] top-[520px] hidden rotate-12 text-5xl drop-shadow-xl xl:block">
        ⭐
      </div>
      <div className="pointer-events-none absolute left-[8%] top-[1180px] hidden -rotate-6 text-5xl drop-shadow-xl xl:block">
        🧩
      </div>

      <Navbar />

      <div className="relative z-10 min-w-0 transition-[padding] duration-300 lg:pl-72">
        <div className="mx-auto w-full max-w-[1500px] px-3 pb-24 pt-6 sm:px-6 sm:pb-32 sm:pt-8 lg:px-8 lg:pt-10">
          <SeminarAcademy />
        </div>

        <Footer />
      </div>
    </main>
  );
}