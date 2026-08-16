import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "NICH — CSBT Trading Assistant",
  description: "Ask NICH about Adopt Me trades using CSBT's deterministic values and trading logic, with AI for flexible questions and screenshot understanding.",
  alternates: { canonical: "/nich" },
  openGraph: { title: "NICH — CSBT Trading Assistant", description: "CSBT trading logic for values and calculations, AI for flexible questions and screenshot understanding.", url: "/nich" },
};
export default function NichLayout({ children }: { children: ReactNode }) { return children; }
