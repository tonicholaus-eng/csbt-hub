import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "../../../components/Footer";
import Navbar from "../../../components/Navbar";
import PetDetails from "../../../components/PetDetails";
import { getItemById } from "../../../lib/search";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const{id}=await params;const item=getItemById(decodeURIComponent(id));if(!item)return{title:"Item not found"};return{title:`${item.NAME} Values`,description:`Check ${item.NAME} GCash and Elve Shark values, history, rarity, and demand on CSBT HUB.`}}
export default async function ItemValuePage({params}:{params:Promise<{id:string}>}){const{id}=await params;const item=getItemById(decodeURIComponent(id));if(!item)notFound();return <main className="csbt-page overflow-x-hidden"><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-workspace max-w-[1240px] pb-28 sm:pb-32"><PetDetails pet={item}/></div><Footer/></div></main>}
