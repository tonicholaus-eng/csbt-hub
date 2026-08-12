import type { Metadata } from "next";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import WishlistWatchlist from "../../components/account/WishlistWatchlist";
export const metadata: Metadata = { title: "Wishlist & Watchlist", description: "Save wanted Adopt Me items and manage CSBT value alerts." };
export default function WishlistPage(){return <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 dark:bg-[#07111f] dark:text-slate-100"><Navbar/><div className="relative z-10 min-w-0 lg:pl-72"><div className="mx-auto w-full max-w-[1320px] px-3 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-9 lg:px-8"><header className="mb-7"><p className="text-xs font-black uppercase tracking-[.2em] text-amber-600 dark:text-amber-300">My CSBT</p><h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white sm:text-5xl">Wishlist & Watchlist</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">Keep the items you want in one place and control which value changes should notify you.</p></header><WishlistWatchlist/></div><Footer/></div></main>}
