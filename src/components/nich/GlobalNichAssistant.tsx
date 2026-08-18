"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const NichAssistant = dynamic(() => import("./assistant/NichAssistant"), {
  ssr: false,
});

export default function GlobalNichAssistant() {
  const pathname = usePathname();

  // Onboarding/auth must mount immediately on every route so a signed-out visitor
  // cannot use a feature during the previous idle-load delay. The floating Nich
  // launcher itself stays hidden on /nich because that page already contains Nich.
  return <NichAssistant floatingEnabled={pathname !== "/nich"} />;
}
