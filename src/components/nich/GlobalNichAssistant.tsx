"use client";

import { usePathname } from "next/navigation";

import NichAssistant from "./NichAssistant";

export default function GlobalNichAssistant() {
  const pathname = usePathname();

  if (pathname === "/nich") {
    return null;
  }

  return <NichAssistant />;
}