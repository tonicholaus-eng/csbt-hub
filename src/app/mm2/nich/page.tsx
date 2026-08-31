import type { Metadata } from "next";

import MM2Shell from "../../../components/mm2/MM2Shell";
import MM2NichConsole from "../../../components/mm2/nich/MM2NichConsole";
import mm2Items from "../../../data/mm2Items.json";
import mm2Meta from "../../../data/mm2Meta.json";
import { readForwardedQuery } from "../../../lib/nich/mm2/client";

export const metadata: Metadata = {
  title: "NICH — MM2 Intelligence System",
  description:
    "Ask NICH about any MM2 weapon: Supreme and GCash values, demand, comparisons, and Win / Fair / Lose on a trade.",
};

type MM2Row = {
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | null;
};

/**
 * NICH // MM2 INTELLIGENCE SYSTEM.
 *
 * A server component that renders the MM2 shell and hands the console a small,
 * *truthful* status snapshot. The counts below are computed from the generated
 * catalog at build time — they are coverage facts, not invented telemetry.
 * There is deliberately no "users online", "accuracy %" or "market activity"
 * here, because the application cannot derive any of those.
 *
 * The catalog itself is not shipped to the browser from this page: the console
 * is a thin client that posts to `/api/nich`, where the MM2 brain and the
 * 1,099-row catalog already live on the server.
 */
export default async function MM2NichPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;

  /**
   * The forwarded question from the homepage desk.
   *
   * Taken as a plain string and length-capped. Next decodes percent-encoding
   * for us; an array (`?q=a&q=b`) takes the first entry rather than throwing.
   * An empty or whitespace-only value becomes `undefined` so the console does
   * not fire a blank turn on arrival.
   */
  const initialQuery = readForwardedQuery(params.q);

  const items = mm2Items as MM2Row[];
  const meta = mm2Meta as { totalItems?: number; sourceName?: string; sourceFetchedAt?: string };

  const syncedAt = meta.sourceFetchedAt ? new Date(meta.sourceFetchedAt) : null;
  const syncedOn =
    syncedAt && !Number.isNaN(syncedAt.getTime())
      ? syncedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "N/A";

  return (
    <MM2Shell measure="flush">
      <MM2NichConsole
        initialQuery={initialQuery}
        status={{
          valueSource: meta.sourceName ?? "Supreme Values",
          catalogSize: meta.totalItems ?? items.length,
          gcashPriced: items.filter((item) => typeof item.GCASH_VALUE === "number").length,
          demandRated: items.filter((item) => typeof item.DEMAND === "number").length,
          syncedOn,
        }}
      />
    </MM2Shell>
  );
}
