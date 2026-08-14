import Footer from "../../../components/Footer";
import Navbar from "../../../components/Navbar";
import ListingDetail from "../../../components/exchange/ListingDetail";
export default async function ExchangeListingPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <main className="csbt-page overflow-x-hidden"><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-workspace max-w-[1450px] pb-28 sm:pb-32"><ListingDetail listingId={id}/></div><Footer/></div></main>}
