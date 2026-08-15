"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import type { SeminarQuestion } from "../../data/seminarContent";

type SeminarQuizProps = {
  questions: SeminarQuestion[];
  onPassed: (passed: boolean) => void;
  shouldReduceMotion: boolean | null;
};

const optionLetters = ["A", "B", "C", "D", "E", "F"];

export default function SeminarQuiz({
  questions,
  onPassed,
  shouldReduceMotion,
}: SeminarQuizProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setAnswers({}));
    queueMicrotask(() => setSubmitted(false));
    onPassed(false);
  }, [questions, onPassed]);

  const score = useMemo(
    () =>
      questions.reduce(
        (total, question) =>
          total + (answers[question.id] === question.answerId ? 1 : 0),
        0,
      ),
    [answers, questions],
  );

  const allAnswered = questions.every((question) => answers[question.id]);
  const passed = score === questions.length;

  const submitQuiz = () => {
    if (!allAnswered) {
      return;
    }

    setSubmitted(true);
    onPassed(passed);
  };

  const retryQuiz = () => {
    setAnswers({});
    setSubmitted(false);
    onPassed(false);
  };

  return (
    <section className="relative overflow-hidden rounded-[32px] border-4 border-white bg-gradient-to-br from-yellow-100 via-white to-cyan-100 p-4 shadow-[0_11px_0_rgba(6,182,212,.11)] dark:border-white/10 dark:from-yellow-500/10 dark:via-white/[0.04] dark:to-cyan-500/10 sm:p-6">
      <div className="pointer-events-none absolute -right-4 -top-7 rotate-12 text-8xl opacity-10">
        🧠
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.7)_1px,transparent_1px)] bg-[size:24px_24px] opacity-35 dark:opacity-10" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex rotate-[-1deg] rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-md">
            🧠 Boss checkpoint
          </p>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
            Beat the quiz to clear this level
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Every answer must be correct before the XP chest unlocks.
          </p>
        </div>

        <span className="rotate-2 rounded-2xl border-2 border-yellow-300 bg-yellow-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-950 shadow-[0_5px_0_rgba(217,119,6,.16)] dark:border-yellow-400/25 dark:bg-yellow-400/10 dark:text-yellow-200">
          {questions.length} {questions.length === 1 ? "question" : "questions"}
        </span>
      </div>

      <div className="relative mt-6 space-y-5">
        {questions.map((question, questionIndex) => {
          const selectedAnswer = answers[question.id];
          const isCorrect = selectedAnswer === question.answerId;

          return (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.35,
                delay: shouldReduceMotion ? 0 : questionIndex * 0.05,
              }}
              className="relative overflow-hidden rounded-[26px] border-[3px] border-white bg-white/82 p-4 shadow-[0_7px_0_rgba(139,92,246,.10)] dark:border-white/10 dark:bg-slate-950/45"
            >
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-black text-white shadow-md">
                  {questionIndex + 1}
                </span>
                <p className="pt-1 text-sm font-black leading-6 text-slate-900 dark:text-white">
                  {question.prompt}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                {question.options.map((option, optionIndex) => {
                  const selected = selectedAnswer === option.id;
                  const showCorrect = submitted && option.id === question.answerId;
                  const showWrong = submitted && selected && !showCorrect;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={submitted}
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: option.id,
                        }))
                      }
                      className={`group flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left text-sm font-semibold leading-5 shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0 ${
                        showCorrect
                          ? "border-emerald-400 bg-emerald-100 text-emerald-900 shadow-[0_5px_0_rgba(5,150,105,.18)] dark:border-emerald-400/40 dark:bg-emerald-400/12 dark:text-emerald-100"
                          : showWrong
                            ? "border-rose-400 bg-rose-100 text-rose-900 shadow-[0_5px_0_rgba(225,29,72,.16)] dark:border-rose-400/40 dark:bg-rose-400/12 dark:text-rose-100"
                            : selected
                              ? "border-violet-500 bg-violet-100 text-violet-900 shadow-[0_5px_0_rgba(124,58,237,.18)] dark:border-violet-400/40 dark:bg-violet-400/12 dark:text-violet-100"
                              : "border-cyan-200 bg-white text-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:border-cyan-400/15 dark:bg-white/[0.045] dark:text-slate-200 dark:hover:border-violet-400/35 dark:hover:bg-violet-400/10"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 text-xs font-black transition ${
                          showCorrect
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : showWrong
                              ? "border-rose-500 bg-rose-500 text-white"
                              : selected
                                ? "border-violet-500 bg-violet-500 text-white"
                                : "border-slate-200 bg-slate-50 text-slate-500 group-hover:border-violet-300 group-hover:bg-violet-100 group-hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                        }`}
                      >
                        {showCorrect
                          ? "✓"
                          : showWrong
                            ? "×"
                            : optionLetters[optionIndex] ?? optionIndex + 1}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-2xl border-2 px-4 py-3 text-xs font-semibold leading-5 ${
                    isCorrect
                      ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100"
                      : "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"
                  }`}
                >
                  <span className="font-black">
                    {isCorrect ? "⭐ Correct! " : "🔍 Review clue: "}
                  </span>
                  {question.explanation}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button
            type="button"
            onClick={submitQuiz}
            disabled={!allAnswered}
            className="rounded-2xl border-2 border-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_7px_0_rgba(91,33,182,.28)] transition hover:-translate-y-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45"
          >
            ⚡ Check my answers
          </button>
        ) : passed ? (
          <motion.span
            initial={{ scale: shouldReduceMotion ? 1 : 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-emerald-400 bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_7px_0_rgba(5,150,105,.24)]"
          >
            🏆 Perfect checkpoint: {score}/{questions.length}
          </motion.span>
        ) : (
          <>
            <span className="rounded-2xl border-2 border-amber-300 bg-amber-200 px-4 py-3 text-sm font-black text-amber-950 shadow-[0_5px_0_rgba(217,119,6,.16)] dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
              Score: {score}/{questions.length}
            </span>
            <button
              type="button"
              onClick={retryQuiz}
              className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-[0_5px_0_rgba(15,23,42,.10)] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none dark:border-white/12 dark:bg-white/7 dark:text-white"
            >
              ↻ Try again
            </button>
          </>
        )}
      </div>
    </section>
  );
}