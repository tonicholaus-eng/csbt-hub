"use client";

import { useCallback, useState } from "react";

import NichButton from "./NichButton";
import NichChat from "./NichChat";
import useNich from "./useNich";

export default function CSBTAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const { react } = useNich();

  const openChat = useCallback(() => {
    setIsOpen(true);
    react("welcome");
  }, [react]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    react("goodbye");
  }, [react]);

  const toggleChat = useCallback(() => {
    setIsOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        react("welcome");
      } else {
        react("goodbye");
      }

      return nextValue;
    });
  }, [react]);

  return (
    <>
      <NichChat
        open={isOpen}
        onClose={closeChat}
      />

      <NichButton
        open={isOpen}
        onClick={toggleChat}
      />

      <button
        type="button"
        onClick={openChat}
        className="sr-only"
      >
        Open Nich assistant
      </button>
    </>
  );
}