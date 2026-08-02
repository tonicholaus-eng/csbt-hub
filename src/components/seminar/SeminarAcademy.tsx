"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import {
  safeTradingCommitment,
  seminarMissions,
  totalSeminarXp,
} from "../../data/seminarContent";
import SeminarMission from "./SeminarMission";

const STORAGE_KEY = "csbt-seminar-progress-v1";
const NAME_STORAGE_KEY = "csbt-seminar-name";

const WORLD_ZONES = [
  {
    title: "Rainbow Plaza",
    subtitle: "Meet the community and learn the rules of the academy.",
    emoji: "🌈",
    start: 0,
    end: 3,
    shell:
      "border-violet-300/80 bg-gradient-to-br from-violet-100/95 via-fuchsia-50/95 to-cyan-50/90 dark:border-violet-400/25 dark:from-violet-500/15 dark:via-fuchsia-500/8 dark:to-cyan-500/8",
    label:
      "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white",
  },
  {
    title: "Trade Trail",
    subtitle: "Build safe deals and master the official transaction route.",
    emoji: "🗺️",
    start: 3,
    end: 6,
    shell:
      "border-amber-300/80 bg-gradient-to-br from-amber-100/95 via-orange-50/95 to-rose-50/90 dark:border-amber-400/25 dark:from-amber-500/15 dark:via-orange-500/8 dark:to-rose-500/8",
    label:
      "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white",
  },
  {
    title: "Detective District",
    subtitle: "Inspect receipts, research values, and catch suspicious details.",
    emoji: "🕵️",
    start: 6,
    end: 9,
    shell:
      "border-cyan-300/80 bg-gradient-to-br from-cyan-100/95 via-blue-50/95 to-indigo-50/90 dark:border-cyan-400/25 dark:from-cyan-500/15 dark:via-blue-500/8 dark:to-indigo-500/8",
    label:
      "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white",
  },
  {
    title: "Guardian Galaxy",
    subtitle: "Defend the community, stop scams, and earn graduation.",
    emoji: "🌌",
    start: 9,
    end: 12,
    shell:
      "border-emerald-300/80 bg-gradient-to-br from-emerald-100/95 via-teal-50/95 to-violet-50/90 dark:border-emerald-400/25 dark:from-emerald-500/15 dark:via-teal-500/8 dark:to-violet-500/8",
    label:
      "bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-600 text-white",
  },
] as const;

const missionThemeClasses = {
  violet: {
    card:
      "border-violet-400 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-white text-violet-950 shadow-[0_9px_0_rgba(124,58,237,.22)] dark:border-violet-400/45 dark:from-violet-500/20 dark:via-fuchsia-500/10 dark:to-slate-950 dark:text-violet-100 dark:shadow-[0_9px_0_rgba(139,92,246,.16)]",
    orb: "from-violet-500 via-fuchsia-500 to-pink-500",
    chip: "bg-violet-600 text-white",
    glow: "bg-violet-400/35",
  },
  cyan: {
    card:
      "border-cyan-400 bg-gradient-to-br from-cyan-100 via-sky-50 to-white text-cyan-950 shadow-[0_9px_0_rgba(8,145,178,.22)] dark:border-cyan-400/45 dark:from-cyan-500/20 dark:via-sky-500/10 dark:to-slate-950 dark:text-cyan-100 dark:shadow-[0_9px_0_rgba(34,211,238,.14)]",
    orb: "from-cyan-400 via-sky-500 to-blue-600",
    chip: "bg-cyan-600 text-white",
    glow: "bg-cyan-400/35",
  },
  emerald: {
    card:
      "border-emerald-400 bg-gradient-to-br from-emerald-100 via-teal-50 to-white text-emerald-950 shadow-[0_9px_0_rgba(5,150,105,.22)] dark:border-emerald-400/45 dark:from-emerald-500/20 dark:via-teal-500/10 dark:to-slate-950 dark:text-emerald-100 dark:shadow-[0_9px_0_rgba(52,211,153,.14)]",
    orb: "from-emerald-400 via-teal-500 to-cyan-500",
    chip: "bg-emerald-600 text-white",
    glow: "bg-emerald-400/35",
  },
  amber: {
    card:
      "border-amber-400 bg-gradient-to-br from-amber-100 via-orange-50 to-white text-amber-950 shadow-[0_9px_0_rgba(217,119,6,.22)] dark:border-amber-400/45 dark:from-amber-500/20 dark:via-orange-500/10 dark:to-slate-950 dark:text-amber-100 dark:shadow-[0_9px_0_rgba(251,191,36,.14)]",
    orb: "from-yellow-400 via-amber-500 to-orange-500",
    chip: "bg-amber-500 text-amber-950",
    glow: "bg-amber-400/35",
  },
  rose: {
    card:
      "border-rose-400 bg-gradient-to-br from-rose-100 via-pink-50 to-white text-rose-950 shadow-[0_9px_0_rgba(225,29,72,.2)] dark:border-rose-400/45 dark:from-rose-500/20 dark:via-pink-500/10 dark:to-slate-950 dark:text-rose-100 dark:shadow-[0_9px_0_rgba(251,113,133,.14)]",
    orb: "from-rose-500 via-pink-500 to-fuchsia-500",
    chip: "bg-rose-600 text-white",
    glow: "bg-rose-400/35",
  },
  blue: {
    card:
      "border-blue-400 bg-gradient-to-br from-blue-100 via-indigo-50 to-white text-blue-950 shadow-[0_9px_0_rgba(37,99,235,.2)] dark:border-blue-400/45 dark:from-blue-500/20 dark:via-indigo-500/10 dark:to-slate-950 dark:text-blue-100 dark:shadow-[0_9px_0_rgba(96,165,250,.14)]",
    orb: "from-blue-500 via-indigo-500 to-violet-600",
    chip: "bg-blue-600 text-white",
    glow: "bg-blue-400/35",
  },
} as const;

const missionTiltClasses = [
  "sm:-rotate-[1.2deg]",
  "sm:rotate-[1deg]",
  "sm:-rotate-[0.6deg]",
  "sm:rotate-[1.2deg]",
  "sm:-rotate-[1deg]",
  "sm:rotate-[0.6deg]",
] as const;

export default function SeminarAcademy() {
  const shouldReduceMotion = useReducedMotion();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [activeMissionId, setActiveMissionId] = useState(seminarMissions[0].id);
  const [displayName, setDisplayName] = useState("");
  const [acceptedCommitment, setAcceptedCommitment] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [celebrationMission, setCelebrationMission] = useState<number | null>(null);

  useEffect(() => {
    try {
      const savedProgress = window.localStorage.getItem(STORAGE_KEY);
      const savedName = window.localStorage.getItem(NAME_STORAGE_KEY);

      if (savedProgress) {
        const parsed = JSON.parse(savedProgress) as {
          completedIds?: string[];
          acceptedCommitment?: boolean;
        };

        const validIds = (parsed.completedIds ?? []).filter((id) =>
          seminarMissions.some((mission) => mission.id === id),
        );

        setCompletedIds(validIds);
        setAcceptedCommitment(Boolean(parsed.acceptedCommitment));

        const firstIncomplete = seminarMissions.find(
          (mission) => !validIds.includes(mission.id),
        );

        setActiveMissionId(
          firstIncomplete?.id ?? seminarMissions[seminarMissions.length - 1].id,
        );
      }

      if (savedName) {
        setDisplayName(savedName);
      }
    } catch {
      setCompletedIds([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedIds,
        acceptedCommitment,
      }),
    );
  }, [acceptedCommitment, completedIds, isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(NAME_STORAGE_KEY, displayName);
  }, [displayName, isReady]);

  const activeMission =
    seminarMissions.find((mission) => mission.id === activeMissionId) ??
    seminarMissions[0];

  const completedXp = useMemo(
    () =>
      seminarMissions
        .filter((mission) => completedIds.includes(mission.id))
        .reduce((total, mission) => total + mission.xp, 0),
    [completedIds],
  );

  const progressPercent = Math.round(
    (completedIds.length / seminarMissions.length) * 100,
  );

  const rank = getRank(progressPercent);
  const allComplete = completedIds.length === seminarMissions.length;

  const isMissionUnlocked = (missionIndex: number) =>
    missionIndex === 0 ||
    completedIds.includes(seminarMissions[missionIndex - 1].id);

  const jumpToMission = (missionId: string) => {
    setActiveMissionId(missionId);

    window.setTimeout(() => {
      document.getElementById("seminar-active-mission")?.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
        block: "start",
      });
    }, 20);
  };

  const completeMission = () => {
    if (completedIds.includes(activeMission.id)) {
      return;
    }

    const nextCompletedIds = [...completedIds, activeMission.id];
    setCompletedIds(nextCompletedIds);
    setCelebrationMission(activeMission.number);

    window.setTimeout(() => {
      setCelebrationMission(null);
    }, 1900);

    const currentIndex = seminarMissions.findIndex(
      (mission) => mission.id === activeMission.id,
    );
    const nextMission = seminarMissions[currentIndex + 1];

    if (nextMission) {
      window.setTimeout(() => {
        jumpToMission(nextMission.id);
      }, shouldReduceMotion ? 0 : 700);
    }
  };

  const resetProgress = () => {
    const confirmed = window.confirm(
      "Reset all CSBT Safe Trader Academy progress on this device?",
    );

    if (!confirmed) {
      return;
    }

    setCompletedIds([]);
    setActiveMissionId(seminarMissions[0].id);
    setAcceptedCommitment(false);
  };

  if (!isReady) {
    return (
      <div className="grid min-h-[520px] place-items-center overflow-hidden rounded-[40px] border-4 border-white bg-gradient-to-br from-violet-200 via-pink-100 to-cyan-100 shadow-[0_18px_0_rgba(124,58,237,.18)] dark:border-white/10 dark:from-violet-500/20 dark:via-fuchsia-500/10 dark:to-cyan-500/10">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 animate-bounce items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 text-4xl shadow-2xl">
            🎮
          </div>
          <p className="mt-5 text-sm font-black text-slate-700 dark:text-slate-200">
            Loading your academy adventure…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {celebrationMission !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-slate-950/25 backdrop-blur-sm"
          >
            <motion.div
              initial={{
                scale: shouldReduceMotion ? 1 : 0.55,
                rotate: shouldReduceMotion ? 0 : -6,
                y: shouldReduceMotion ? 0 : 55,
              }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 1.08, opacity: 0 }}
              className="relative overflow-hidden rounded-[36px] border-4 border-white bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 px-8 py-7 text-center text-white shadow-[0_18px_0_rgba(49,46,129,.45)]"
            >
              <div className="absolute -left-5 -top-5 text-5xl">⭐</div>
              <div className="absolute -bottom-5 -right-5 text-5xl">🏆</div>
              <div className="text-6xl">🎉</div>
              <p className="mt-3 text-2xl font-black tracking-tight">
                Mission {celebrationMission} cleared!
              </p>
              <p className="mt-1 text-sm font-bold text-white/80">
                Your XP meter just powered up.
              </p>
            </motion.div>

            {!shouldReduceMotion &&
              ["🎊", "✨", "⭐", "💫", "🎉", "🏆", "🛡️", "📈", "🌈", "💎"].map(
                (emoji, index) => (
                  <motion.span
                    key={`${emoji}-${index}`}
                    initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      x: (index - 4.5) * 92,
                      y: [0, -200 - index * 9, 290],
                      rotate: index % 2 === 0 ? 300 : -300,
                    }}
                    transition={{ duration: 1.75, ease: "easeOut" }}
                    className="absolute text-4xl"
                  >
                    {emoji}
                  </motion.span>
                ),
              )}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative overflow-hidden rounded-[44px] border-4 border-white bg-gradient-to-br from-[#6d28d9] via-[#db2777] to-[#0891b2] px-5 py-8 text-white shadow-[0_18px_0_rgba(67,56,202,.28),0_35px_90px_rgba(76,29,149,.3)] dark:border-white/10 sm:px-8 sm:py-10 lg:px-10 lg:py-12 print:hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(255,255,255,.28),transparent_24%),radial-gradient(circle_at_85%_80%,rgba(250,204,21,.28),transparent_27%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.28)_1.5px,transparent_1.5px)] bg-[size:28px_28px] opacity-35" />

        <motion.div
          aria-hidden="true"
          animate={
            shouldReduceMotion
              ? undefined
              : { y: [0, -12, 0], rotate: [-8, -2, -8] }
          }
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute right-[7%] top-8 hidden text-7xl drop-shadow-2xl md:block"
        >
          🛡️
        </motion.div>
        <motion.div
          aria-hidden="true"
          animate={
            shouldReduceMotion
              ? undefined
              : { y: [0, 10, 0], rotate: [10, 4, 10] }
          }
          transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute bottom-4 left-[43%] hidden text-5xl drop-shadow-2xl lg:block"
        >
          🎲
        </motion.div>

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,.78fr)] lg:items-center">
          <div>
            <span className="inline-flex rotate-[-1deg] items-center gap-2 rounded-full border-2 border-white/35 bg-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200 shadow-lg backdrop-blur">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,.9)]" />
              Adventure learning mode
            </span>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.05em] drop-shadow-[0_5px_0_rgba(30,27,75,.32)] sm:text-5xl lg:text-7xl">
              CSBT Safe Trader
              <span className="block bg-gradient-to-r from-yellow-200 via-white to-cyan-100 bg-clip-text text-transparent">
                Adventure Academy
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-white/85 sm:text-base">
              Travel through four colorful worlds, solve trading challenges, catch
              scams, earn XP, and graduate as a smarter CSBT trader.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  document.getElementById("seminar-mission-map")?.scrollIntoView({
                    behavior: shouldReduceMotion ? "auto" : "smooth",
                  })
                }
                className="rounded-2xl border-2 border-white bg-yellow-300 px-6 py-3.5 text-sm font-black text-violet-950 shadow-[0_7px_0_rgba(113,63,18,.45)] transition hover:-translate-y-1 hover:bg-yellow-200 active:translate-y-1 active:shadow-none"
              >
                {completedIds.length > 0 ? "▶ Resume adventure" : "🚀 Start mission 1"}
              </button>

              <button
                type="button"
                onClick={resetProgress}
                className="rounded-2xl border-2 border-white/35 bg-white/12 px-5 py-3.5 text-sm font-black text-white shadow-[0_6px_0_rgba(49,46,129,.4)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/20 active:translate-y-1 active:shadow-none"
              >
                ↻ Reset progress
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-white/80">
              <span className="rounded-full bg-white/12 px-3 py-2">🎯 12 missions</span>
              <span className="rounded-full bg-white/12 px-3 py-2">🧠 Games + quizzes</span>
              <span className="rounded-full bg-white/12 px-3 py-2">💾 Auto-saved</span>
            </div>
          </div>

          <div className="relative rounded-[34px] border-4 border-white/75 bg-[#111827]/75 p-5 shadow-[0_12px_0_rgba(30,27,75,.45)] backdrop-blur-xl sm:p-6">
            <div className="absolute -right-3 -top-4 rotate-6 rounded-2xl border-2 border-white bg-yellow-300 px-3 py-2 text-xs font-black text-amber-950 shadow-lg">
              PLAYER CARD
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-yellow-300 via-orange-400 to-pink-500 text-3xl shadow-lg ring-4 ring-white/15">
                  {rank.emoji}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    Academy rank
                  </p>
                  <p className="mt-1 text-xl font-black">{rank.label}</p>
                </div>
              </div>

              <span className="rounded-2xl border border-cyan-300/30 bg-cyan-300/15 px-3 py-2 text-xs font-black text-cyan-100">
                {completedXp}/{totalSeminarXp} XP
              </span>
            </div>

            <div className="mt-6 rounded-full border-2 border-white/10 bg-black/25 p-1">
              <div className="relative h-5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-300"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,.45)_50%,transparent_70%)]" />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-bold text-white/75">
              <span>{completedIds.length} of {seminarMissions.length} missions</span>
              <span>{progressPercent}% complete</span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <StatCard label="Missions" value={`${completedIds.length}`} emoji="🎯" />
              <StatCard label="XP" value={`${completedXp}`} emoji="⚡" />
              <StatCard label="Rank" value={rank.shortLabel} emoji="🏅" />
            </div>
          </div>
        </div>
      </section>

      <section
        id="seminar-mission-map"
        className="scroll-mt-8 relative mt-8 overflow-hidden rounded-[42px] border-4 border-white bg-white/82 p-4 shadow-[0_16px_0_rgba(59,130,246,.12),0_35px_90px_rgba(15,23,42,.13)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/78 dark:shadow-[0_16px_0_rgba(139,92,246,.08),0_35px_90px_rgba(0,0,0,.35)] sm:p-6 print:hidden"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,.13),transparent_30%)]" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex rotate-[-1deg] items-center rounded-full bg-violet-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-md">
              🗺️ World map
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
              Choose your next adventure
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              Clear each level to unlock the next world. Your progress stays on this device.
            </p>
          </div>

          <span className="self-start rotate-2 rounded-2xl border-2 border-cyan-300 bg-cyan-100 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-800 shadow-[0_5px_0_rgba(8,145,178,.2)] dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200">
            No account required
          </span>
        </div>

        <div className="relative mt-7 space-y-6">
          {WORLD_ZONES.map((zone, zoneIndex) => (
            <section
              key={zone.title}
              className={`relative overflow-hidden rounded-[32px] border-2 p-4 shadow-sm sm:p-5 ${zone.shell}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.55)_1px,transparent_1px)] bg-[size:24px_24px] opacity-35 dark:opacity-10" />
              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] text-3xl shadow-lg ${zone.label}`}>
                    {zone.emoji}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      World {zoneIndex + 1}
                    </p>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                      {zone.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {zone.subtitle}
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Missions {zone.start + 1}–{zone.end}
                </span>
              </div>

              <div className="relative mt-5 grid gap-4 md:grid-cols-3">
                <div className="pointer-events-none absolute left-[16%] right-[16%] top-1/2 hidden border-t-4 border-dashed border-white/70 md:block dark:border-white/10" />

                {seminarMissions.slice(zone.start, zone.end).map((mission, localIndex) => {
                  const globalIndex = zone.start + localIndex;
                  const completed = completedIds.includes(mission.id);
                  const unlocked = isMissionUnlocked(globalIndex);
                  const active = mission.id === activeMissionId;

                  return (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      globalIndex={globalIndex}
                      completed={completed}
                      unlocked={unlocked}
                      active={active}
                      shouldReduceMotion={shouldReduceMotion}
                      onSelect={() => jumpToMission(mission.id)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section id="seminar-active-mission" className="scroll-mt-6 mt-8 print:hidden">
        <SeminarMission
          mission={activeMission}
          completed={completedIds.includes(activeMission.id)}
          onComplete={completeMission}
          shouldReduceMotion={shouldReduceMotion}
        />
      </section>

      <section className="relative mt-8 overflow-hidden rounded-[34px] border-4 border-yellow-300 bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-5 shadow-[0_10px_0_rgba(217,119,6,.18)] dark:border-yellow-400/30 dark:from-yellow-500/15 dark:via-amber-500/8 dark:to-orange-500/10 sm:p-7 print:hidden">
        <div className="pointer-events-none absolute -right-4 -top-6 rotate-12 text-7xl opacity-20">⚠️</div>
        <div className="relative flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border-2 border-amber-400 bg-yellow-300 text-3xl shadow-[0_5px_0_rgba(217,119,6,.25)] dark:border-yellow-400/30 dark:bg-yellow-400/15">
            📣
          </div>
          <div>
            <h2 className="text-xl font-black text-amber-950 dark:text-amber-100">
              Live policy power-check
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-amber-900/80 dark:text-amber-100/75">
              The academy teaches safety habits from the seminar handbook. Before a real
              transaction, confirm the latest official CSBT staff list, payment method,
              fee, time limit, cancellation rule, and penalties.
            </p>
          </div>
        </div>
      </section>

      {allComplete && (
        <section className="relative mt-8 overflow-hidden rounded-[42px] border-4 border-white bg-gradient-to-br from-emerald-200 via-cyan-100 to-violet-200 p-5 shadow-[0_16px_0_rgba(16,185,129,.18),0_32px_80px_rgba(16,185,129,.16)] dark:border-white/10 dark:from-emerald-500/18 dark:via-cyan-500/10 dark:to-violet-500/15 sm:p-8 print:border-0 print:bg-white print:shadow-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.7)_1.5px,transparent_1.5px)] bg-[size:28px_28px] opacity-30 dark:opacity-10" />

          <div className="relative print:hidden">
            <span className="inline-flex rotate-[-2deg] items-center gap-2 rounded-2xl border-2 border-white bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg">
              🎓 Final level unlocked
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
              Claim your Safe Trader graduation
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
              Add your CSBT name, read the commitment, and unlock your colorful
              completion card.
            </p>

            <label className="mt-6 block max-w-lg">
              <span className="mb-2 block text-xs font-black text-slate-700 dark:text-slate-200">
                Name on your completion card
              </span>
              <input
                value={displayName}
                onChange={(event: { target: { value: string } }) =>
                  setDisplayName(event.target.value.slice(0, 40))
                }
                placeholder="Your CSBT name"
                className="w-full rounded-2xl border-[3px] border-emerald-300 bg-white px-4 py-3.5 text-sm font-bold text-slate-900 shadow-[0_6px_0_rgba(16,185,129,.15)] outline-none transition focus:-translate-y-0.5 focus:border-violet-400 focus:ring-4 focus:ring-violet-400/15 dark:border-emerald-400/25 dark:bg-slate-950/70 dark:text-white"
              />
            </label>

            <blockquote className="mt-6 max-w-4xl rotate-[-.35deg] rounded-[28px] border-[3px] border-white bg-white/80 p-5 text-sm font-semibold leading-7 text-slate-700 shadow-[0_8px_0_rgba(139,92,246,.12)] dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200">
              “{safeTradingCommitment}”
            </blockquote>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={displayName.trim().length < 2}
                onClick={() => setAcceptedCommitment(true)}
                className="rounded-2xl border-2 border-white bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_7px_0_rgba(5,150,105,.3)] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45"
              >
                ✨ I accept the commitment
              </button>

              {acceptedCommitment && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-3.5 text-sm font-black text-slate-700 shadow-[0_6px_0_rgba(15,23,42,.12)] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none dark:border-white/15 dark:bg-white/8 dark:text-white"
                >
                  🖨️ Print completion card
                </button>
              )}
            </div>
          </div>

          {acceptedCommitment && (
            <CompletionCard
              displayName={displayName.trim() || "CSBT Member"}
              completedXp={completedXp}
              rankLabel={rank.label}
            />
          )}
        </section>
      )}
    </div>
  );
}

function MissionCard({
  mission,
  globalIndex,
  completed,
  unlocked,
  active,
  shouldReduceMotion,
  onSelect,
}: {
  mission: (typeof seminarMissions)[number];
  globalIndex: number;
  completed: boolean;
  unlocked: boolean;
  active: boolean;
  shouldReduceMotion: boolean | null;
  onSelect: () => void;
}) {
  const theme = missionThemeClasses[mission.theme];
  const tilt = missionTiltClasses[globalIndex % missionTiltClasses.length];

  return (
    <motion.button
      type="button"
      disabled={!unlocked}
      whileHover={
        shouldReduceMotion || !unlocked
          ? undefined
          : { y: -7, rotate: globalIndex % 2 === 0 ? 1.2 : -1.2, scale: 1.015 }
      }
      whileTap={shouldReduceMotion || !unlocked ? undefined : { scale: 0.98, y: 2 }}
      onClick={onSelect}
      className={`group relative z-10 min-h-[245px] overflow-hidden rounded-[28px] border-2 p-4 text-left transition duration-300 disabled:cursor-not-allowed ${theme.card} ${tilt} ${
        active
          ? "ring-4 ring-white ring-offset-4 ring-offset-violet-300/50 dark:ring-white/30 dark:ring-offset-slate-900"
          : ""
      }`}
    >
      <div className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl ${theme.glow}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:22px_22px] opacity-30 dark:opacity-10" />

      {!unlocked && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/48 backdrop-blur-[1px] dark:bg-slate-950/48">
          <div className="rotate-[-4deg] rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-center text-slate-600 shadow-[0_5px_0_rgba(15,23,42,.12)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-300">
            <div className="text-2xl">🔒</div>
            <p className="mt-1 text-[9px] font-black uppercase tracking-wider">
              Clear previous level
            </p>
          </div>
        </div>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br text-3xl text-white shadow-xl ring-4 ring-white/60 dark:ring-white/10 ${theme.orb}`}>
          {completed ? "✅" : mission.emoji}
        </div>

        <span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider shadow-sm ${completed ? "bg-emerald-600 text-white" : theme.chip}`}>
          {completed ? "Cleared" : `${mission.xp} XP`}
        </span>
      </div>

      <div className="relative mt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
          Level {mission.number}
        </p>
        <h4 className="mt-1 text-xl font-black tracking-tight">{mission.shortTitle}</h4>
        <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 opacity-75">
          {mission.description}
        </p>
      </div>

      <div className="relative mt-5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider opacity-70">
        <span>⏱ {mission.minutes} min</span>
        <span>{completed ? "Replay ↻" : active ? "Playing now" : "Play →"}</span>
      </div>
    </motion.button>
  );
}

function StatCard({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string;
  emoji: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/8 px-3 py-3 shadow-inner">
      <div className="text-lg">{emoji}</div>
      <p className="mt-1 truncate text-base font-black text-white">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-white/55">
        {label}
      </p>
    </div>
  );
}

function CompletionCard({
  displayName,
  completedXp,
  rankLabel,
}: {
  displayName: string;
  completedXp: number;
  rankLabel: string;
}) {
  const completionDate = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="relative mt-8 overflow-hidden rounded-[36px] border-4 border-white bg-gradient-to-br from-yellow-100 via-white to-cyan-100 p-6 text-center shadow-[0_14px_0_rgba(16,185,129,.18)] dark:border-white/10 dark:from-amber-500/10 dark:via-slate-950 dark:to-cyan-500/10 sm:p-10 print:mt-0 print:min-h-[650px] print:border-[8px] print:border-emerald-500 print:bg-white print:p-16 print:shadow-none">
      <div className="pointer-events-none absolute left-5 top-5 text-4xl">⭐</div>
      <div className="pointer-events-none absolute right-5 top-6 text-4xl">🌈</div>
      <div className="pointer-events-none absolute bottom-5 left-8 text-4xl">🛡️</div>
      <div className="pointer-events-none absolute bottom-5 right-8 text-4xl">🏆</div>

      <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-600 dark:text-violet-300">
        CSBT Safe Trader Adventure Academy
      </p>
      <div className="mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-[32px] border-4 border-white bg-gradient-to-br from-yellow-300 via-pink-500 to-cyan-500 text-5xl text-white shadow-xl">
        🎓
      </div>
      <p className="mt-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        This colorful achievement belongs to
      </p>
      <h3 className="mt-2 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-cyan-600 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">
        {displayName}
      </h3>
      <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        for clearing all twelve academy missions and accepting the CSBT Safe
        Trading Commitment.
      </p>

      <div className="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
        <CertificateStat label="Missions" value="12 / 12" emoji="🎯" />
        <CertificateStat label="Academy XP" value={`${completedXp}`} emoji="⚡" />
        <CertificateStat label="Rank" value={rankLabel} emoji="🏅" />
      </div>

      <p className="mt-8 text-xs font-bold text-slate-500 dark:text-slate-400">
        Completed on {completionDate}
      </p>
      <p className="mt-2 text-[10px] leading-5 text-slate-400 dark:text-slate-500">
        This is a learning achievement card, not a professional license or a
        guarantee that every transaction will be risk-free.
      </p>
    </div>
  );
}

function CertificateStat({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string;
  emoji: string;
}) {
  return (
    <div className="rounded-[24px] border-2 border-white bg-white/80 px-4 py-4 shadow-[0_6px_0_rgba(139,92,246,.12)] dark:border-white/10 dark:bg-white/5">
      <div className="text-2xl">{emoji}</div>
      <p className="mt-1 text-lg font-black text-violet-800 dark:text-violet-200">
        {value}
      </p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}

function getRank(progressPercent: number) {
  if (progressPercent >= 100) {
    return {
      label: "Certified CSBT Safe Trader",
      shortLabel: "Certified",
      emoji: "🏆",
    };
  }

  if (progressPercent >= 75) {
    return {
      label: "Scam Spotter",
      shortLabel: "Spotter",
      emoji: "🕵️",
    };
  }

  if (progressPercent >= 40) {
    return {
      label: "Careful Trader",
      shortLabel: "Careful",
      emoji: "🛡️",
    };
  }

  return {
    label: "Trading Rookie",
    shortLabel: "Rookie",
    emoji: "🌱",
  };
}