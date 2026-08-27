"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const NichAssistant = dynamic(() => import("./assistant/NichAssistant"), {
  ssr: false,
});

export default function GlobalNichAssistant() {
  const pathname = usePathname();
  const isMM2 = pathname.startsWith("/mm2");

  // Onboarding/auth must mount immediately on every route so a signed-out visitor
  // cannot use a feature during the previous idle-load delay. The floating Nich
  // launcher stays hidden on /nich and across MM2 routes while MM2 Nich integration is intentionally disabled.
  // The account gate itself is unchanged on MM2 — it still mounts immediately and
  // still cannot be skipped. `gameTone` only re-skins its surface so MM2 mode does
  // not open on an Adopt Me modal. Adopt Me passes undefined and is untouched.
  return (
    <NichAssistant
      floatingEnabled={pathname !== "/nich" && !isMM2}
      gameTone={isMM2 ? "mm2" : undefined}
    />
  );
}
