"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import NichButton from "./NichButton";

const NichChat = dynamic(() => import("./NichChat"), { ssr: false });
const NichIntroMascot = dynamic(() => import("../NichIntroMascot"), {
  ssr: false,
});

const CSBT_TOUR_PERMANENT_KEY = "csbt-feature-tour-hidden";
const CSBT_TOUR_SESSION_SKIP_KEY = "csbt-feature-tour-skipped-for-session";
const NICH_DISMISSED_STORAGE_KEY = "csbt-nich-dismissed-for-session";

export default function NichAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(NICH_DISMISSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [showIntro, setShowIntro] = useState(() => {
    try {
      const hiddenPermanently =
        window.localStorage.getItem(CSBT_TOUR_PERMANENT_KEY) === "true";
      const skippedThisSession =
        window.sessionStorage.getItem(CSBT_TOUR_SESSION_SKIP_KEY) === "true";

      return !hiddenPermanently && !skippedThisSession;
    } catch {
      return true;
    }
  });
  const [chatLoaded, setChatLoaded] = useState(false);

  function toggleChat() {
    if (showIntro) return;
    setChatLoaded(true);
    setIsOpen((currentValue) => !currentValue);
  }

  function closeChat() {
    setIsOpen(false);
  }

  function dismissAssistant() {
    try {
      window.sessionStorage.setItem(NICH_DISMISSED_STORAGE_KEY, "true");
    } catch {
      // The assistant can still be dismissed when browser storage is blocked.
    }

    setIsOpen(false);
    setShowIntro(false);
    setIsDismissed(true);
  }

  function skipIntroForNow() {
    try {
      window.sessionStorage.setItem(CSBT_TOUR_SESSION_SKIP_KEY, "true");
    } catch {
      // The tour can still be skipped when browser storage is blocked.
    }

    setShowIntro(false);
  }

  function completeIntro() {
    try {
      window.localStorage.setItem(CSBT_TOUR_PERMANENT_KEY, "true");
    } catch {
      // Completing the tour still works if localStorage is unavailable.
    }

    setShowIntro(false);
  }

  function dontShowIntroAgain() {
    try {
      window.localStorage.setItem(CSBT_TOUR_PERMANENT_KEY, "true");
      window.sessionStorage.removeItem(CSBT_TOUR_SESSION_SKIP_KEY);
    } catch {
      // The tour can still close if browser storage is unavailable.
    }

    setShowIntro(false);
  }

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <NichIntroMascot
        open={showIntro}
        onComplete={completeIntro}
        onSkip={skipIntroForNow}
        onDontShowAgain={dontShowIntroAgain}
      />

      {chatLoaded && !showIntro && (
        <NichChat variant="floating" open={isOpen} onClose={closeChat} />
      )}

      <NichButton
        open={isOpen}
        onClick={toggleChat}
        onDismiss={dismissAssistant}
        tourMode={showIntro}
      />
    </>
  );
}
