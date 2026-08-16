import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Adopt Me Values — GCash & Elve Shark",
  description: "Search the CSBT HUB Adopt Me item database for GCash and Elve Shark values, variants, freshness, and trading context.",
  alternates: { canonical: "/values" },
  openGraph: { title: "Adopt Me Values | CSBT HUB", description: "Search GCash and Elve Shark values across the CSBT HUB Adopt Me database.", url: "/values" },
};

export default function ValuesLayout({ children }: { children: ReactNode }) { return children; }
