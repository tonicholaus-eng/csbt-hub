
import Navbar from "../../../components/Navbar";
import ModerationDesk from "../../../components/exchange/ModerationDesk";
export const metadata={title:"Moderation Desk — CSBT Exchange",description:"Staff-only CSBT Exchange safety and report moderation queue."};
export default function ExchangeModerationPage(){return <main className="csbt-page overflow-x-hidden"><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-app-workspace max-w-[1560px]"><ModerationDesk/></div></div></main>}
