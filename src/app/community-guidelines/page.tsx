import type { Metadata } from "next";
import Navbar from "../../components/Navbar";
export const metadata: Metadata = { title: "Community Guidelines", description: "Safety and conduct rules for CSBT HUB." };
const rules=[
["Trade honestly","No fake listings, item switching, misleading screenshots, fake middleman claims, trust trades, or intentionally deceptive offers."],
["Keep credentials private","Never ask for or share passwords, cookies, recovery codes, authentication codes, or account-access details."],
["Keep negotiations traceable","Use CSBT Exchange and Trade Rooms for the agreed offer. Treat requests to move verification or payment outside CSBT as a warning sign."],
["Respect other members","No harassment, threats, discrimination, doxxing, spam, or targeted abuse."],
["Use reports responsibly","Report genuine safety concerns with useful context. False or retaliatory reports can also be moderated."],
["Verify before completing","Check the locked offer, the Roblox username you are trading with, and every in-game item before confirming completion."],
] as const;
export default function GuidelinesPage(){return <main className="csbt-page"><Navbar/><div className="lg:pl-[268px]"><article className="csbt-app-workspace max-w-4xl"><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--brand-primary)]">CSBT Safety</p><h1 className="mt-2 text-4xl font-black">Community Guidelines</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--foreground-muted)]">These rules apply to CSBT Exchange, Trade Rooms, community posts, chat, reviews, reports, and other member-to-member features.</p><div className="mt-8 grid gap-3">{rules.map(([title,text],i)=><section key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-selected)] text-sm font-black text-[var(--gold-dark)]">{i+1}</span><div><h2 className="font-black">{title}</h2><p className="mt-1 text-sm font-semibold leading-6 text-[var(--foreground-muted)]">{text}</p></div></div></section>)}</div></article></div></main>}
