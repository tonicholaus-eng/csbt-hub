"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const NichAssistant = dynamic(() => import("./assistant/NichAssistant"), {
  ssr: false,
});

export default function GlobalNichAssistant() {
  const pathname = usePathname();
  const isMM2 = pathname.startsWith("/mm2");

  // Nich may mount on every route, but it must never gate public browsing. Guests
  // can navigate and scroll normally while feature-level auth guards continue to
  // protect account-specific actions. The floating launcher stays hidden on /nich
  // and across MM2 routes while MM2 Nich integration is intentionally disabled.
  return (
    <NichAssistant
      floatingEnabled={pathname !== "/nich" && !isMM2}
      gameTone={isMM2 ? "mm2" : undefined}
    />
  );
}
