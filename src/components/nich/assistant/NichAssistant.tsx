"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "../../../hooks/useAuthSession";
import NichButton from "./NichButton";

const NichChat = dynamic(() => import("./NichChat"), { ssr: false });
const NichIntroMascot = dynamic(() => import("../NichIntroMascot"), { ssr: false });

const GUIDE_META_KEY = "csbt_feature_tour_v4_completed";
const USER_SEEN_PREFIX = "csbt-feature-tour-v4-seen:";
const LEGACY_COMPLETED = "csbt-feature-tour-v3-completed";
const LEGACY_HIDDEN = "csbt-feature-tour-v3-hidden";
const DISMISSED = "csbt-nich-dismissed-for-session";

type Props = {
  floatingEnabled?: boolean;
};

function hasLegacyGuideCompletion() {
  try {
    return localStorage.getItem(LEGACY_COMPLETED) === "true" || localStorage.getItem(LEGACY_HIDDEN) === "true";
  } catch {
    return false;
  }
}

export default function NichAssistant({ floatingEnabled = true }: Props) {
  const { supabase, user, loading: authLoading } = useAuthSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [manualTour, setManualTour] = useState(false);
  const [firstRunActive, setFirstRunActive] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISSED) === "true";
    } catch {
      dismissed = false;
    }

    // Defer the hydration-only state sync so this effect does not synchronously
    // cascade another render (React 19 / eslint react-hooks rule).
    queueMicrotask(() => {
      setIsDismissed(dismissed);
      setHydrated(true);
    });
  }, []);

  const persistGuideCompletion = useCallback(async () => {
    if (!user) return;
    try {
      localStorage.setItem(`${USER_SEEN_PREFIX}${user.id}`, "true");
    } catch {}

    if (supabase) {
      try {
        await supabase.auth.updateUser({
          data: { [GUIDE_META_KEY]: true },
        });
      } catch {
        // Local persistence still prevents the guide from repeatedly opening on this device.
      }
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!hydrated || authLoading) return;

    let cancelled = false;

    // Auth changes can require several coordinated UI state updates. Schedule
    // them after the effect body so React does not flag a synchronous cascade.
    queueMicrotask(() => {
      if (cancelled) return;

      // No account = hard onboarding gate. It cannot be skipped.
      if (!user) {
        activeUserIdRef.current = null;
        setManualTour(false);
        setFirstRunActive(false);
        setShowIntro(true);
        return;
      }

      // Keep a guide that the user manually reopened, or the current first-run tour,
      // visible while the auth listener refreshes the user object.
      if (manualTour || firstRunActive) return;

      const metadataSeen = user.user_metadata?.[GUIDE_META_KEY] === true;
      let localSeen = false;
      try {
        localSeen = localStorage.getItem(`${USER_SEEN_PREFIX}${user.id}`) === "true";
      } catch {}

      const alreadySeen = metadataSeen || localSeen || hasLegacyGuideCompletion();
      activeUserIdRef.current = user.id;

      if (alreadySeen) {
        // Migrate old browser-only tour completion to the account-specific local key.
        try {
          localStorage.setItem(`${USER_SEEN_PREFIX}${user.id}`, "true");
        } catch {}
        setShowIntro(false);
        return;
      }

      // Mark this browser as having launched the one-time guide immediately. This
      // prevents a refresh halfway through the tour from reopening it every visit.
      try {
        localStorage.setItem(`${USER_SEEN_PREFIX}${user.id}`, "true");
      } catch {}
      setFirstRunActive(true);
      setShowIntro(true);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, firstRunActive, hydrated, manualTour, user]);

  useEffect(() => {
    const openGuide = () => {
      if (!user) {
        setManualTour(false);
        setShowIntro(true);
        return;
      }
      setIsOpen(false);
      setManualTour(true);
      setFirstRunActive(false);
      setShowIntro(true);
    };

    window.addEventListener("csbt-open-guide", openGuide);
    return () => window.removeEventListener("csbt-open-guide", openGuide);
  }, [user]);

  function toggle() {
    if (showIntro || !floatingEnabled) return;
    setChatLoaded(true);
    setIsOpen((value) => !value);
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISSED, "true");
    } catch {}
    setIsOpen(false);
    setIsDismissed(true);
  }

  async function closeGuide() {
    if (!manualTour) await persistGuideCompletion();
    setShowIntro(false);
    setManualTour(false);
    setFirstRunActive(false);
  }

  async function completeGuide() {
    await persistGuideCompletion();
    setShowIntro(false);
    setManualTour(false);
    setFirstRunActive(false);
  }

  if (!hydrated) return null;

  // Do not leave a clickable gap while Supabase is resolving a session. This is
  // intentionally a simple loading veil; the full guide appears immediately after.
  if (authLoading) {
    return (
      <div className="fixed inset-0 z-[119] grid place-items-center bg-slate-950/80 backdrop-blur-[3px]" aria-label="Checking CSBT account">
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-sm font-black text-white shadow-2xl">
          Checking your CSBT account…
        </div>
      </div>
    );
  }

  const authRequired = !user;

  return (
    <>
      <NichIntroMascot
        open={showIntro}
        authRequired={authRequired}
        supabase={supabase}
        manualOpen={manualTour}
        onComplete={() => void completeGuide()}
        onSkip={() => void closeGuide()}
      />

      {floatingEnabled && !isDismissed && chatLoaded && !showIntro && (
        <NichChat variant="floating" open={isOpen} onClose={() => setIsOpen(false)} />
      )}

      {floatingEnabled && !isDismissed && (
        <NichButton open={isOpen} onClick={toggle} onDismiss={dismiss} tourMode={showIntro} />
      )}
    </>
  );
}
