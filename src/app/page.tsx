import Footer from "../components/Footer";
import Hero from "../components/Hero";
import HomeDeferredSections from "../components/home/HomeDeferredSections";
import Navbar from "../components/Navbar";
import tradingMeta from "../data/tradingMeta.json";

export default function Home() {
  return (
    <main className="csbt-page overflow-x-hidden">
      <Navbar />
      <div className="relative z-10 min-w-0 lg:pl-[268px]">
        <div className="csbt-workspace max-w-[1450px] pb-20 sm:pb-28">
          <Hero totalItems={tradingMeta.totalItems} categoryCount={Object.keys(tradingMeta.categoryCounts).length} generatedAt={tradingMeta.generatedAt} />
          <HomeDeferredSections totalItems={tradingMeta.totalItems} generatedAt={tradingMeta.generatedAt} />
        </div>
        <div className="home-content-auto"><Footer /></div>
      </div>
    </main>
  );
}
