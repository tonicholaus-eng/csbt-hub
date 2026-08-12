import Footer from "../components/Footer";
import Hero from "../components/Hero";
import HomeDeferredSections from "../components/home/HomeDeferredSections";
import Navbar from "../components/Navbar";
import tradingMeta from "../data/tradingMeta.json";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_38%,#fff3dc_65%,#eef9ff_100%)] dark:bg-[linear-gradient(180deg,#07111f_0%,#0a1728_32%,#111c2f_72%,#0b1626_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.85),rgba(255,248,214,.25)_42%,transparent_72%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,.18),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.45)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[0.14] dark:opacity-[0.035]" />
      <div className="pointer-events-none absolute -left-48 top-24 hidden h-[460px] w-[460px] rounded-full bg-yellow-200/20 blur-[72px] dark:bg-blue-500/8 sm:block" />
      <div className="pointer-events-none absolute -right-48 top-[900px] hidden h-[520px] w-[520px] rounded-full bg-cyan-200/15 blur-[78px] dark:bg-cyan-500/8 lg:block" />

      <Navbar />

      <div className="relative z-10 min-w-0 lg:pl-72">
        <div className="mx-auto w-full max-w-[1500px] px-3 pb-20 pt-4 sm:px-6 sm:pb-28 sm:pt-7 lg:px-8 lg:pt-8">
          <Hero
            totalItems={tradingMeta.totalItems}
            categoryCount={Object.keys(tradingMeta.categoryCounts).length}
            generatedAt={tradingMeta.generatedAt}
          />
          <HomeDeferredSections totalItems={tradingMeta.totalItems} />
        </div>

        <div className="home-content-auto">
          <Footer />
        </div>
      </div>
    </main>
  );
}
