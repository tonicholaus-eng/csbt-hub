"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NichAssistant = dynamic(() => import("./NichAssistant"), {
  ssr: false,
});

export default function GlobalNichAssistant() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/nich") return;

    const windowWithIdle = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (windowWithIdle.requestIdleCallback) {
      const idleId = windowWithIdle.requestIdleCallback(() => setReady(true), {
        timeout: 1800,
      });
      return () => windowWithIdle.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  if (pathname === "/nich" || !ready) {
    return null;
  }

  return <NichAssistant />;
}
