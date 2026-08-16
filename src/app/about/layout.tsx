import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About CSBT HUB",
  description: "Learn how CSBT HUB connects Adopt Me values, inventories, trading tools, Exchange, community, NICH, and safer-trading features.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About CSBT HUB", description: "A connected Adopt Me trading companion for values, trades, collections, community, and safety.", url: "/about" },
};
export default function AboutLayout({ children }: { children: ReactNode }) { return children; }
