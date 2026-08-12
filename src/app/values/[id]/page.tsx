import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "../../../components/Footer";
import Navbar from "../../../components/Navbar";
import PetDetails from "../../../components/PetDetails";
import { getItemById } from "../../../lib/search";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = getItemById(decodeURIComponent(id));
  if (!item) return { title: "Item not found" };
  return { title: `${item.NAME} Values`, description: `Check ${item.NAME} GCash and Elve Shark values, history, rarity, and demand on CSBT HUB.` };
}

export default async function ItemValuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getItemById(decodeURIComponent(id));
  if (!item) notFound();
  return <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 dark:bg-[#07111f] dark:text-slate-100"><Navbar/><div className="relative z-10 min-w-0 lg:pl-72"><div className="mx-auto w-full max-w-[1180px] px-3 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-9 lg:px-8"><PetDetails pet={item}/></div><Footer/></div></main>;
}
