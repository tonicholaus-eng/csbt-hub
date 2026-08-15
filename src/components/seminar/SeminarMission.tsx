"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ClassifyActivity,
  MultiSelectActivity,
  SeminarActivity,
  SeminarMission as SeminarMissionData,
  SequenceActivity,
} from "../../data/seminarContent";
import SeminarQuiz from "./SeminarQuiz";

type SeminarMissionProps = {
  mission: SeminarMissionData;
  completed: boolean;
  onComplete: () => void;
  shouldReduceMotion: boolean | null;
};

const themeStyles = {
  violet: {
    soft: "from-violet-400/35 via-fuchsia-300/18 to-transparent",
    badge:
      "border-violet-400 bg-violet-600 text-white shadow-[0_4px_0_rgba(91,33,182,.24)] dark:border-violet-300/30 dark:bg-violet-500/25 dark:text-violet-100",
    button:
      "from-violet-600 via-fuchsia-500 to-cyan-500 shadow-[0_7px_0_rgba(91,33,182,.28)]",
  },
  cyan: {
    soft: "from-cyan-400/35 via-sky-300/18 to-transparent",
    badge:
      "border-cyan-400 bg-cyan-600 text-white shadow-[0_4px_0_rgba(14,116,144,.24)] dark:border-cyan-300/30 dark:bg-cyan-500/25 dark:text-cyan-100",
    button: "from-cyan-500 via-sky-500 to-blue-600 shadow-[0_7px_0_rgba(14,116,144,.28)]",
  },
  emerald: {
    soft: "from-emerald-400/35 via-teal-300/18 to-transparent",
    badge:
      "border-emerald-400 bg-emerald-600 text-white shadow-[0_4px_0_rgba(5,150,105,.24)] dark:border-emerald-300/30 dark:bg-emerald-500/25 dark:text-emerald-100",
    button:
      "from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_7px_0_rgba(5,150,105,.28)]",
  },
  amber: {
    soft: "from-amber-400/38 via-orange-300/18 to-transparent",
    badge:
      "border-amber-400 bg-amber-400 text-amber-950 shadow-[0_4px_0_rgba(180,83,9,.22)] dark:border-amber-300/30 dark:bg-amber-400/22 dark:text-amber-100",
    button:
      "from-yellow-400 via-orange-500 to-rose-500 shadow-[0_7px_0_rgba(180,83,9,.28)]",
  },
  rose: {
    soft: "from-rose-400/35 via-pink-300/18 to-transparent",
    badge:
      "border-rose-400 bg-rose-600 text-white shadow-[0_4px_0_rgba(190,24,93,.24)] dark:border-rose-300/30 dark:bg-rose-500/25 dark:text-rose-100",
    button: "from-rose-500 via-pink-500 to-violet-600 shadow-[0_7px_0_rgba(190,24,93,.28)]",
  },
  blue: {
    soft: "from-blue-400/35 via-indigo-300/18 to-transparent",
    badge:
      "border-blue-400 bg-blue-600 text-white shadow-[0_4px_0_rgba(29,78,216,.24)] dark:border-blue-300/30 dark:bg-blue-500/25 dark:text-blue-100",
    button: "from-blue-500 via-indigo-500 to-violet-600 shadow-[0_7px_0_rgba(29,78,216,.28)]",
  },
} as const;

export default function SeminarMission({
  mission,
  completed,
  onComplete,
  shouldReduceMotion,
}: SeminarMissionProps) {
  const [activityPassed, setActivityPassed] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  const resetQuizPassed = useCallback((passed: boolean) => {
    setQuizPassed(passed);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setActivityPassed(false));
    queueMicrotask(() => setQuizPassed(false));
  }, [mission.id]);

  const theme = themeStyles[mission.theme];
  const canComplete = activityPassed && quizPassed;

  return (
    <motion.article
      key={mission.id}
      initial={{
        opacity: 0,
        y: shouldReduceMotion ? 0 : 18,
      }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
      className="relative overflow-hidden rounded-[42px] border-4 border-white bg-gradient-to-br from-white/95 via-white/88 to-violet-50/82 shadow-[0_16px_0_rgba(139,92,246,.13),0_32px_90px_rgba(15,23,42,.16)] backdrop-blur-2xl dark:border-white/10 dark:from-slate-950/92 dark:via-slate-950/86 dark:to-violet-950/28 dark:shadow-[0_16px_0_rgba(139,92,246,.08),0_35px_90px_rgba(0,0,0,.4)]"
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.soft}`}
      />
      <div className="pointer-events-none absolute -right-5 top-20 rotate-12 text-6xl opacity-10">
        {mission.emoji}
      </div>
      <div className="pointer-events-none absolute left-5 top-5 text-2xl opacity-35">✨</div>

      <div className="relative p-5 sm:p-7 lg:p-9">
        <header className="relative flex flex-col gap-5 rounded-[30px] border-[3px] border-white bg-white/72 p-5 shadow-[0_8px_0_rgba(139,92,246,.10)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <motion.div
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      rotate: -5,
                      scale: 1.08,
                    }
              }
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border-4 border-white bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 text-4xl shadow-[0_8px_0_rgba(91,33,182,.25)] dark:border-white/10"
            >
              {mission.emoji}
            </motion.div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${theme.badge}`}
                >
                  Mission {mission.number}
                </span>
                <span className="rounded-full border-2 border-cyan-300 bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-800 shadow-sm dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200">
                  {mission.minutes} min
                </span>
                <span className="rounded-full border-2 border-yellow-300 bg-yellow-200 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-950 shadow-sm dark:border-yellow-400/25 dark:bg-yellow-400/10 dark:text-yellow-200">
                  +{mission.xp} XP
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {mission.title}
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-base">
                {mission.description}
              </p>
            </div>
          </div>

          {completed && (
            <span className="inline-flex shrink-0 rotate-2 items-center gap-2 self-start rounded-2xl border-2 border-emerald-400 bg-emerald-500 px-4 py-2.5 text-xs font-black text-white shadow-[0_5px_0_rgba(5,150,105,.25)] dark:border-emerald-300/25">
              ✓ Mission complete
            </span>
          )}
        </header>

        {mission.policySensitive && (
          <div className="mt-6 rotate-[-.35deg] rounded-[24px] border-[3px] border-yellow-400 bg-gradient-to-r from-yellow-100 via-amber-50 to-orange-100 p-4 text-sm font-semibold leading-6 text-amber-950 shadow-[0_7px_0_rgba(217,119,6,.16)] dark:border-yellow-400/30 dark:from-yellow-500/15 dark:via-amber-500/8 dark:to-orange-500/10 dark:text-amber-100">
            <p className="font-black">⚠ Current policy check</p>
            <p className="mt-1 text-xs leading-5 opacity-85">
              Official staff lists, approved payment methods, fees, time limits,
              cancellation rules, and penalties may change. Confirm the latest CSBT
              announcement before using policy-sensitive details.
            </p>
          </div>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)]">
          <div className="relative overflow-hidden rounded-[28px] border-[3px] border-violet-200 bg-gradient-to-br from-violet-100/90 via-fuchsia-50/80 to-white p-5 shadow-[0_8px_0_rgba(139,92,246,.10)] dark:border-violet-400/20 dark:from-violet-500/14 dark:via-fuchsia-500/7 dark:to-white/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Mission objective
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-800 dark:text-slate-200">
              {mission.objective}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border-[3px] border-cyan-200 bg-gradient-to-br from-cyan-100/90 via-blue-50/75 to-white p-5 shadow-[0_8px_0_rgba(8,145,178,.10)] dark:border-cyan-400/20 dark:from-cyan-500/14 dark:via-blue-500/7 dark:to-white/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Power notes
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {mission.keyPoints.map((point) => (
                <div
                  key={point}
                  className="flex gap-2 rounded-2xl border border-white bg-white/78 px-3 py-3 text-xs font-semibold leading-5 text-slate-700 shadow-sm dark:border-white/8 dark:bg-slate-950/38 dark:text-slate-300"
                >
                  <span className="mt-0.5 text-emerald-500">✦</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6">
          <ActivityPanel
            activity={mission.activity}
            onPassed={setActivityPassed}
            shouldReduceMotion={shouldReduceMotion}
          />
        </div>

        <div className="mt-6">
          <SeminarQuiz
            questions={mission.quiz}
            onPassed={resetQuizPassed}
            shouldReduceMotion={shouldReduceMotion}
          />
        </div>

        <footer className="mt-7 flex flex-col gap-3 rounded-[30px] border-[3px] border-yellow-200 bg-gradient-to-r from-yellow-100/90 via-white to-cyan-100/70 p-5 shadow-[0_8px_0_rgba(250,204,21,.12)] dark:border-yellow-400/18 dark:from-yellow-500/10 dark:via-white/[0.035] dark:to-cyan-500/8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              Mission requirements
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Complete the activity and pass every checkpoint question.
            </p>
          </div>

          <button
            type="button"
            onClick={onComplete}
            disabled={!canComplete || completed}
            className={`rounded-2xl bg-gradient-to-r px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 ${theme.button}`}
          >
            {completed
              ? "Mission completed"
              : canComplete
                ? `Claim ${mission.xp} XP`
                : "Finish activity + quiz"}
          </button>
        </footer>
      </div>
    </motion.article>
  );
}

function ActivityPanel({
  activity,
  onPassed,
  shouldReduceMotion,
}: {
  activity: SeminarActivity;
  onPassed: (passed: boolean) => void;
  shouldReduceMotion: boolean | null;
}) {
  if (activity.type === "multi-select") {
    return (
      <MultiSelectPanel
        activity={activity}
        onPassed={onPassed}
        shouldReduceMotion={shouldReduceMotion}
      />
    );
  }

  if (activity.type === "sequence") {
    return (
      <SequencePanel
        activity={activity}
        onPassed={onPassed}
        shouldReduceMotion={shouldReduceMotion}
      />
    );
  }

  return (
    <ClassifyPanel
      activity={activity}
      onPassed={onPassed}
      shouldReduceMotion={shouldReduceMotion}
    />
  );
}

function MultiSelectPanel({
  activity,
  onPassed,
  shouldReduceMotion,
}: {
  activity: MultiSelectActivity;
  onPassed: (passed: boolean) => void;
  shouldReduceMotion: boolean | null;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setSelectedIds([]));
    queueMicrotask(() => setSubmitted(false));
    queueMicrotask(() => setPassed(false));
    onPassed(false);
  }, [activity, onPassed]);

  const correctIds = useMemo(
    () => activity.options.filter((option) => option.correct).map((option) => option.id),
    [activity.options],
  );

  const checkAnswers = () => {
    const selected = new Set(selectedIds);
    const correct = new Set(correctIds);
    const isCorrect =
      selected.size === correct.size &&
      [...selected].every((selectedId) => correct.has(selectedId));

    setSubmitted(true);
    setPassed(isCorrect);
    onPassed(isCorrect);
  };

  const retry = () => {
    setSelectedIds([]);
    setSubmitted(false);
    setPassed(false);
    onPassed(false);
  };

  return (
    <section className="relative overflow-hidden rounded-[30px] border-[3px] border-white bg-gradient-to-br from-white via-fuchsia-50/55 to-cyan-50/60 p-4 shadow-[0_10px_0_rgba(139,92,246,.11)] dark:border-white/10 dark:from-white/[0.055] dark:via-fuchsia-500/7 dark:to-cyan-500/7 sm:p-6">
      <ActivityHeading title={activity.title} prompt={activity.prompt} />

      {activity.scenario && (
        <div className="mt-4 rotate-[-.35deg] rounded-2xl border-2 border-rose-300 bg-gradient-to-r from-rose-100 via-pink-50 to-orange-50 p-4 text-sm font-semibold leading-6 text-rose-900 shadow-[0_5px_0_rgba(225,29,72,.12)] dark:border-rose-400/25 dark:from-rose-500/15 dark:via-pink-500/8 dark:to-orange-500/8 dark:text-rose-100">
          <span className="mr-2">💬</span>
          {activity.scenario}
        </div>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {activity.options.map((option) => {
          const selected = selectedIds.includes(option.id);
          const showCorrect = submitted && option.correct;
          const showWrong = submitted && selected && !option.correct;

          return (
            <button
              key={option.id}
              type="button"
              disabled={submitted}
              onClick={() =>
                setSelectedIds((current) =>
                  current.includes(option.id)
                    ? current.filter((id) => id !== option.id)
                    : [...current, option.id],
                )
              }
              className={`rounded-2xl border-2 p-4 text-left text-sm font-bold leading-5 shadow-sm transition hover:-translate-y-0.5 ${
                showCorrect
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                  : showWrong
                    ? "border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200"
                    : selected
                      ? "border-violet-400 bg-violet-50 text-violet-800 shadow-sm dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-200"
                      : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-violet-300 hover:bg-violet-50/60 dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:bg-violet-400/10"
              }`}
            >
              <span className="mr-2">{selected ? "✓" : "○"}</span>
              {option.label}

              {submitted && (showCorrect || showWrong) && (
                <span className="mt-2 block text-[11px] font-semibold leading-4 opacity-80">
                  {option.feedback}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ActivityFooter
        submitted={submitted}
        passed={passed}
        canSubmit={selectedIds.length > 0}
        successMessage={activity.successMessage}
        onCheck={checkAnswers}
        onRetry={retry}
        shouldReduceMotion={shouldReduceMotion}
      />
    </section>
  );
}

function SequencePanel({
  activity,
  onPassed,
  shouldReduceMotion,
}: {
  activity: SequenceActivity;
  onPassed: (passed: boolean) => void;
  shouldReduceMotion: boolean | null;
}) {
  const shuffledSteps = useMemo(
    () => [...activity.steps].sort((a, b) => b.label.localeCompare(a.label)),
    [activity.steps],
  );

  const [chosenIds, setChosenIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setChosenIds([]));
    queueMicrotask(() => setSubmitted(false));
    queueMicrotask(() => setPassed(false));
    onPassed(false);
  }, [activity, onPassed]);

  const remainingSteps = shuffledSteps.filter((step) => !chosenIds.includes(step.id));

  const checkSequence = () => {
    const isCorrect =
      chosenIds.length === activity.correctOrder.length &&
      chosenIds.every((id, index) => id === activity.correctOrder[index]);

    setSubmitted(true);
    setPassed(isCorrect);
    onPassed(isCorrect);
  };

  const reset = () => {
    setChosenIds([]);
    setSubmitted(false);
    setPassed(false);
    onPassed(false);
  };

  return (
    <section className="relative overflow-hidden rounded-[30px] border-[3px] border-white bg-gradient-to-br from-white via-fuchsia-50/55 to-cyan-50/60 p-4 shadow-[0_10px_0_rgba(139,92,246,.11)] dark:border-white/10 dark:from-white/[0.055] dark:via-fuchsia-500/7 dark:to-cyan-500/7 sm:p-6">
      <ActivityHeading title={activity.title} prompt={activity.prompt} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border-2 border-cyan-200 bg-cyan-50/75 p-4 shadow-[0_6px_0_rgba(8,145,178,.08)] dark:border-cyan-400/18 dark:bg-cyan-500/7">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Available steps
          </p>
          <div className="mt-3 grid gap-2">
            {remainingSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                disabled={submitted}
                onClick={() => setChosenIds((current) => [...current, step.id])}
                className="rounded-2xl border-2 border-cyan-200 bg-white px-4 py-3 text-left text-sm font-bold leading-5 text-slate-700 shadow-[0_4px_0_rgba(8,145,178,.09)] transition hover:-translate-y-1 hover:border-violet-400 hover:bg-violet-50 active:translate-y-1 active:shadow-none dark:border-cyan-400/18 dark:bg-white/6 dark:text-slate-200 dark:hover:border-violet-400/35 dark:hover:bg-violet-400/10"
              >
                + {step.label}
              </button>
            ))}

            {remainingSteps.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs font-bold text-slate-400 dark:border-white/15">
                All steps have been placed.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border-2 border-violet-300 bg-gradient-to-br from-violet-100/90 via-fuchsia-50/75 to-white p-4 shadow-[0_6px_0_rgba(139,92,246,.11)] dark:border-violet-400/22 dark:from-violet-500/14 dark:via-fuchsia-500/7 dark:to-white/[0.025]">
          <p className="text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">
            Your route
          </p>
          <div className="mt-3 grid gap-2">
            {chosenIds.map((id, index) => {
              const step = activity.steps.find((item) => item.id === id);
              const correctAtPosition = activity.correctOrder[index] === id;

              return (
                <button
                  key={`${id}-${index}`}
                  type="button"
                  disabled={submitted}
                  onClick={() =>
                    setChosenIds((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold leading-5 shadow-sm transition hover:-translate-y-0.5 ${
                    submitted
                      ? correctAtPosition
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                        : "border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200"
                      : "border-violet-200 bg-white text-violet-800 hover:bg-violet-100 dark:border-violet-400/20 dark:bg-slate-950/35 dark:text-violet-200"
                  }`}
                >
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-[10px] text-white dark:bg-white/10">
                    {index + 1}
                  </span>
                  {step?.label}
                </button>
              );
            })}

            {chosenIds.length === 0 && (
              <p className="rounded-2xl border border-dashed border-violet-300 px-4 py-8 text-center text-xs font-bold text-violet-500 dark:border-violet-400/25 dark:text-violet-300">
                Tap a step to begin building the route.
              </p>
            )}
          </div>
        </div>
      </div>

      <ActivityFooter
        submitted={submitted}
        passed={passed}
        canSubmit={chosenIds.length === activity.correctOrder.length}
        successMessage={activity.successMessage}
        onCheck={checkSequence}
        onRetry={reset}
        shouldReduceMotion={shouldReduceMotion}
      />
    </section>
  );
}

function ClassifyPanel({
  activity,
  onPassed,
  shouldReduceMotion,
}: {
  activity: ClassifyActivity;
  onPassed: (passed: boolean) => void;
  shouldReduceMotion: boolean | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setAnswers({}));
    queueMicrotask(() => setSubmitted(false));
    queueMicrotask(() => setPassed(false));
    onPassed(false);
  }, [activity, onPassed]);

  const allAnswered = activity.cards.every((card) => answers[card.id]);

  const checkAnswers = () => {
    const isCorrect = activity.cards.every(
      (card) => answers[card.id] === card.targetId,
    );

    setSubmitted(true);
    setPassed(isCorrect);
    onPassed(isCorrect);
  };

  const retry = () => {
    setAnswers({});
    setSubmitted(false);
    setPassed(false);
    onPassed(false);
  };

  return (
    <section className="relative overflow-hidden rounded-[30px] border-[3px] border-white bg-gradient-to-br from-white via-fuchsia-50/55 to-cyan-50/60 p-4 shadow-[0_10px_0_rgba(139,92,246,.11)] dark:border-white/10 dark:from-white/[0.055] dark:via-fuchsia-500/7 dark:to-cyan-500/7 sm:p-6">
      <ActivityHeading title={activity.title} prompt={activity.prompt} />

      <div className="mt-5 grid gap-3">
        {activity.cards.map((card) => {
          const selectedTarget = answers[card.id];
          const isCorrect = selectedTarget === card.targetId;

          return (
            <div
              key={card.id}
              className="rounded-[24px] border-2 border-white bg-white/80 p-4 shadow-[0_6px_0_rgba(15,23,42,.08)] dark:border-white/10 dark:bg-slate-950/38"
            >
              <p className="text-sm font-black leading-6 text-slate-900 dark:text-white">
                {card.label}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {activity.groups.map((group) => {
                  const selected = selectedTarget === group.id;
                  const showCorrect = submitted && group.id === card.targetId;
                  const showWrong = submitted && selected && !showCorrect;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      disabled={submitted}
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [card.id]: group.id,
                        }))
                      }
                      className={`rounded-xl border-2 px-3 py-2 text-xs font-black shadow-sm transition hover:-translate-y-0.5 ${
                        showCorrect
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                          : showWrong
                            ? "border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200"
                            : selected
                              ? "border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-200"
                              : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      }`}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <p
                  className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold leading-4 ${
                    isCorrect
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200"
                      : "bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"
                  }`}
                >
                  {card.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <ActivityFooter
        submitted={submitted}
        passed={passed}
        canSubmit={allAnswered}
        successMessage={activity.successMessage}
        onCheck={checkAnswers}
        onRetry={retry}
        shouldReduceMotion={shouldReduceMotion}
      />
    </section>
  );
}

function ActivityHeading({
  title,
  prompt,
}: {
  title: string;
  prompt: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="inline-flex rotate-[-1deg] rounded-full bg-fuchsia-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
          Interactive challenge
        </p>
        <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {prompt}
        </p>
      </div>

      <span className="rotate-2 rounded-2xl border-2 border-cyan-300 bg-cyan-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-800 shadow-[0_4px_0_rgba(8,145,178,.15)] dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200">
        Tap to play
      </span>
    </div>
  );
}

function ActivityFooter({
  submitted,
  passed,
  canSubmit,
  successMessage,
  onCheck,
  onRetry,
  shouldReduceMotion,
}: {
  submitted: boolean;
  passed: boolean;
  canSubmit: boolean;
  successMessage: string;
  onCheck: () => void;
  onRetry: () => void;
  shouldReduceMotion: boolean | null;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {!submitted ? (
        <button
          type="button"
          onClick={onCheck}
          disabled={!canSubmit}
          className="rounded-2xl border-2 border-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-5 py-3 text-sm font-black text-white shadow-[0_7px_0_rgba(91,33,182,.28)] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45"
        >
          Check challenge
        </button>
      ) : passed ? (
        <motion.span
          initial={{
            opacity: 0,
            scale: shouldReduceMotion ? 1 : 0.96,
          }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border-2 border-emerald-400 bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-[0_6px_0_rgba(5,150,105,.22)] dark:border-emerald-300/25"
        >
          🎉 {successMessage}
        </motion.span>
      ) : (
        <>
          <span className="rounded-2xl border-2 border-amber-300 bg-amber-200 px-4 py-3 text-sm font-black text-amber-950 shadow-[0_5px_0_rgba(217,119,6,.16)] dark:border-amber-400/25 dark:bg-amber-400/12 dark:text-amber-100">
            Almost there. Review the highlighted choices.
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-[0_5px_0_rgba(15,23,42,.10)] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none dark:border-white/12 dark:bg-white/7 dark:text-white dark:hover:bg-white/10"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}