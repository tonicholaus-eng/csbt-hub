
import Navbar from "../../../../components/Navbar";
import TradeRoomExperience from "../../../../components/exchange/TradeRoomExperience";
export default async function ExchangeRoomPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <main className="csbt-page overflow-x-hidden"><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-app-workspace max-w-[1640px]"><TradeRoomExperience roomId={id}/></div></div></main>}
