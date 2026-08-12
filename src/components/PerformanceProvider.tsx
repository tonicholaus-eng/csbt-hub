"use client";

import { MotionConfig } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";

export default function PerformanceProvider({ children }: { children: ReactNode }) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return (
    <MotionConfig reducedMotion={mobile ? "always" : "user"} transition={{ duration: mobile ? 0.12 : 0.25 }}>
      {children}
    </MotionConfig>
  );
}
