"use client";

import Link from "next/link";

import styles from "./MM2NichConsole.module.css";
import type {
  MM2ItemSummary,
  MM2StructuredResult,
  MM2TradeSideRow,
} from "../../../lib/nich/mm2/result";

/**
 * Structured MM2 answers.
 *
 * Every figure on these cards comes from the deterministic engine's structured
 * payload — none of it is parsed back out of NICH's prose, and none of it is
 * recomputed here. A card that did its own arithmetic could disagree with the
 * calculator, which is the one thing MM2's value surfaces must never do.
 *
 * `null` renders as "N/A", never as 0. 189 MM2 weapons have no Supreme value
 * and 160 have no GCash value; a zero in a price column reads as "free".
 */

function fmt(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function demandTier(demand: number | null): string | null {
  if (demand === null) return null;
  if (demand >= 8) return "very high";
  if (demand >= 6) return "high";
  if (demand >= 3) return "moderate";
  return "low";
}

// ---------------------------------------------------------------------------

function ItemCard({ item, focus, onAsk }: { item: MM2ItemSummary; focus: string; onAsk: (message: string) => void }) {
  const tier = demandTier(item.demand);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <strong>{item.name}</strong>
          <span>{item.category}</span>
        </div>
        <i aria-hidden="true" />
      </div>

      <div className={styles.metricRow}>
        <div className={focus === "SUPREME" ? styles.metricLead : undefined}>
          <small>SUPREME</small>
          <b>{fmt(item.supreme)}</b>
        </div>
        <div className={focus === "GCASH" ? styles.metricLead : undefined}>
          <small>GCASH</small>
          <b>{fmt(item.gcash)}</b>
        </div>
        <div className={focus === "DEMAND" ? styles.metricLead : undefined}>
          <small>DEMAND</small>
          <b>{item.demand === null ? "N/A" : `${item.demand}/10`}</b>
          {tier ? <em>{tier}</em> : null}
        </div>
      </div>

      <div className={styles.cardActions}>
        <Link href={item.href}>View weapon</Link>
        <button type="button" onClick={() => onAsk(`compare ${item.name} to `)}>Compare</button>
        <button type="button" onClick={() => onAsk(`my ${item.name} for their `)}>Add to trade</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ComparisonCard({
  result,
  onAsk,
}: {
  result: Extract<MM2StructuredResult, { kind: "comparison" }>;
  onAsk: (message: string) => void;
}) {
  const metricLabel = result.metric === "demand" ? "DEMAND" : result.source === "GCASH" ? "GCASH" : "SUPREME";
  const winner = result.items.find((item) => item.id === result.winnerId) ?? null;

  return (
    <div className={styles.card}>
      <div className={styles.compareGrid} style={{ gridTemplateColumns: `repeat(${result.items.length}, minmax(0, 1fr))` }}>
        {result.items.map((item) => (
          <div key={item.id} className={item.id === result.winnerId ? styles.compareWinner : undefined}>
            <strong>{item.name}</strong>
            <span>{item.category}</span>
            <dl>
              <div><dt>Supreme</dt><dd>{fmt(item.supreme)}</dd></div>
              <div><dt>GCash</dt><dd>{fmt(item.gcash)}</dd></div>
              <div><dt>Demand</dt><dd>{item.demand === null ? "N/A" : `${item.demand}/10`}</dd></div>
            </dl>
          </div>
        ))}
      </div>

      <div className={styles.edgeRail}>
        {winner && result.edge !== null && !result.tied ? (
          <>
            <small>{metricLabel} EDGE</small>
            <b>
              {winner.name} +{result.metric === "demand" ? result.edge : fmt(result.edge)}
            </b>
          </>
        ) : result.tied && winner ? (
          <>
            <small>{metricLabel} EDGE</small>
            <b>Tied</b>
          </>
        ) : (
          <>
            <small>{metricLabel} EDGE</small>
            {/* Not "0" — the engine declined to rank, which is a different fact. */}
            <b>Not comparable</b>
          </>
        )}
      </div>

      <div className={styles.cardActions}>
        {result.items.map((item) => (
          <Link key={item.id} href={item.href}>{item.name}</Link>
        ))}
        <button
          type="button"
          onClick={() => onAsk(`my ${result.items[0]?.name ?? ""} for their ${result.items[1]?.name ?? ""}`)}
        >
          Start trade
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TradeSide({ title, rows }: { title: string; rows: MM2TradeSideRow[] }) {
  return (
    <div className={styles.tradeSide}>
      <small>{title}</small>
      {rows.length === 0 ? (
        <p className={styles.tradeEmpty}>Empty</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={`${row.id}-${row.quantity}`}>
              <Link href={row.href}>{row.name}</Link>
              {row.quantity > 1 ? <i>×{row.quantity}</i> : null}
              <b>{row.line === null ? "N/A" : fmt(row.line)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TradeCard({ result }: { result: Extract<MM2StructuredResult, { kind: "trade" }> }) {
  const check = result.verdict === "CHECK";

  return (
    <div className={`${styles.card} ${styles.tradeCard}`}>
      <div className={`${styles.verdictRail} ${styles[`verdict${result.verdict}`] ?? ""}`}>
        <strong>{result.verdict}</strong>
        <span>{result.source === "GCASH" ? "GCash Value" : "Supreme Value"}</span>
      </div>

      <div className={styles.tradeGrid}>
        <TradeSide title="YOUR SIDE" rows={result.yours} />
        <TradeSide title="THEIR SIDE" rows={result.theirs} />
      </div>

      {check ? (
        <p className={styles.tradeCheck}>
          {result.missingNames.join(", ")} {result.missingNames.length === 1 ? "has" : "have"} no{" "}
          {result.source === "GCASH" ? "GCash" : "Supreme"} value in the catalog, so the verdict is withheld.
          CSBT does not estimate a missing value or count it as zero.
        </p>
      ) : (
        <div className={styles.tradeTotals}>
          <div><small>YOUR TOTAL</small><b>{fmt(result.yourTotal)}</b></div>
          <div><small>THEIR TOTAL</small><b>{fmt(result.theirTotal)}</b></div>
          <div><small>DIFFERENCE</small><b>{fmt(result.difference)}</b><em>{result.differencePercent.toFixed(1)}%</em></div>
        </div>
      )}

      <div className={styles.cardActions}>
        <Link href={result.calculatorHref}>Open in MM2 Calculator</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CatalogCard({
  result,
  onAsk,
}: {
  result: Extract<MM2StructuredResult, { kind: "catalog" }>;
  onAsk: (message: string) => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <strong>{result.heading}</strong>
          <span>{result.total.toLocaleString("en-US")} matched</span>
        </div>
        <i aria-hidden="true" />
      </div>

      <ol className={styles.catalogList}>
        {result.rows.map((item, index) => (
          <li key={item.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <Link href={item.href}>{item.name}</Link>
            <em>{item.category}</em>
            <b>
              {result.showDemand
                ? item.demand === null
                  ? "N/A"
                  : `${item.demand}/10`
                : fmt(result.source === "GCASH" ? item.gcash : item.supreme)}
            </b>
            <button type="button" onClick={() => onAsk(`${item.name} value`)} aria-label={`Ask about ${item.name}`}>
              ›
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ClarifyCard({
  result,
  onAsk,
}: {
  result: Extract<MM2StructuredResult, { kind: "clarify" }>;
  onAsk: (message: string) => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <strong>Which one?</strong>
          <span>&ldquo;{result.query}&rdquo; matches more than one weapon</span>
        </div>
        <i aria-hidden="true" />
      </div>

      <div className={styles.clarifyList}>
        {result.candidates.map((item) => (
          <button key={item.id} type="button" onClick={() => onAsk(`${item.name} value`)}>
            <strong>{item.name}</strong>
            <span>{item.category}</span>
            <b>{fmt(item.supreme)}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function MM2NichCard({
  result,
  onAsk,
}: {
  result: MM2StructuredResult;
  onAsk: (message: string) => void;
}) {
  switch (result.kind) {
    case "item":
      return <ItemCard item={result.item} focus={result.focus} onAsk={onAsk} />;
    case "comparison":
      return <ComparisonCard result={result} onAsk={onAsk} />;
    case "trade":
      return <TradeCard result={result} />;
    case "catalog":
      return <CatalogCard result={result} onAsk={onAsk} />;
    case "clarify":
      return <ClarifyCard result={result} onAsk={onAsk} />;
    default:
      return null;
  }
}
