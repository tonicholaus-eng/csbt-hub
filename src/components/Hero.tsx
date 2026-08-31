"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ItemSearchPicker from "./items/ItemSearchPicker";
import { useCSBTTheme } from "./ThemeProvider";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { PointerEvent } from "react";

type HeroProps = {
  totalItems: number;
  categoryCount: number;
  generatedAt: string;
};

const featureItems = [
  { icon: "🔍", label: "Check Values" },
  { icon: "⚖️", label: "Compare Trades" },
  { icon: "📈", label: "Demand Trends" },
  { icon: "🤖", label: "Ask NICH" },
] as const;

function formatRefreshDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently refreshed";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export default function Hero({ totalItems, categoryCount, generatedAt }: HeroProps) {
  const { theme } = useCSBTTheme();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const smoothX = useSpring(pointerX, {
    stiffness: 110,
    damping: 24,
    mass: 0.45,
  });

  const smoothY = useSpring(pointerY, {
    stiffness: 110,
    damping: 24,
    mass: 0.45,
  });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [1.8, -1.8]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-1.8, 1.8]);

  const glowX = useTransform(smoothX, [-0.5, 0.5], [-90, 90]);
  const glowY = useTransform(smoothY, [-0.5, 0.5], [-60, 60]);

  const topCircleX = useTransform(smoothX, [-0.5, 0.5], [18, -18]);
  const topCircleY = useTransform(smoothY, [-0.5, 0.5], [14, -14]);

  const bottomCircleX = useTransform(smoothX, [-0.5, 0.5], [-15, 15]);
  const bottomCircleY = useTransform(smoothY, [-0.5, 0.5], [-12, 12]);

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (shouldReduceMotion || event.pointerType !== "mouse") {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    pointerX.set(x);
    pointerY.set(y);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  const stats = [
    {
      value: `${totalItems.toLocaleString()}+`,
      label: "Items",
      description: "Tracked values",
    },
    {
      value: `${categoryCount}`,
      label: "Categories",
      description: "Across the CSBT database",
    },
    {
      value: "💎",
      label: "2 Value Sources",
      description: "GCash + Elve Shark",
    },
    {
      value: "🤖",
      label: "NICH Assistant",
      description: "Help anytime you need it",
    },
  ] as const;

  const refreshedLabel = formatRefreshDate(generatedAt);

  // Dark intentionally keeps the literal original Hero gradient from the old CSBT build.
  // Only the two alternate appearance themes override the background.
  const alternateThemeBackground =
    theme === "halloween"
      ? "linear-gradient(135deg, #120916 0%, #35113f 55%, #ff7a00 100%)"
      : theme === "light"
        ? "linear-gradient(135deg, #79c8ff 0%, #4aa8ff 52%, #2e8bff 100%)"
        : undefined;

  return (
    <motion.section
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        shouldReduceMotion
          ? alternateThemeBackground
            ? { backgroundImage: alternateThemeBackground }
            : undefined
          : {
              rotateX,
              rotateY,
              transformPerspective: 1600,
              ...(alternateThemeBackground
                ? { backgroundImage: alternateThemeBackground }
                : {}),
            }
      }
      className="
        home-paint-containment
        relative
        overflow-hidden
        rounded-[34px]
        border
        border-white/30
        bg-gradient-to-br
        from-amber-500
        via-yellow-400
        to-orange-500
        px-5
        py-12
        text-white
        shadow-[0_24px_70px_rgba(251,146,60,.30)]
        will-change-transform
        dark:shadow-[0_24px_75px_rgba(0,0,0,.42)]
        sm:rounded-[40px]
        sm:px-8
        md:py-20
      "
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.30),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,.11)_45%,transparent_70%)]" />

      <motion.div
        aria-hidden="true"
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: glowX,
                y: glowY,
              }
        }
        className="pointer-events-none absolute -left-32 -top-32 hidden h-[500px] w-[500px] rounded-full bg-white/20 blur-[90px] will-change-transform md:block"
      />

      <motion.div
        aria-hidden="true"
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: topCircleX,
                y: topCircleY,
              }
        }
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/15 will-change-transform"
      />

      <motion.div
        aria-hidden="true"
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: bottomCircleX,
                y: bottomCircleY,
              }
        }
        className="pointer-events-none absolute -bottom-36 -left-24 h-72 w-72 rounded-full border border-white/10 will-change-transform"
      />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/18 px-5 py-2 text-sm font-bold shadow-md">
          <span aria-hidden="true">🚀</span>
          Database refreshed {refreshedLabel}
        </span>

        {/* The game switch used to live here, which is why it disappeared the
            moment a user chose any appearance other than the default — each one
            renders its own hero. It is now in the shared sidebar and mobile
            header instead, where every appearance and every page keeps it. */}

        <h1 className="mt-8 text-4xl font-black tracking-tight drop-shadow-lg sm:text-6xl md:text-8xl">
          CSBT HUB
        </h1>

        <p className="mx-auto mt-7 max-w-3xl text-lg leading-relaxed text-white/90 sm:text-xl md:text-2xl">
          <strong className="text-white">Know the value. Build the trade. Find the trader.</strong>
          {" "}CSBT connects values, inventory, trading tools, Exchange, community opinions, and NICH in one hub.
        </p>

        <div className="mx-auto mt-8 max-w-2xl text-left">
          <div className="rounded-[22px] border border-white/25 bg-slate-950/20 p-2 shadow-xl backdrop-blur-md">
            <ItemSearchPicker
              onSelect={(item) => router.push(`/values/${encodeURIComponent(item.ID)}`)}
              placeholder="Search Frost Dragon, FD, SSBD, or any Adopt Me item…"
            />
          </div>
          <p className="mt-2 text-center text-xs font-bold text-white/70">Start with an item. From its page you can value it, watch it, add it to inventory, build a trade, or find traders.</p>
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-3 sm:gap-4">
          {featureItems.map((item) => (
            <span
              key={item.label}
              className="rounded-full border border-white/20 bg-white/14 px-5 py-3 font-bold shadow-md transition-transform duration-200 hover:-translate-y-1"
            >
              {item.icon} {item.label}
            </span>
          ))}
        </div>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/values"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-6 py-3 font-black text-amber-700 shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            Browse Values
          </Link>

          <Link
            href="/calculator"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/30 bg-white/14 px-6 py-3 font-black text-white shadow-md transition duration-200 hover:-translate-y-1 hover:bg-white/22 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            Compare a Trade
          </Link>

          <Link
            href="/nich"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/30 bg-slate-950/20 px-6 py-3 font-black text-white shadow-md transition duration-200 hover:-translate-y-1 hover:bg-slate-950/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            Ask Nich
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-white/22 bg-white/14 p-5 shadow-lg transition-transform duration-200 hover:-translate-y-1 sm:p-6"
            >
              <div className="text-4xl font-black sm:text-5xl">{item.value}</div>
              <p className="mt-3 font-black text-white">{item.label}</p>
              <p className="mt-1 text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}