"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  NichReactions,
  type NichReaction,
  type NichReactionKey,
} from "../NichReactions";

const NICH_REACTION_EVENT = "csbt:nich-reaction";
const DEFAULT_REACTION_KEY: NichReactionKey = "idle";

type NichReactionEventDetail = {
  reactionKey: NichReactionKey;
};

type UseNichResult = {
  reaction: NichReaction;
  reactionKey: NichReactionKey;
  isReacting: boolean;
  react: (reactionKey: NichReactionKey) => void;
  reset: () => void;
};

function isNichReactionKey(
  value: unknown,
): value is NichReactionKey {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      NichReactions,
      value,
    )
  );
}

export default function useNich(): UseNichResult {
  const [reactionKey, setReactionKey] =
    useState<NichReactionKey>(DEFAULT_REACTION_KEY);

  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReactionTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const applyReaction = useCallback(
    (nextReactionKey: NichReactionKey) => {
      clearReactionTimer();
      setReactionKey(nextReactionKey);

      if (nextReactionKey === DEFAULT_REACTION_KEY) {
        return;
      }

      const nextReaction =
        NichReactions[nextReactionKey];

      timeoutRef.current = setTimeout(() => {
        setReactionKey(DEFAULT_REACTION_KEY);
        timeoutRef.current = null;
      }, nextReaction.duration ?? 3000);
    },
    [clearReactionTimer],
  );

  const react = useCallback(
    (nextReactionKey: NichReactionKey) => {
      if (typeof window === "undefined") {
        return;
      }

      window.dispatchEvent(
        new CustomEvent<NichReactionEventDetail>(
          NICH_REACTION_EVENT,
          {
            detail: {
              reactionKey: nextReactionKey,
            },
          },
        ),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    react(DEFAULT_REACTION_KEY);
  }, [react]);

  useEffect(() => {
    function handleReaction(event: Event) {
      const customEvent =
        event as CustomEvent<NichReactionEventDetail>;

      const nextReactionKey =
        customEvent.detail?.reactionKey;

      if (!isNichReactionKey(nextReactionKey)) {
        return;
      }

      applyReaction(nextReactionKey);
    }

    window.addEventListener(
      NICH_REACTION_EVENT,
      handleReaction,
    );

    return () => {
      window.removeEventListener(
        NICH_REACTION_EVENT,
        handleReaction,
      );

      clearReactionTimer();
    };
  }, [applyReaction, clearReactionTimer]);

  return {
    reaction: NichReactions[reactionKey],
    reactionKey,
    isReacting:
      reactionKey !== DEFAULT_REACTION_KEY,
    react,
    reset,
  };
}