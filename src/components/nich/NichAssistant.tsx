"use client";

import { useEffect, useState } from "react";
import NichButton from "./NichButton";
import NichChat from "./NichChat";
import NichIntroMascot from "./NichIntroMascot";

const NICH_INTRO_STORAGE_KEY = "csbt-nich-intro-completed";

export default function NichAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    try {
      const hasCompletedIntro =
        window.localStorage.getItem(NICH_INTRO_STORAGE_KEY) ===
        "true";

      setShowIntro(!hasCompletedIntro);
    } catch {
      setShowIntro(true);
    } finally {
      setIsReady(true);
    }
  }, []);

  function toggleChat() {
    setIsOpen((currentValue) => !currentValue);
  }

  function closeChat() {
    setIsOpen(false);
  }

  function completeIntro() {
    try {
      window.localStorage.setItem(
        NICH_INTRO_STORAGE_KEY,
        "true",
      );
    } catch {
      // Nich will still continue even if localStorage is unavailable.
    }

    setShowIntro(false);
  }

  if (!isReady) {
    return null;
  }

  return (
    <>
      <NichIntroMascot
        open={showIntro}
        onComplete={completeIntro}
      />

      {!showIntro && (
        <>
          <NichChat
            open={isOpen}
            onClose={closeChat}
          />

          <NichButton
            open={isOpen}
            onClick={toggleChat}
          />
        </>
      )}
    </>
  );
}