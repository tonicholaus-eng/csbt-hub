import MM2Navbar from "../../../components/mm2/MM2Navbar";
import MM2ValuesBrowser from "../../../components/mm2/MM2ValuesBrowser";
import mm2Items from "../../../data/mm2Items.json";

export default function MM2ValuesPage(){
 return <main className="min-h-screen bg-[#07080d] text-white"><MM2Navbar/><div className="lg:pl-[288px]"><div className="mx-auto max-w-[1450px] px-4 py-8 sm:px-6 lg:px-8"><MM2ValuesBrowser items={mm2Items}/></div></div></main>
}
