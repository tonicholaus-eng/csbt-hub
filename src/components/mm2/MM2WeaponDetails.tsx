import type { ReactNode } from "react";
import Link from "next/link";
import MM2RelatedWeapons from "./MM2RelatedWeapons";
import MM2WeaponPlate from "./MM2WeaponPlate";
import { mm2RarityTone } from "../../lib/mm2/rarity";

type DemandContext = {
  demand: number | null;
  categoryAverage: number | null;
  categoryRank: number | null;
  categoryRatedCount: number;
  globalRank: number | null;
  globalRatedCount: number;
};

type MM2Item = {
  ID?: string;
  NAME: string;
  IMAGE?: string;
  TYPE?: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | null;
  SOURCE_NAME?: string | null;
  UPDATED_AT?: string | null;
  LAST_SOURCE_SYNC?: string | null;
  NOTES?: string | null;
};

function formatValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US")
    : "N/A";
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function demandLabel(demand: number | null) {
  if (demand === null) return "Unrated";
  if (demand >= 8) return "Very high";
  if (demand >= 6) return "High";
  if (demand >= 4) return "Active";
  if (demand >= 2) return "Moderate";
  return "Low";
}

export default function MM2WeaponDetails({
  item,
  image,
  relatedWeapons = [],
  demandContext,
}: {
  item: MM2Item;
  image?: string | null;
  relatedWeapons?: MM2Item[];
  demandContext: DemandContext;
}) {
  const demand = demandContext.demand;
  const source = item.SOURCE_NAME || "Supreme Values";
  const updatedAt = item.LAST_SOURCE_SYNC || item.UPDATED_AT;
  const hasSupreme = typeof item.SOURCE_VALUE === "number";
  const hasGcash = typeof item.GCASH_VALUE === "number";
  const availableValues = Number(hasSupreme) + Number(hasGcash);
  const calculatorHref = `/mm2/calculator?add=${encodeURIComponent(String(item.ID ?? item.NAME))}&source=SUPREME`;
  const demandMarketHref = item.CATEGORY
    ? `/mm2/demand?category=${encodeURIComponent(item.CATEGORY)}`
    : "/mm2/demand";

  const tone = mm2RarityTone(item.CATEGORY);

  return (
    <section className="overflow-hidden rounded-[26px] border border-[var(--mm2-edge)] bg-[var(--mm2-panel)] shadow-[var(--mm2-shadow-lift)]">
      {/* A display bay, not a colour slab: the light comes from behind the
          weapon and is tinted by its rarity, at the same intensity the vault
          on /mm2 uses. */}
      <div
        className="relative overflow-hidden px-5 py-7 text-white sm:px-8 sm:py-9"
        style={{
          background: `radial-gradient(ellipse 62% 76% at 16% 42%, ${tone.glow}, transparent 68%), linear-gradient(168deg, #101420, #0a0d13 62%, #0c0e14)`,
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, ${tone.edge}, transparent 52%)` }}
        />

        <Link
          href="/mm2/values"
          className="relative inline-flex min-h-11 items-center rounded-[11px] border border-[var(--mm2-edge-strong)] bg-black/30 px-4 text-[13px] font-black text-[var(--mm2-ink-2)] transition hover:border-[var(--mm2-edge-lit)] hover:text-white"
        >
          ← All weapon values
        </Link>

        <div className="relative mt-7 flex flex-col items-center gap-7 sm:flex-row sm:items-center sm:text-left">
          <MM2WeaponPlate
            name={item.NAME}
            category={item.CATEGORY}
            src={image}
            size={184}
            radius={24}
            markScale={0.3}
            className="shrink-0"
          />

          <div className="min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <span
                className="rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[.09em]"
                style={{ borderColor: tone.border, background: tone.chip, color: tone.chipInk }}
              >
                {item.CATEGORY || "Weapon"}
              </span>
              <span className="rounded-full border border-[var(--mm2-edge-strong)] bg-white/[0.05] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.09em] text-[var(--mm2-ink-2)]">
                {demand === null ? "Demand unrated" : `Demand ${demand}/10`}
              </span>
            </div>

            <h1 className="mt-4 break-words text-[34px] font-black leading-[1.02] tracking-[-.05em] sm:text-[52px]">
              {item.NAME}
            </h1>
            <p className="mt-3 max-w-2xl text-[14.5px] font-medium leading-[1.6] text-[var(--mm2-ink-2)]">
              Compare its listed values, inspect the current demand signal, verify the data source, and discover nearby MM2 weapons.
            </p>
            <p className="mt-2.5 text-[12.5px] font-bold text-[var(--mm2-ink-3)]">
              Last data refresh: {formatDate(updatedAt)}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5 sm:justify-start">
              <Link
                href={calculatorHref}
                className="inline-flex min-h-12 items-center rounded-[13px] border border-[var(--mm2-edge-lit)] bg-[linear-gradient(135deg,rgba(143,18,36,.92),rgba(194,37,57,.78))] px-5 text-[13px] font-black text-[#fff4f5] transition hover:brightness-115"
              >
                + Add to Trade Calculator
              </Link>
              <Link
                href={demandMarketHref}
                className="inline-flex min-h-12 items-center rounded-[13px] border border-[var(--mm2-edge-strong)] bg-black/30 px-5 text-[13px] font-black text-[var(--mm2-ink-2)] transition hover:bg-black/45 hover:text-white"
              >
                View Demand Market →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        {/* Same hierarchy as Adopt Me's regular-value summary */}
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard
            label="Supreme Value"
            value={formatValue(item.SOURCE_VALUE)}
            note={source}
          />
          <SummaryCard
            label="GCash Value"
            value={formatValue(item.GCASH_VALUE)}
            note={hasGcash ? "CSBT listed value" : "Not listed in this dataset"}
          />
        </div>

        {/* Value Health mirrors the Adopt Me detail page's trust/provenance layer */}
        <section
          className="mt-5 rounded-[24px] border border-red-400/10 bg-red-400/[0.035] p-4 sm:p-5"
          aria-labelledby="mm2-value-health-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-red-300">
                Value Health
              </p>
              <h2 id="mm2-value-health-title" className="mt-1 text-lg font-black text-white">
                How complete is this snapshot?
              </h2>
            </div>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-zinc-300">
              {availableValues}/2 listed values
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <HealthMetric label="Last verified" value={formatDate(updatedAt)} />
            <HealthMetric
              label="Demand signal"
              value={demand === null ? "Unrated" : `${demand}/10 · ${demandLabel(demand)}`}
            />
            <HealthMetric label="Category" value={item.CATEGORY || "Unknown"} />
            <HealthMetric label="Value source" value={source} />
          </div>

          <p className="mt-4 text-xs font-semibold leading-5 text-zinc-500">
            <strong className="text-zinc-300">Provenance:</strong> CSBT displays the values already present in its MM2 dataset. Missing fields remain N/A and are not estimated.
          </p>
        </section>

        {/* MM2 equivalent to the supporting market/profile section */}
        {/* items-start: the profile panel has fewer rows than the demand
            panel, and stretching it to match left ~40% of it empty. */}
        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.08fr_.92fr]">
          <InfoSection title="Demand profile" eyebrow="Trading signal">
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[.12em] text-zinc-500">
                  Current demand
                </span>
                <strong className="text-sm font-black text-white">
                  {demand === null ? "Unrated" : `${demand}/10 · ${demandLabel(demand)}`}
                </strong>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-400"
                  style={{ width: `${demand === null ? 0 : Math.max(4, Math.min(100, demand * 10))}%` }}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <DemandMetric
                label="Category average"
                value={
                  demandContext.categoryAverage === null
                    ? "N/A"
                    : `${demandContext.categoryAverage.toFixed(1)}/10`
                }
              />
              <DemandMetric
                label="Category rank"
                value={
                  demandContext.categoryRank
                    ? `#${demandContext.categoryRank} of ${demandContext.categoryRatedCount}`
                    : "Unrated"
                }
              />
              <DemandMetric
                label="Global rank"
                value={
                  demandContext.globalRank
                    ? `#${demandContext.globalRank} of ${demandContext.globalRatedCount}`
                    : "Unrated"
                }
              />
              <DemandMetric label="Demand tier" value={demandLabel(demand)} />
            </div>

            {demand !== null && demandContext.categoryAverage !== null ? (
              <p className="rounded-2xl border border-white/[0.055] bg-white/[0.02] px-4 py-3 text-xs font-semibold leading-5 text-zinc-500">
                <strong className="text-zinc-300">Category position:</strong>{" "}
                {Math.abs(demand - demandContext.categoryAverage) < 0.05
                  ? `About equal to the ${item.CATEGORY ?? "category"} average.`
                  : demand > demandContext.categoryAverage
                    ? `${(demand - demandContext.categoryAverage).toFixed(1)} demand points above the ${item.CATEGORY ?? "category"} average.`
                    : `${(demandContext.categoryAverage - demand).toFixed(1)} demand points below the ${item.CATEGORY ?? "category"} average.`}
              </p>
            ) : null}

            <Link
              href={demandMarketHref}
              className="flex min-h-11 items-center justify-center rounded-2xl border border-red-400/15 bg-red-500/[0.055] px-4 text-xs font-black text-red-200 transition hover:bg-red-500/[0.09]"
            >
              Compare in Demand Intelligence →
            </Link>
          </InfoSection>

          <InfoSection title="Weapon information" eyebrow="Profile">
            <InfoRow label="Name" value={item.NAME} />
            <InfoRow label="Category / rarity" value={item.CATEGORY || "Unknown"} />
            <InfoRow label="Source" value={source} />
          </InfoSection>
        </div>

        {/* No fake history: explicit availability state instead */}
        <section className="mt-8 rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
            Value history
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-[-.03em] text-white">
                Historical tracking
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                Historical MM2 value points are not stored in the current dataset, so CSBT does not fabricate a trend line for this weapon.
              </p>
            </div>
            <span className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-zinc-500">
              No history available
            </span>
          </div>
        </section>

        <MM2RelatedWeapons weapons={relatedWeapons} />

        <div className="mt-7 rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-xs leading-6 text-zinc-500">
          Values can change as the source dataset is refreshed. Use this page as a current reference and verify the latest trade context before finalizing a trade.
        </div>

        <div className="mt-7 flex flex-wrap gap-3 border-t border-white/[0.06] pt-6">
          <Link
            href={calculatorHref}
            className="inline-flex min-h-12 items-center rounded-[13px] border border-[var(--mm2-edge-lit)] bg-[linear-gradient(135deg,rgba(143,18,36,.92),rgba(194,37,57,.78))] px-5 text-[13px] font-black text-[#fff4f5] transition hover:brightness-115"
          >
            + Add to Calculator
          </Link>
          <Link
            href={demandMarketHref}
            className="inline-flex min-h-11 items-center rounded-2xl border border-red-400/15 bg-red-500/[0.045] px-5 text-xs font-black text-red-200 transition hover:bg-red-500/[0.08]"
          >
            View Demand Market
          </Link>
          <Link
            href="/mm2/values"
            className="inline-flex min-h-11 items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 text-xs font-black text-zinc-200 transition hover:bg-white/[0.06]"
          >
            Search another weapon
          </Link>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-5">
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-[-.04em] text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-600">{note}</p>
    </div>
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3.5">
      <p className="text-[9px] font-black uppercase tracking-[.12em] text-zinc-600">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-zinc-200">{value}</p>
    </div>
  );
}

function DemandMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3.5">
      <p className="text-[8px] font-black uppercase tracking-[.11em] text-zinc-700">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-zinc-200">{value}</p>
    </div>
  );
}

function InfoSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[.16em] text-red-300">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-3">
      <span className="text-sm font-semibold text-zinc-500">{label}</span>
      <strong className="text-sm font-black text-zinc-200">{value}</strong>
    </div>
  );
}
