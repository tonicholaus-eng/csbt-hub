"use client";

import Image from "next/image";

import { getItemById } from "../../../lib/search";
import type { NichTradeSession, NichTradeSlot } from "../../../lib/nich/tradeSession";

function variantLabel(slot: NichTradeSlot) {
  if (slot.mega) return `M${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  if (slot.neon) return `N${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  if (slot.fly || slot.ride) return `${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  if (slot.fly === false && slot.ride === false && slot.neon === false && slot.mega === false) return "NP";
  return "?";
}

function SlotRow({
  slot,
  onCommand,
}: {
  slot: NichTradeSlot;
  onCommand: (command: string) => void;
}) {
  const item = slot.canonicalItemId ? getItemById(slot.canonicalItemId) : undefined;
  const image = item?.IMAGE;
  const unresolved = slot.status !== "CONFIRMED";
  const sideText = slot.side === "YOU" ? "my" : "their";

  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--surface-2)_84%,transparent)] p-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-3)]">
          {image ? (
            <Image
              src={image}
              alt={slot.canonicalName ?? slot.rawName ?? "Trade item"}
              width={44}
              height={44}
              unoptimized
              className="h-10 w-10 object-contain"
            />
          ) : (
            <span aria-hidden="true" className="text-lg">?</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs font-black text-[var(--foreground)]">
              {slot.canonicalName ?? slot.rawName ?? `Unknown item`}
            </span>
            <span className="shrink-0 rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] font-black text-[var(--foreground-muted)]">
              {variantLabel(slot)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold text-[var(--foreground-muted)]">
            <span>Slot {slot.gridPosition}</span>
            <span aria-hidden="true">•</span>
            <span>{unresolved ? "Needs confirmation" : slot.correctedByUser ? "Correction applied" : "Recognized"}</span>
          </div>
        </div>

        <span
          className="shrink-0 text-xs"
          aria-label={unresolved ? "Uncertain recognition" : "Confirmed recognition"}
          title={unresolved ? "Uncertain recognition" : "Confirmed recognition"}
        >
          {unresolved ? "?" : "✓"}
        </span>
      </div>

      {unresolved && slot.alternatives.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Candidates for ${sideText} slot ${slot.gridPosition}`}>
          {slot.alternatives.slice(0, 4).map((candidate) => (
            <button
              key={`${slot.slotId}-${candidate.itemId}`}
              type="button"
              onClick={() => onCommand(`${slot.side === "YOU" ? "my" : "their"} slot ${slot.gridPosition} is ${candidate.itemName}`)}
              className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-[10px] font-black text-[var(--foreground)] transition hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--purple)_20%,transparent)]"
            >
              {candidate.itemName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NichTradeReviewCard({
  session,
  onCommand,
}: {
  session: NichTradeSession;
  onCommand: (command: string) => void;
}) {
  const unresolvedCount = session.unresolvedSlots.length;

  return (
    <section className="mb-2 w-full rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_90%,transparent)] p-3 shadow-[0_14px_36px_rgba(0,0,0,.18)] backdrop-blur-xl" aria-label="Recognized trade">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black tracking-[0.16em] text-[var(--foreground-muted)]">TRADE REVIEW</div>
          <div className="mt-0.5 text-xs font-black text-[var(--foreground)]">
            {unresolvedCount ? `${unresolvedCount} item${unresolvedCount === 1 ? "" : "s"} need confirmation` : "Recognition confirmed"}
          </div>
        </div>
        <span className="rounded-lg bg-[var(--surface-3)] px-2 py-1 text-[9px] font-black text-[var(--foreground-muted)]">
          {session.valueSystem === "ELVE" ? "ELVE" : "GCASH"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] font-black tracking-[0.14em] text-[var(--foreground-muted)]">YOU</div>
          <div className="space-y-1.5">
            {session.userSide.map((slot) => <SlotRow key={slot.slotId} slot={slot} onCommand={onCommand} />)}
            {!session.userSide.length && <div className="text-xs text-[var(--foreground-muted)]">No items detected.</div>}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] font-black tracking-[0.14em] text-[var(--foreground-muted)]">THEM</div>
          <div className="space-y-1.5">
            {session.theirSide.map((slot) => <SlotRow key={slot.slotId} slot={slot} onCommand={onCommand} />)}
            {!session.theirSide.length && <div className="text-xs text-[var(--foreground-muted)]">No items detected.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
