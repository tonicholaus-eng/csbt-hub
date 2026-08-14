"use client";

import { useSyncExternalStore } from "react";
import { birthdayEventEndExclusiveMs, birthdayEventStartMs, isBirthdayEventActive } from "../config/birthdayEvent";

function getSnapshot() {
  return isBirthdayEventActive();
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  let timer: number | undefined;
  const scheduleBoundary = () => {
    if (timer) window.clearTimeout(timer);
    const now = Date.now();
    const nextBoundary = now < birthdayEventStartMs
      ? birthdayEventStartMs
      : now < birthdayEventEndExclusiveMs
        ? birthdayEventEndExclusiveMs + 25
        : 0;
    if (nextBoundary > now) {
      timer = window.setTimeout(check, Math.min(nextBoundary - now, 2_147_483_000));
    }
  };

  const check = () => {
    scheduleBoundary();
    callback();
  };

  scheduleBoundary();
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  document.addEventListener("visibilitychange", check);

  return () => {
    if (timer) window.clearTimeout(timer);
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
    document.removeEventListener("visibilitychange", check);
  };
}

export function useBirthdayEventActive() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
