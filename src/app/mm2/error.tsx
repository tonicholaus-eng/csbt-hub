"use client";

import Link from "next/link";
import { useEffect } from "react";
import MM2Shell from "../../components/mm2/MM2Shell";

/**
 * MM2's own error boundary. Without it an MM2 render error falls through to the
 * root boundary, which renders the Adopt Me shell and silently drops the user
 * out of MM2 mode.
 */
export default function MM2Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("MM2 route error:", error);
  }, [error]);

  return (
    <MM2Shell measure="standard">
      <div className="mx-auto max-w-xl rounded-[24px] border border-[var(--mm2-edge-lit)] bg-[var(--mm2-panel)] p-8 shadow-[var(--mm2-shadow-panel)]">
        <p className="text-[11px] font-black uppercase tracking-[.2em] text-[var(--mm2-crimson-text)]">
          MM2 Command Deck
        </p>
        <h1 className="mt-2.5 text-[28px] font-black leading-tight tracking-[-.035em] text-white">
          This MM2 screen could not load.
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--mm2-ink-3)]">
          The rest of MM2 is still available. Try this screen again, or head back to the command
          deck.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[12px] text-[var(--mm2-ink-4)]">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-[12px] border border-[var(--mm2-edge-lit)] bg-[linear-gradient(135deg,rgba(143,18,36,.9),rgba(194,37,57,.75))] px-5 text-[13px] font-black text-[#fff4f5] transition hover:brightness-110"
          >
            Try again
          </button>
          <Link
            href="/mm2"
            className="inline-flex min-h-11 items-center rounded-[12px] border border-[var(--mm2-edge-strong)] bg-[var(--mm2-riser)] px-5 text-[13px] font-black text-[var(--mm2-ink-2)] transition hover:bg-[var(--mm2-lift)] hover:text-white"
          >
            MM2 Home
          </Link>
          <Link
            href="/mm2/values"
            className="inline-flex min-h-11 items-center rounded-[12px] border border-[var(--mm2-edge-strong)] bg-[var(--mm2-riser)] px-5 text-[13px] font-black text-[var(--mm2-ink-2)] transition hover:bg-[var(--mm2-lift)] hover:text-white"
          >
            Weapon Values
          </Link>
        </div>
      </div>
    </MM2Shell>
  );
}
