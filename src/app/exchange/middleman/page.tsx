
import Navbar from "../../../components/Navbar";
import MiddlemanDesk from "../../../components/exchange/MiddlemanDesk";
export const metadata={title:"Middleman Desk — CSBT Exchange",description:"Staff-only CSBT Exchange middleman request queue and case management."};
export default function MiddlemanDeskPage(){return <main className="csbt-page overflow-x-hidden"><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-app-workspace max-w-[1560px]"><MiddlemanDesk/></div></div></main>}
