"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { birthdayDisplayDate, birthdayEvent, type BirthdayEventView } from "../../config/birthdayEvent";
import BirthdayGiftReveal from "./BirthdayGiftReveal";
import NichBirthdayInteraction from "./NichBirthdayInteraction";
import { BirthdayGift, BirthdayHeart, BirthdaySparkle } from "./BirthdayIcons";

type Props = { open:boolean; view:BirthdayEventView; onClose:()=>void; onViewChange:(view:BirthdayEventView)=>void };

const stats = [
  ["Rarity", "✨ One of One"],
  ["Demand", "♾️ Extremely High"],
  ["Value", "Priceless"],
  ["Status", "Permanently NFT — Not For Trade"],
  ["Obtained", birthdayEvent.person.birthdayDisplay],
] as const;

export default function BirthdayEventModal({ open, view, onClose, onViewChange }: Props) {
  const reduce = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 20);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter((node) => !node.hasAttribute("disabled"));
      if (!nodes.length) return;
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [onClose, open]);

  function claimGift() {
    setClaimed(true);
    onViewChange("gift");
  }

  return <AnimatePresence>{open && <motion.div className="birthday-modal-layer" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduce?0:.18}}>
    <button type="button" tabIndex={-1} className="birthday-modal-backdrop" aria-label="Close birthday event" onClick={onClose}/>
    <motion.div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="birthday-event-title" className="birthday-modal" initial={reduce?false:{opacity:0,y:18,scale:.975}} animate={{opacity:1,y:0,scale:1}} exit={reduce?{opacity:0}:{opacity:0,y:10,scale:.985}} transition={{duration:reduce?0:.24}}>
      <div className="birthday-modal-shine" aria-hidden="true"/>
      <button type="button" onClick={onClose} aria-label="Close birthday event" className="birthday-close">×</button>

      <div className="birthday-modal-scroll">
        {view === "main" && <>
          <div className="text-center">
            <span className="birthday-edition-badge">🎀 LIMITED BIRTHDAY EDITION</span>
            <div className="birthday-heart-medallion" aria-hidden="true"><BirthdayHeart/></div>
            <h1 id="birthday-event-title" className="mt-5 text-[clamp(2rem,6vw,4.5rem)] font-black leading-[.98] tracking-[-.055em] text-[var(--foreground)]">HAPPY BIRTHDAY, {birthdayEvent.person.name.toUpperCase()}! 💗</h1>
            <p className="mt-3 text-sm font-bold text-[var(--foreground-muted)]">Birthday display date: {birthdayDisplayDate}</p>
          </div>

          <div className="birthday-stat-grid mt-7">{stats.map(([label,value])=><div key={label} className={`birthday-stat ${label === "Status" ? "birthday-stat--wide" : ""}`}><span>{label}</span><strong>{value}</strong></div>)}</div>

          <section className="birthday-letter mt-6" aria-label="Birthday message">
            <BirthdaySparkle className="birthday-letter-sparkle h-6 w-6" aria-hidden="true"/>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--foreground-muted)]">A message for {birthdayEvent.person.name}</p>
            <p className="birthday-personal-message mt-3">{birthdayEvent.message}</p>
          </section>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={claimGift} className="birthday-primary min-h-[52px] px-5"><BirthdayGift className="h-5 w-5"/> {claimed ? "View Birthday Gift" : "Claim Birthday Gift"}</button>
            <button type="button" onClick={() => onViewChange("nich")} className="birthday-secondary min-h-[52px] px-5">✦ Let NICH Scan Today</button>
          </div>
        </>}

        {view === "gift" && <>
          <BirthdayGiftReveal/>
          <div className="mt-7 flex justify-center"><button type="button" onClick={() => onViewChange("main")} className="birthday-secondary min-h-12 px-5">← Back to Birthday Card</button></div>
        </>}

        {view === "nich" && <>
          <NichBirthdayInteraction/>
          <div className="mt-7 flex justify-center"><button type="button" onClick={() => onViewChange("main")} className="birthday-secondary min-h-12 px-5">← Back to Birthday Card</button></div>
        </>}
      </div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}
