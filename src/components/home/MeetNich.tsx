"use client";

import Image from "next/image";
import Link from "next/link";

const capabilities = [
  { icon: "💎", title: "Pet Values", description: "Ask about estimated values for pets in the database." },
  { icon: "⚖️", title: "Trade Advice", description: "Compare offers and understand which side has more value." },
  { icon: "🔍", title: "Nearby Values", description: "Find pets with values close to the amount you provide." },
  { icon: "🧮", title: "Calculator Help", description: "Get guidance while building and reviewing a trade." },
];

export default function MeetNich() {
  return (
    <section aria-labelledby="meet-nich-title" className="home-paint-containment relative min-w-0 overflow-hidden rounded-[36px] border border-white/60 bg-white/78 shadow-[0_22px_64px_rgba(15,23,42,.10)] dark:border-white/10 dark:bg-slate-900/72 dark:shadow-[0_22px_64px_rgba(0,0,0,.28)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_45%,rgba(250,204,21,.16),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(168,85,247,.10),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-violet-500" />

      <div className="relative grid items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-14 lg:py-16">
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center">
          <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-amber-300/25 blur-[55px] dark:bg-amber-400/10 sm:h-72 sm:w-72" />
          <div className="relative h-64 w-64 overflow-hidden rounded-[38px] border-4 border-white/80 bg-gradient-to-br from-yellow-100 via-white to-orange-100 shadow-[0_24px_52px_rgba(245,158,11,.24)] dark:border-white/10 sm:h-80 sm:w-80">
            <Image
              src="/nich/nich-face.png"
              alt="Nich, the CSBT HUB trading assistant"
              fill
              sizes="(max-width: 640px) 256px, 320px"
              loading="lazy"
              className="object-cover object-[38%_8%]"
            />
          </div>
          <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-2 text-xs font-black text-slate-800 shadow-lg dark:border-white/15 dark:bg-slate-950/90 dark:text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,.7)]" />
            Nich is online
          </div>
        </div>

        <div className="min-w-0">
          <span className="inline-flex rounded-full border border-violet-200/80 bg-violet-50/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700 shadow-sm dark:border-violet-400/15 dark:bg-violet-400/10 dark:text-violet-300">
            Built-in Trading Assistant
          </span>
          <h2 id="meet-nich-title" className="mt-5 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">Meet Nich</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            Not sure if a trade is good? Ask Nich for a second look. Nich can check values, compare offers, find nearby-value pets, and guide you through CSBT HUB.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <div key={capability.title} className="rounded-2xl border border-slate-200/70 bg-white/72 p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/[0.045]">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-xl shadow-sm dark:from-amber-400/15 dark:to-orange-400/10">{capability.icon}</span>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 dark:text-white">{capability.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">{capability.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/nich" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-6 py-3 font-black text-white shadow-[0_10px_26px_rgba(249,115,22,.26)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_15px_34px_rgba(249,115,22,.34)]">Ask Nich Now <span aria-hidden="true">→</span></Link>
            <Link href="/values" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-6 py-3 font-black text-slate-800 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-amber-300 hover:text-amber-700 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:hover:text-amber-300">Browse Values</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
