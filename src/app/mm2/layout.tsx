import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MM2 Values, Demand & Trading",
  description: "CSBT HUB Murder Mystery 2 trading values, demand tracking, and trade tools.",
};

export default function MM2Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
