"use client";

import { useCallback, useEffect, useState } from "react";
import { BIRTHDAY_EVENT_OPEN, BIRTHDAY_EVENT_PENDING_KEY, birthdayEvent, type BirthdayEventView } from "../../config/birthdayEvent";
import { useBirthdayEventActive } from "../../hooks/useBirthdayEventActive";
import BirthdayDecorations from "./BirthdayDecorations";
import BirthdayEventModal from "./BirthdayEventModal";
import BirthdayEventNotification from "./BirthdayEventNotification";
import { BirthdayGift } from "./BirthdayIcons";

export default function BirthdayEventExperience() {
  const active = useBirthdayEventActive();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<BirthdayEventView>("main");

  const openEvent = useCallback((next:BirthdayEventView="main") => { setView(next); setOpen(true); }, []);
  const closeEvent = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!active) return;
    const consume = (next?: BirthdayEventView | null) => {
      if (next === "gift" || next === "nich" || next === "main") openEvent(next);
      try { window.sessionStorage.removeItem(BIRTHDAY_EVENT_PENDING_KEY); } catch {}
    };
    const handler = (event: Event) => {
      consume((event as CustomEvent<{view?:BirthdayEventView}>).detail?.view);
    };
    window.addEventListener(BIRTHDAY_EVENT_OPEN, handler as EventListener);
    let pendingTimer: number | undefined;
    try {
      const pending = window.sessionStorage.getItem(BIRTHDAY_EVENT_PENDING_KEY) as BirthdayEventView | null;
      if (pending) pendingTimer = window.setTimeout(() => consume(pending), 0);
    } catch {}
    return () => {
      if (pendingTimer) window.clearTimeout(pendingTimer);
      window.removeEventListener(BIRTHDAY_EVENT_OPEN, handler as EventListener);
    };
  }, [active, openEvent]);

  if (!active) return null;

  return <>
    <BirthdayDecorations/>
    <BirthdayEventNotification onOpen={() => openEvent("main")}/>
    <button type="button" onClick={() => openEvent("main")} className="birthday-reopen" aria-label={`Open ${birthdayEvent.person.name}'s birthday event`} title="Birthday Event"><BirthdayGift className="h-5 w-5"/><span>Birthday Event</span></button>
    <BirthdayEventModal open={open} view={view} onClose={closeEvent} onViewChange={setView}/>
  </>;
}
