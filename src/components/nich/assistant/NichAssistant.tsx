"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import NichButton from "./NichButton";

const NichChat = dynamic(() => import("./NichChat"), { ssr: false });
const NichIntroMascot = dynamic(() => import("../NichIntroMascot"), {
  ssr: false,
});

const NICH_INTRO_STORAGE_KEY = "csbt-nich-intro-completed";
const NICH_DISMISSED_STORAGE_KEY = "csbt-nich-dismissed-for-session";

export default function NichAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return (
        window.sessionStorage.getItem(NICH_DISMISSED_STORAGE_KEY) === "true"
      );
    } catch {
      return false;
    }
  });
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return window.localStorage.getItem(NICH_INTRO_STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });
  const [chatLoaded, setChatLoaded] = useState(false);

  function toggleChat() {
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

  function completeIntro() {
    try {
      window.localStorage.setItem(NICH_INTRO_STORAGE_KEY, "true");
    } catch {
      // Nich continues even if localStorage is unavailable.
    }

    setShowIntro(false);
  }

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <NichIntroMascot open={showIntro} onComplete={completeIntro} />

      {!showIntro && (
        <>
          {chatLoaded && (
            <NichChat variant="floating" open={isOpen} onClose={closeChat} />
          )}

          <NichButton
            open={isOpen}
            onClick={toggleChat}
            onDismiss={dismissAssistant}
          />
        </>
      )}
    </>
  );
}
