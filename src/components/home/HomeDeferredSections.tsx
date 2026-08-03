"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const QuickActions = dynamic(() => import("./QuickActions"), {
  ssr: false,
  loading: () => <SectionSkeleton height="560px" />,
});

const PopularPets = dynamic(() => import("../PopularPets"), {
  ssr: false,
  loading: () => <SectionSkeleton height="980px" />,
});

const MeetNich = dynamic(() => import("./MeetNich"), {
  ssr: false,
  loading: () => <SectionSkeleton height="680px" />,
});

const Stats = dynamic(() => import("../Stats"), {
  ssr: false,
  loading: () => <SectionSkeleton height="620px" />,
});

function SectionSkeleton({ height }: { height: string }) {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-[32px] border border-white/40 bg-white/30 dark:border-white/5 dark:bg-white/[0.025]"
      style={{ minHeight: height }}
    />
  );
}

function LazyMount({
  children,
  minHeight,
}: {
  children: ReactNode;
  minHeight: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div ref={ref} className="home-content-auto" style={{ minHeight }}>
      {ready ? children : <SectionSkeleton height={minHeight} />}
    </div>
  );
}

export default function HomeDeferredSections({
  totalItems,
}: {
  totalItems: number;
}) {
  return (
    <>
      <div className="mt-16 sm:mt-24">
        <LazyMount minHeight="560px">
          <QuickActions />
        </LazyMount>
      </div>

      <section className="mt-20 sm:mt-28">
        <LazyMount minHeight="980px">
          <PopularPets />
        </LazyMount>
      </section>

      <div className="mt-20 sm:mt-28">
        <LazyMount minHeight="680px">
          <MeetNich />
        </LazyMount>
      </div>

      <section className="mt-20 sm:mt-28">
        <LazyMount minHeight="620px">
          <Stats totalPets={totalItems} />
        </LazyMount>
      </section>
    </>
  );
}
