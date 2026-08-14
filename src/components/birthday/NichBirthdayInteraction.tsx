"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { birthdayEvent } from "../../config/birthdayEvent";
import { PartyHat } from "./BirthdayIcons";

const sequence = [
  "NICH has detected an unusual value.",
  "Scanning...",
  "Calculating rarity...",
  "Calculating demand...",
  "Calculating value...",
  "RESULT",
] as const;

export default function NichBirthdayInteraction() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) { const timer = window.setTimeout(() => setStep(sequence.length - 1), 0); return () => window.clearTimeout(timer); }
    if (step >= sequence.length - 1) return;
    const timer = window.setTimeout(() => setStep((current) => Math.min(current + 1, sequence.length - 1)), step === 0 ? 850 : 650);
    return () => window.clearTimeout(timer);
  }, [reduce, step]);

  const final = step === sequence.length - 1;
  return <div className="birthday-nich-panel">
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 shrink-0 rounded-2xl bg-[var(--surface-nich)] p-1 ring-1 ring-violet-400/20">
        <div className="relative h-full w-full overflow-hidden rounded-xl"><Image src="/nich/nich-face.png" alt="Nich" fill sizes="56px" className="object-cover object-[45%_22%]"/></div>
        <PartyHat className="birthday-nich-hat h-8 w-8" aria-hidden="true"/>
      </div>
      <div><p className="birthday-eyebrow birthday-eyebrow--nich">NICH BIRTHDAY SCAN</p><h3 className="text-xl font-black text-[var(--foreground)]">Special value analysis</h3></div>
    </div>

    <div className="mt-5 rounded-2xl bg-[var(--surface-3)] p-4 sm:p-5">
      <AnimatePresence mode="wait">
        {!final ? <motion.p key={step} initial={reduce ? false : {opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} className="font-bold text-[var(--foreground)]">{sequence[step]}</motion.p> : <motion.div key="final" initial={reduce ? false : {opacity:0}} animate={{opacity:1}} className="space-y-4">
          <p className="font-black text-[var(--rose)]">⚠️ ERROR: Value exceeds measurable range.</p>
          <div className="birthday-nich-results">
            <p><span>IDENTIFIED:</span><strong>{birthdayEvent.person.name.toUpperCase()}</strong></p>
            <p><span>RARITY:</span><strong>ONE OF ONE</strong></p>
            <p><span>VALUE:</span><strong>PRICELESS 💗</strong></p>
            <p><span>TRADEABILITY:</span><strong>NOT FOR TRADE</strong></p>
          </div>
          <p className="text-sm leading-6 text-[var(--foreground-muted)]">Hmm... according to my database, there&apos;s also something unusually important about today.</p>
          <div className="rounded-xl border border-[var(--birthday-border)] bg-[var(--birthday-soft)] p-4 text-center">
            <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--foreground-muted)]">DATE DETECTED: {birthdayEvent.person.birthdayDisplay.toUpperCase()}</p>
            <p className="mt-2 text-xl font-black text-[var(--foreground)]">🎂 IT&apos;S {birthdayEvent.person.name.toUpperCase()}&apos;S BIRTHDAY!</p>
          </div>
          <h2 className="pt-2 text-center text-3xl font-black tracking-[-.04em] text-[var(--foreground)] sm:text-4xl">HAPPY BIRTHDAY, {birthdayEvent.person.name.toUpperCase()}! 💗</h2>
          <p className="birthday-personal-message text-center">{birthdayEvent.message}</p>
        </motion.div>}
      </AnimatePresence>
    </div>
  </div>;
}
