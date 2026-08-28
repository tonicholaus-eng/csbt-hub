"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./MM2NichConsole.module.css";
import MM2NichCard from "./MM2NichCards";
import {
  askMM2Nich,
  clearMM2Context,
  readMM2Context,
  writeMM2Context,
  type MM2NichContext,
} from "../../../lib/nich/mm2/client";
import { isMM2ResponseMeta } from "../../../lib/nich/responseMeta";
import type { MM2Activity, MM2SourceLabel, MM2StructuredResult } from "../../../lib/nich/mm2/result";

/**
 * The MM2 NICH operations console.
 *
 * A workstation, not a chat page: the conversation is the workspace, but the
 * answers are structured readouts from the deterministic MM2 engine and the
 * console says so — each response carries the provenance the engine reported
 * (LOCAL MM2 ENGINE / SUPREME VALUES / TRADE ENGINE / NICH AI). Those labels
 * come from the backend's `meta`, never from inspecting the text here.
 *
 * State ownership: the MM2 conversation context lives in `lib/nich/mm2/client`
 * under an MM2-only storage key, shared with the homepage desk, so a question
 * started on the homepage continues here with its follow-up context intact.
 */

type ConsoleMessage = {
  id: string;
  role: "user" | "nich";
  text: string;
  sources?: MM2SourceLabel[];
  channel?: "LOCAL" | "AI";
  structured?: MM2StructuredResult;
  error?: boolean;
};

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

const GREETING: ConsoleMessage = {
  id: "boot",
  role: "nich",
  text:
    "MM2 intelligence system online. I read the MM2 weapon catalog directly — Supreme and GCash values, demand, comparisons and Win/Fair/Lose. Ask me anything about MM2.",
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
  const [messages, setMessages] = useState<ConsoleMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [activity, setActivity] = useState<MM2Activity>("ONLINE");
  const [pending, setPending] = useState(false);
  const [context, setContext] = useState<MM2NichContext | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<MM2NichContext | null>(null);
  const requestRef = useRef(0);
  /**
   * Guards the forwarded query against React 18 double-invocation in dev, a
   * refresh, and a re-render that changes `initialQuery`'s identity. Without
   * it "harvester value" would be asked twice on arrival.
   */
  const forwardedRef = useRef<string | null>(null);

  useEffect(() => {
    // Deferred so this hydration-only sync does not synchronously cascade
    // another render (React 19 / eslint react-hooks rule), matching the
    // pattern NichAssistant already uses for the same situation.
    const stored = readMM2Context();
    contextRef.current = stored;
    queueMicrotask(() => setContext(stored));
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = useCallback(async (raw: string) => {
    const message = raw.trim();
    if (!message || pending) return;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setMessages((current) => [...current, { id: messageId(), role: "user", text: message }]);
    setDraft("");
    setPending(true);

    // Provisional activity from the shape of the question. The response's own
    // reported activity replaces it as soon as it lands.
    const normalized = message.toLowerCase();
    setActivity(
      /\bfor their\b|\bwfl\b/.test(normalized)
        ? "ANALYZING TRADE"
        : /\btop\b|\bbetween\b|\baround\b|\bhigh demand\b/.test(normalized)
          ? "SEARCHING CATALOG"
          : "QUERYING MM2 DATABASE",
    );

    const current = contextRef.current ?? readMM2Context();
    const result = await askMM2Nich(message, current);

    if (requestRef.current !== requestId) return;

    if (!result.ok) {
      if (result.error) {
        setMessages((messagesNow) => [
          ...messagesNow,
          { id: messageId(), role: "nich", text: result.error, error: true },
        ]);
      }
      setPending(false);
      setActivity("READY");
      return;
    }

    contextRef.current = result.context;
    setContext(result.context);
    writeMM2Context(result.context);

    const meta = isMM2ResponseMeta(result.response.meta) ? result.response.meta : undefined;

    setMessages((messagesNow) => [
      ...messagesNow,
      {
        id: messageId(),
        role: "nich",
        text: result.response.text,
        sources: meta?.sources,
        channel: meta?.channel,
        structured: meta?.structured,
      },
    ]);

    setPending(false);
    setActivity("READY");
  }, [pending]);

  // Forwarded homepage query. Fires once, after context has loaded.
  useEffect(() => {
    const query = initialQuery?.trim();
    if (!query || context === null) return;
    if (forwardedRef.current === query) return;
    forwardedRef.current = query;
    void send(query);
    // `send` is intentionally omitted: including it would re-run this effect
    // whenever `pending` flips, re-asking the forwarded question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, context]);

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

  const resetConversation = useCallback(() => {
    requestRef.current += 1;
    clearMM2Context();
    const fresh = readMM2Context();
    contextRef.current = fresh;
    setContext(fresh);
    setMessages([GREETING]);
    setPending(false);
    setActivity("ONLINE");
  }, []);

  /** Only context that genuinely exists in the session is shown. */
  const activeContext = useMemo(() => {
    if (!context) return null;
    const trade = context.lastTrade;
    if (trade && (trade.yourItemIds.length || trade.theirItemIds.length)) {
      return {
        title: "TRADE SESSION",
        rows: [
          `Your side: ${trade.yourItemIds.reduce((total, row) => total + row.quantity, 0)}`,
          `Their side: ${trade.theirItemIds.reduce((total, row) => total + row.quantity, 0)}`,
          trade.valueSource === "GCASH" ? "GCash Value" : "Supreme Value",
        ],
      };
    }
    if ((context.comparisonItemIds?.length ?? 0) >= 2) {
      return { title: "COMPARE SESSION", rows: [`${context.comparisonItemIds!.length} weapons in comparison`] };
    }
    if (context.recentItemIds?.length) {
      return { title: "ACTIVE CONTEXT", rows: [`${context.recentItemIds.length} weapon(s) in memory`] };
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
          <small>AI OPERATIONS · NICH SYSTEM 01</small>
        </div>

        <dl className={styles.hudReadouts}>
          <div className={styles.hudLive}>
            <i /> {activity}
          </div>
          <div><dt>VALUE SOURCE</dt><dd>{status.valueSource}</dd></div>
          <div><dt>CATALOG SYNC</dt><dd>{status.syncedOn}</dd></div>
        </dl>
      </header>

      <div className={styles.body}>
        <section className={styles.workspace} aria-label="NICH conversation">
          <div className={styles.transcript} ref={transcriptRef}>
            {messages.map((message) =>
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
                          {source}
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
                  <span>{activity}</span>
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
              <span><i /> {activity}</span>
            </div>
          </div>

          <div className={styles.railBlock}>
            <div className={styles.railLabel}>QUICK OPERATIONS</div>
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

          {activeContext ? (
            <div className={styles.railBlock}>
              <div className={styles.railLabel}>{activeContext.title}</div>
              <ul className={styles.contextList}>
                {activeContext.rows.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
              <button type="button" className={styles.resetButton} onClick={resetConversation}>
                Clear session
              </button>
            </div>
          ) : null}

          <div className={styles.railBlock}>
            <div className={styles.railLabel}>SYSTEM STATUS</div>
            <ul className={styles.statusList}>
              <li><span>MM2 MODE</span><b className={styles.ok}>ACTIVE</b></li>
              <li><span>LOCAL ENGINE</span><b className={styles.ok}>READY</b></li>
              <li><span>MM2 CATALOG</span><b>{status.catalogSize.toLocaleString("en-US")}</b></li>
              <li><span>SUPREME VALUES</span><b>{status.valueSource}</b></li>
              <li><span>GCASH DATA</span><b>{status.gcashPriced.toLocaleString("en-US")}</b></li>
              <li><span>DEMAND DATA</span><b>{status.demandRated.toLocaleString("en-US")}</b></li>
              <li><span>TRADE ENGINE</span><b className={styles.ok}>READY</b></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
