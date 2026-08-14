"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BIRTHDAY_EVENT_SEEN_KEY, birthdayEvent } from "../../config/birthdayEvent";
import { BirthdayGift, BirthdaySparkle } from "./BirthdayIcons";

type Props = { onOpen: () => void };

export default function BirthdayEventNotification({ onOpen }: Props) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = window.localStorage.getItem(BIRTHDAY_EVENT_SEEN_KEY) === "true"; } catch {}
    if (seen) return;
    let timer: number | undefined;
    const tryShow = () => {
      const tourOpen = Boolean(document.querySelector('[aria-label="CSBT HUB guided feature tour"]'));
      if (tourOpen) { timer = window.setTimeout(tryShow, 1400); return; }
      setVisible(true);
    };
    timer = window.setTimeout(tryShow, 1450);
    return () => { if (timer) window.clearTimeout(timer); };
  }, []);

  function markSeen() {
    try { window.localStorage.setItem(BIRTHDAY_EVENT_SEEN_KEY, "true"); } catch {}
  }

  function dismiss() {
    markSeen();
    setVisible(false);
  }

  function open() {
    markSeen();
    setVisible(false);
    onOpen();
  }

  return <AnimatePresence>{visible && <motion.aside
    initial={reduce ? false : { opacity:0, y:18, scale:.97 }}
    animate={{ opacity:1, y:0, scale:1 }}
    exit={reduce ? { opacity:0 } : { opacity:0, y:10, scale:.98 }}
    transition={{ duration: reduce ? 0 : .25 }}
    className="birthday-toast"
    aria-label="Birthday event notification"
  >
    <div className="birthday-toast-icon"><BirthdaySparkle className="h-6 w-6"/></div>
    <div className="min-w-0 flex-1">
      <p className="birthday-eyebrow">Limited Event</p>
      <h2 className="mt-1 text-base font-black text-[var(--foreground)]">A Rare Event Has Appeared!</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">Someone very special is celebrating {birthdayEvent.person.birthdayDisplay}.</p>
      <button type="button" onClick={open} className="birthday-primary mt-3 min-h-11 px-4 text-xs">Open Birthday Event <BirthdayGift className="h-4 w-4"/></button>
    </div>
    <button type="button" onClick={dismiss} aria-label="Dismiss birthday event notification" className="birthday-close birthday-close--small">×</button>
  </motion.aside>}</AnimatePresence>;
}
