
import Navbar from "../../../components/Navbar";
import ListingDetail from "../../../components/exchange/ListingDetail";
export default async function ExchangeListingPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <main className="csbt-page overflow-x-hidden"><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-app-workspace max-w-[1640px]"><ListingDetail listingId={id}/></div></div></main>}
