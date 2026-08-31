"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import styles from "./MM2HQHome.module.css";
import { buildMM2NichHref } from "../../lib/nich/mm2/client";

/**
 * The homepage NICH access terminal.
 *
 * Deliberately *not* a chat surface. The lobby's job is to show that MM2 NICH
 * is live and to get the operator into the console with their question intact;
 * the conversation itself belongs at /mm2/nich, where there is room for
 * structured readouts.
 *
 * So this component answers nothing. It forwards. Typing "harvester value"
 * here navigates to /mm2/nich?q=harvester%20value and the console runs it once
 * on arrival — which also means the homepage ships no NICH client logic, no
 * catalog and no conversation state.
 */

const QUICK_COMMANDS = [
  { label: "Analyze Trade", query: "my harvester for their icebreaker" },
  { label: "Compare Weapons", query: "compare harvester vs icepiercer" },
  { label: "Market Scan", query: "top 10 godlies" },
] as const;

export default function MM2NichDesk() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [navigating, setNavigating] = useState(false);
  const submittedRef = useRef(false);

  const openConsole = useCallback(
    (query?: string) => {
      // Guard against a double submit (Enter + click, or a fast double tap)
      // queueing two navigations, which would run the query twice.
      if (submittedRef.current) return;
      submittedRef.current = true;
      setNavigating(true);

      // Shared with the console page's reader, so the two agree on encoding
      // and the length cap.
      router.push(buildMM2NichHref(query));
    },
    [router],
  );

  return (
    <section className={styles.nichDesk}>
      <div className={styles.nichCopy}>
        <div className={styles.nichHeading}>
          <strong>NICH <b>{"//"}</b> AI SYSTEM</strong>
          <span><i /> ONLINE · MM2 CORE</span>
        </div>

        <p>
          MM2 intelligence system active. Ask about weapon values, GCash, demand,
          comparisons or trades — answered from the MM2 catalog.
        </p>

        <form
          className={styles.nichInput}
          onSubmit={(event) => {
            event.preventDefault();
            openConsole(question);
          }}
        >
          <label className="sr-only" htmlFor="mm2-nich-question">
            Ask NICH about MM2
          </label>
          <input
            id="mm2-nich-question"
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask NICH about MM2..."
            disabled={navigating}
            maxLength={400}
            autoComplete="off"
          />
          <button type="submit" disabled={navigating} aria-label="Open NICH console with this question">
            <b>→</b>
          </button>
        </form>

        <div className={styles.nichActions}>
          {QUICK_COMMANDS.map((command) => (
            <button
              key={command.label}
              type="button"
              onClick={() => openConsole(command.query)}
              disabled={navigating}
            >
              {command.label}
            </button>
          ))}
        </div>

        <Link href="/mm2/nich" className={styles.nichOpen}>
          OPEN NICH CONSOLE <b>→</b>
        </Link>

        <div className={styles.nichFooter}>
          <span>VALUES</span>
          <i />
          <span>DEMAND</span>
          <i />
          <span>TRADES</span>
        </div>
      </div>

      <div className={styles.nichAvatar} aria-hidden="true">
        <Image src="/nich/nich-face.png" alt="" fill sizes="120px" className={styles.nichAvatarImage} />
      </div>
    </section>
  );
}
