import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "NICH — CSBT Trading Assistant",
  description: "Ask NICH about Adopt Me values, trades and demand. Answers come from CSBT values, and you can send a screenshot of a trade instead of typing it.",
  alternates: { canonical: "/nich" },
  openGraph: { title: "NICH — CSBT Trading Assistant", description: "Check values, compare trades and read demand — or send NICH a screenshot of the trade.", url: "/nich" },
};
export default function NichLayout({ children }: { children: ReactNode }) { return children; }
