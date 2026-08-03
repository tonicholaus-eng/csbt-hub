"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import NichButton from "./NichAssistant/NichButton";

const NichChat = dynamic(() => import("./NichAssistant/NichChat"), { ssr: false });
const NichIntroMascot = dynamic(() => import("./NichIntroMascot"), { ssr: false });

const NICH_INTRO_STORAGE_KEY =
  "csbt-nich-intro-completed";

export default function NichAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showIntro, setShowIntro] =
    useState(false);
  const [chatLoaded, setChatLoaded] =
    useState(false);

  useEffect(() => {
    try {
      const hasCompletedIntro =
        window.localStorage.getItem(
          NICH_INTRO_STORAGE_KEY,
        ) === "true";

      setShowIntro(!hasCompletedIntro);
    } catch {
      setShowIntro(true);
    } finally {
      setIsReady(true);
    }
  }, []);

  function toggleChat() {
    setChatLoaded(true);
    setIsOpen(
      (currentValue) => !currentValue,
    );
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
      // Nich continues even if localStorage is unavailable.
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
          {chatLoaded && (
            <NichChat
              variant="floating"
              open={isOpen}
              onClose={closeChat}
            />
          )}

          <NichButton
            open={isOpen}
            onClick={toggleChat}
          />
        </>
      )}
    </>
  );
}