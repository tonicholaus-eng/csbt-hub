"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./MM2NichConsole.module.css";
import MM2NichCard from "./MM2NichCards";
import { askMM2Nich } from "../../../lib/nich/mm2/client";
import {
  clearMM2Session,
  createMM2Session,
  readMM2Session,
  writeMM2Session,
  type MM2NichContext,
  type MM2NichSession,
  type MM2SessionMessage,
} from "../../../lib/nich/mm2/session";
import { isMM2ResponseMeta } from "../../../lib/nich/responseMeta";
import type { MM2Activity } from "../../../lib/nich/mm2/result";
import { MM2_ACTIVITY_LABELS, mm2SourceLabel } from "../../../content/nichCopy";

/**
 * The MM2 NICH operations console.
 *
 * A workstation, not a chat page: the conversation is the workspace, but the
 * answers are structured readouts from the deterministic MM2 engine and the
 * console says so — each response carries the provenance the engine reported
 * (LOCAL MM2 ENGINE / SUPREME VALUES / TRADE ENGINE / NICH AI). Those labels
 * come from the backend's `meta`, never from inspecting the text here.
 *
 * State ownership: the console owns one MM2 session — the visible transcript
 * and the structured context together — persisted by `lib/nich/mm2/session`
 * under an MM2-only key. They are stored as a single record on purpose: when
 * they lived apart, a refresh restored MM2's memory while the conversation
 * itself vanished.
 */

/**
 * The transcript entry is the *persisted* shape.
 *
 * Using one type for both means anything the console can render is by
 * definition serialisable, so a message cannot be displayed in a form that
 * survives a refresh only partially.
 */
type ConsoleMessage = MM2SessionMessage;

type QuickOperation = {
  id: string;
  label: string;
  /** Inserted into the composer for the user to complete. */
  template: string;
  /** Sent immediately — only for operations that need no weapon name. */
  immediate?: boolean;
};

const QUICK_OPERATIONS: QuickOperation[] = [
  { id: "value", label: "Weapon value", template: "value of " },
  { id: "compare", label: "Compare weapons", template: "compare  vs " },
  { id: "trade", label: "Analyze trade", template: "my  for their " },
  { id: "scan", label: "Market scan", template: "top 10 godlies", immediate: true },
  { id: "demand", label: "Demand check", template: "demand of " },
  { id: "gcash", label: "GCash value", template: "gcash value of " },
];

/**
 * The boot line. Rendered above a restored transcript rather than stored in
 * it, so it never accumulates and never counts against the history cap.
 */
const GREETING: ConsoleMessage = {
  id: "boot",
  role: "nich",
  text:
    "MM2 NICH here. I read the MM2 weapon catalog directly, so I can give you Supreme or GCash values, demand, comparisons and Win / Fair / Lose on a trade. What are you looking at?",
  createdAt: 0,
  sources: ["LOCAL MM2 ENGINE", "MM2 CATALOG"],
  channel: "LOCAL",
};

function messageId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Render NICH's prose.
 *
 * Only `**bold**` is supported, because that is the only markup the MM2 engine
 * emits. Anything richer belongs in a structured card, not in parsed text.
 */
function renderText(text: string) {
  return text.split("\n").map((line, lineIndex) => (
    <span key={lineIndex} className={styles.textLine}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={partIndex}>{part.slice(2, -2)}</strong>
        ) : (
          part
        ),
      )}
    </span>
  ));
}

export default function MM2NichConsole({
  initialQuery,
  status,
}: {
  /** Forwarded from the homepage desk via ?q=. Runs exactly once. */
  initialQuery?: string;
  status: {
    valueSource: string;
    catalogSize: number;
    gcashPriced: number;
    demandRated: number;
    syncedOn: string;
  };
}) {
  // Starts empty on both server and client so the first render matches the
  // markup; the stored session arrives after mount.
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [activity, setActivity] = useState<MM2Activity>("ONLINE");
  /**
   * Phones only. The rail's reference blocks — what we are talking about, and
   * what NICH can see — are useful but they are not the conversation, and
   * stacked under a chat on a 390px screen they push the composer out of reach.
   * Desktop ignores this entirely: the CSS keeps the rail expanded above 860px
   * whatever this says.
   */
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [context, setContext] = useState<MM2NichContext | null>(null);
  /**
   * The write gate.
   *
   * Without it the persistence effect fires on the first render, saves the
   * empty initial state over the stored session, and hydration then finds
   * nothing — the transcript would be erased by the very code meant to keep it.
   */
  const [hydrated, setHydrated] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<MM2NichContext | null>(null);
  const requestRef = useRef(0);
  /** Queries already consumed, so a re-render or a refresh cannot repeat one. */
  const consumedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    // Client-only, and deferred so this hydration sync does not synchronously
    // cascade another render (React 19 / eslint react-hooks rule) — the same
    // pattern NichAssistant already uses.
    const stored = readMM2Session();
    contextRef.current = stored.context;
    consumedQueryRef.current = stored.consumedQuery ?? null;

    queueMicrotask(() => {
      setMessages(stored.messages);
      setContext(stored.context);
      setHydrated(true);
    });
  }, []);

  /**
   * Persist the whole session — transcript and structured context together.
   *
   * Gated on `hydrated` so it can never run before the restore, and keyed on
   * the two things that actually constitute the session. Transient state
   * (pending, activity, the draft) is deliberately excluded: it must not be
   * restored, and it must not trigger a write.
   */
  useEffect(() => {
    if (!hydrated || context === null) return;
    writeMM2Session({
      messages,
      context,
      ...(consumedQueryRef.current ? { consumedQuery: consumedQueryRef.current } : {}),
    });
  }, [hydrated, messages, context]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = useCallback(async (raw: string) => {
    const message = raw.trim();
    if (!message || pending) return;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setMessages((current) => [...current, { id: messageId(), role: "user", text: message, createdAt: Date.now() }]);
    setDraft("");
    setPending(true);

    // The in-flight label. Truthful for every request: the local MM2 engine
    // always runs before any model, so the console is genuinely querying the
    // MM2 database while this is shown. Where the answer finally came from is
    // stated exactly by the provenance chips on the response itself.
    const normalized = message.toLowerCase();
    setActivity(
      /\bfor their\b|\bwfl\b/.test(normalized)
        ? "ANALYZING TRADE"
        : /\btop\b|\bbetween\b|\baround\b|\bhigh demand\b/.test(normalized)
          ? "SEARCHING CATALOG"
          : "QUERYING MM2 DATABASE",
    );

    // The ref is populated by the hydration effect before any send is possible,
    // so a fresh session is only ever used on the very first turn.
    const current = contextRef.current ?? createMM2Session().context;
    const result = await askMM2Nich(message, current);

    if (requestRef.current !== requestId) return;

    if (!result.ok) {
      if (result.error) {
        setMessages((messagesNow) => [
          ...messagesNow,
          { id: messageId(), role: "nich", text: result.error, createdAt: Date.now(), error: true },
        ]);
      }
      setPending(false);
      setActivity("READY");
      return;
    }

    contextRef.current = result.context;
    setContext(result.context);

    const meta = isMM2ResponseMeta(result.response.meta) ? result.response.meta : undefined;

    setMessages((messagesNow) => [
      ...messagesNow,
      {
        id: messageId(),
        role: "nich",
        text: result.response.text,
        createdAt: Date.now(),
        // Provenance is stored with the message, so a restored answer still
        // shows where it actually came from instead of being re-guessed.
        sources: meta?.sources,
        channel: meta?.channel,
        structured: meta?.structured,
      },
    ]);

    setPending(false);
    setActivity("READY");
  }, [pending]);

  /**
   * The forwarded homepage question, run exactly once.
   *
   * Three separate things could otherwise repeat it: a re-render, React's dev
   * double-invoke, and — now that the transcript survives — a refresh with the
   * same `?q=` still in the address bar. The ref covers the first two; the
   * consumed query is persisted with the session for the third, and the URL is
   * then cleaned so a shared or bookmarked link does not re-ask on every visit.
   */
  useEffect(() => {
    if (!hydrated) return;

    const query = initialQuery?.trim();
    if (!query) return;

    if (consumedQueryRef.current === query) {
      // Already answered in a previous life of this page. Drop it from the URL
      // so a further refresh is unambiguous, but do not re-ask.
      router.replace(pathname, { scroll: false });
      return;
    }

    consumedQueryRef.current = query;
    void send(query);
    router.replace(pathname, { scroll: false });
    // `send` is intentionally omitted: including it would re-run this effect
    // whenever `pending` flips, re-asking the forwarded question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, hydrated, pathname, router]);

  const runQuickOperation = useCallback((operation: QuickOperation) => {
    if (operation.immediate) {
      void send(operation.template);
      return;
    }
    setDraft(operation.template);
    inputRef.current?.focus();
    // Park the caret where the weapon name goes.
    requestAnimationFrame(() => {
      const gap = operation.template.indexOf("  ");
      const caret = gap >= 0 ? gap + 1 : operation.template.length;
      inputRef.current?.setSelectionRange(caret, caret);
    });
  }, [send]);

  const askFromCard = useCallback((message: string) => {
    // A completed phrase is sent; a template ending in a space needs the user.
    if (message.endsWith(" ")) {
      setDraft(message);
      inputRef.current?.focus();
      return;
    }
    void send(message);
  }, [send]);

  /**
   * Clear the whole MM2 session: transcript, structured context and the
   * consumed-query marker, in storage as well as in memory. Adopt Me's keys
   * are untouched. A refresh afterwards must stay empty, which is why the
   * legacy context key is removed too rather than left to migrate back in.
   */
  const resetConversation = useCallback(() => {
    requestRef.current += 1;
    clearMM2Session();

    const fresh: MM2NichSession = createMM2Session();
    contextRef.current = fresh.context;
    consumedQueryRef.current = null;

    setContext(fresh.context);
    setMessages([]);
    setPending(false);
    setActivity("ONLINE");
  }, []);

  /** Only context that genuinely exists in the session is shown. */
  const activeContext = useMemo(() => {
    if (!context) return null;
    const trade = context.lastTrade;
    if (trade && (trade.yourItemIds.length || trade.theirItemIds.length)) {
      return {
        title: "CURRENT TRADE",
        rows: [
          `Your side: ${trade.yourItemIds.reduce((total, row) => total + row.quantity, 0)}`,
          `Their side: ${trade.theirItemIds.reduce((total, row) => total + row.quantity, 0)}`,
          trade.valueSource === "GCASH" ? "GCash Value" : "Supreme Value",
        ],
      };
    }
    if ((context.comparisonItemIds?.length ?? 0) >= 2) {
      return { title: "COMPARING", rows: [`${context.comparisonItemIds!.length} weapons`] };
    }
    if (context.recentItemIds?.length) {
      return {
        title: "WE ARE TALKING ABOUT",
        rows: [`${context.recentItemIds.length} ${context.recentItemIds.length === 1 ? "weapon" : "weapons"}`],
      };
    }
    return null;
  }, [context]);

  return (
    <div className={styles.console}>
      {/* --- environment: the room this console stands in ------------------ */}
      <div className={styles.environment} aria-hidden="true">
        <div className={styles.ceiling} />
        <div className={styles.rearWall} />
        <div className={styles.floor} />
        <div className={styles.coolDepth} />
        <div className={styles.vignette} />
      </div>

      <header className={styles.hud}>
        <div className={styles.hudBrand}>
          <span>MM2 TRADING HEADQUARTERS</span>
          <h1>
            NICH <b>{"//"}</b> MM2 INTELLIGENCE SYSTEM
          </h1>
          <small>MM2 VALUES · TRADES · DEMAND</small>
        </div>

        <dl className={styles.hudReadouts}>
          <div className={styles.hudLive}>
            <i /> {MM2_ACTIVITY_LABELS[activity]}
          </div>
          <div><dt>VALUES</dt><dd>{status.valueSource}</dd></div>
          <div><dt>UPDATED</dt><dd>{status.syncedOn}</dd></div>
        </dl>
      </header>

      <div className={styles.body}>
        <section className={styles.workspace} aria-label="NICH conversation">
          <div className={styles.transcript} ref={transcriptRef}>
            {[GREETING, ...messages].map((message) =>
              message.role === "user" ? (
                <div key={message.id} className={styles.userTurn}>
                  <span>{message.text}</span>
                </div>
              ) : (
                <div key={message.id} className={styles.nichTurn}>
                  {message.sources?.length ? (
                    <div className={styles.provenance}>
                      {message.sources.map((source) => (
                        <span key={source} className={message.channel === "AI" ? styles.provenanceAi : undefined}>
                          {mm2SourceLabel(source)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className={message.error ? styles.errorText : styles.nichText}>
                    {renderText(message.text)}
                  </div>

                  {message.structured ? (
                    <MM2NichCard result={message.structured} onAsk={askFromCard} />
                  ) : null}
                </div>
              ),
            )}

            {pending ? (
              <div className={styles.nichTurn}>
                <div className={styles.working} role="status">
                  <i /><i /><i />
                  <span>{MM2_ACTIVITY_LABELS[activity]}</span>
                </div>
              </div>
            ) : null}
          </div>

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label className="sr-only" htmlFor="mm2-nich-console-input">Ask NICH about MM2</label>
            <input
              id="mm2-nich-console-input"
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask NICH about MM2..."
              disabled={pending}
              maxLength={400}
              autoComplete="off"
            />
            <button type="submit" disabled={pending || !draft.trim()}>
              SEND <b>→</b>
            </button>
          </form>
        </section>

        <aside className={styles.rail} aria-label="NICH system status">
          <div className={styles.portrait}>
            <div className={styles.portraitFrame}>
              <Image src="/nich/nich-face.png" alt="" fill sizes="160px" className={styles.portraitImage} />
              <span className={styles.scanline} aria-hidden="true" />
            </div>
            <div className={styles.portraitMeta}>
              <strong>NICH</strong>
              <span><i /> {MM2_ACTIVITY_LABELS[activity]}</span>
            </div>
          </div>

          <div className={styles.railBlock}>
            <div className={styles.railLabel}>QUICK CHECKS</div>
            <div className={styles.operations}>
              {QUICK_OPERATIONS.map((operation) => (
                <button
                  key={operation.id}
                  type="button"
                  onClick={() => runQuickOperation(operation)}
                  disabled={pending}
                >
                  {operation.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={styles.referenceToggle}
            onClick={() => setReferenceOpen((open) => !open)}
            aria-expanded={referenceOpen}
          >
            <span>{activeContext ? activeContext.title : "TRADE DETAILS"}</span>
            <i aria-hidden="true">{referenceOpen ? "–" : "+"}</i>
          </button>

          <div className={`${styles.reference} ${referenceOpen ? styles.referenceOpen : ""}`}>
          {activeContext ? (
            <div className={styles.railBlock}>
              <div className={styles.railLabel}>{activeContext.title}</div>
              <ul className={styles.contextList}>
                {activeContext.rows.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Now that the transcript survives a reload, it needs an exit that
              does not depend on structured memory: a session can hold messages
              with no active weapon (AI fallbacks), and that must still be
              clearable. */}
          {activeContext || messages.length ? (
            <div className={styles.railBlock}>
              <button type="button" className={styles.resetButton} onClick={resetConversation}>
                Start a new chat
              </button>
            </div>
          ) : null}

          <div className={styles.railBlock}>
            {/* What NICH can see, in weapons — not which modules are up. The
                panel used to read LOCAL ENGINE / READY, TRADE ENGINE / READY,
                which told a trader nothing they could act on. */}
            <div className={styles.railLabel}>WHAT I CAN CHECK</div>
            <ul className={styles.statusList}>
              <li><span>WEAPONS</span><b>{status.catalogSize.toLocaleString("en-US")}</b></li>
              <li><span>WITH GCASH VALUES</span><b>{status.gcashPriced.toLocaleString("en-US")}</b></li>
              <li><span>WITH DEMAND</span><b>{status.demandRated.toLocaleString("en-US")}</b></li>
              <li><span>VALUES</span><b>{status.valueSource}</b></li>
              <li><span>UPDATED</span><b>{status.syncedOn}</b></li>
            </ul>
          </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
