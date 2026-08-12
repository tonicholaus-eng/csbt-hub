import Footer from "../../../../components/Footer";
import Navbar from "../../../../components/Navbar";
import TradeRoomExperience from "../../../../components/exchange/TradeRoomExperience";

export default async function ExchangeRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-900 dark:bg-[#07111f] dark:text-white"><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_42%,#fff1dd_100%)] dark:bg-[linear-gradient(180deg,#07111f_0%,#0b1829_45%,#11182b_100%)]"/><Navbar/><div className="relative z-10 min-w-0 lg:pl-72"><div className="mx-auto w-full max-w-[1450px] px-3 pb-28 pt-4 sm:px-6 lg:px-8 lg:pt-8"><TradeRoomExperience roomId={id}/></div><Footer/></div></main>;
}
