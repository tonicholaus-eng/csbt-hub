import MM2Navbar from "../../../../components/mm2/MM2Navbar";
import ModerationDesk from "../../../../components/exchange/ModerationDesk";
export const metadata = { title: "MM2 Exchange Moderation — CSBT HUB" };
export default function MM2ModerationPage(){return <main className="mm2-social-mode min-h-screen bg-[#07080d] text-white"><MM2Navbar/><div className="relative z-10 min-w-0 lg:pl-[288px]"><div className="csbt-app-workspace max-w-[1560px]"><ModerationDesk exchangeBasePath="/mm2/exchange"/></div></div></main>}
