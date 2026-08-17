"use client";

import Image from "next/image";
import { useState } from "react";

import { getItemById } from "../../../lib/search";
import type { NichTradeSession, NichTradeSlot } from "../../../lib/nich/tradeSession";

function variantLabel(slot: NichTradeSlot) {
  if (slot.mega) return `M${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  if (slot.neon) return `N${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  if (slot.fly || slot.ride) return `${slot.fly ? "F" : ""}${slot.ride ? "R" : ""}`;
  if (slot.fly === false && slot.ride === false && slot.neon === false && slot.mega === false) return "NP";
  return "?";
}

function normalizedItemName(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function SlotRow({
  slot,
  onCommand,
  compact,
}: {
  slot: NichTradeSlot;
  onCommand: (command: string) => void;
  compact: boolean;
}) {
  const item = slot.canonicalItemId ? getItemById(slot.canonicalItemId) : undefined;
  const image = item?.IMAGE;
  const unresolved = slot.status !== "CONFIRMED";
  const sideText = slot.side === "YOU" ? "my" : "their";
  const currentName = slot.canonicalName ?? slot.rawName ?? "";
  const currentNameKey = normalizedItemName(currentName);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentName);

  const candidates = slot.alternatives
    .filter((candidate) => candidate.itemId !== slot.canonicalItemId && normalizedItemName(candidate.itemName) !== currentNameKey)
    .slice(0, compact ? 3 : 4);

  const submitEdit = () => {
    const value = editValue.trim();
    if (!value) return;
    onCommand(`${sideText} slot ${slot.gridPosition} is ${value}`);
    setEditing(false);
  };

  const confirmCurrent = () => {
    if (!currentName) {
      setEditing(true);
      return;
    }
    onCommand(`${sideText} slot ${slot.gridPosition} is ${currentName}`);
  };

  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--surface-2)_84%,transparent)] p-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-3)] ${compact ? "h-10 w-10" : "h-11 w-11"}`}>
          {image ? (
            <Image
              src={image}
              alt={currentName || "Trade item"}
              width={44}
              height={44}
              unoptimized
              className={compact ? "h-9 w-9 object-contain" : "h-10 w-10 object-contain"}
            />
          ) : (
            <span aria-hidden="true" className="text-lg">?</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className={`${compact ? "text-[11px]" : "text-xs"} min-w-0 break-words font-black leading-tight text-[var(--foreground)]`}>
              {currentName || "Unknown item"}
            </span>
            <span className="shrink-0 rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[8px] font-black text-[var(--foreground-muted)]">
              {variantLabel(slot)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[8px] font-bold leading-tight text-[var(--foreground-muted)]">
            <span>Slot {slot.gridPosition}</span>
            <span aria-hidden="true">•</span>
            <span>{unresolved ? "Needs confirmation" : slot.correctedByUser ? "Correction applied" : "Recognized"}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {unresolved && currentName && (
            <button
              type="button"
              onClick={confirmCurrent}
              className="min-h-8 rounded-lg border border-[color-mix(in_srgb,var(--purple)_35%,var(--border))] bg-[color-mix(in_srgb,var(--purple)_12%,var(--surface-1))] px-2 text-[8px] font-black text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--purple)_20%,var(--surface-1))]"
              aria-label={`Confirm ${currentName}`}
            >
              Confirm
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="min-h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 text-[8px] font-black text-[var(--foreground-muted)] transition hover:bg-[var(--surface-3)]"
            aria-label={`Edit ${sideText} slot ${slot.gridPosition}`}
          >
            Edit
          </button>
          <span
            className="w-3 shrink-0 text-center text-[11px]"
            aria-label={unresolved ? "Uncertain recognition" : "Confirmed recognition"}
            title={unresolved ? "Uncertain recognition" : "Confirmed recognition"}
          >
            {unresolved ? "?" : "✓"}
          </span>
        </div>
      </div>

      {editing && (
        <div className={`${compact ? "mt-2 grid grid-cols-1 gap-1.5" : "mt-2 flex gap-1.5"}`}>
          <input
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitEdit();
              if (event.key === "Escape") setEditing(false);
            }}
            placeholder="Exact pet/item name"
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-[11px] font-bold text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--purple)_28%,transparent)]"
            autoFocus
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-[9px] font-black text-[var(--foreground-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitEdit}
              className="min-h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] px-3 text-[9px] font-black text-[var(--foreground)]"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`Alternatives for ${sideText} slot ${slot.gridPosition}`}>
          {candidates.map((candidate) => (
            <button
              key={`${slot.slotId}-${candidate.itemId}`}
              type="button"
              onClick={() => onCommand(`${sideText} slot ${slot.gridPosition} is ${candidate.itemName}`)}
              className="min-h-8 max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-left text-[9px] font-black leading-tight text-[var(--foreground)] transition hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--purple)_20%,transparent)]"
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
  compact = false,
}: {
  session: NichTradeSession;
  onCommand: (command: string) => void;
  compact?: boolean;
}) {
  const unresolvedCount = session.unresolvedSlots.length;

  return (
    <section className={`mb-2 w-full min-w-0 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_90%,transparent)] shadow-[0_14px_36px_rgba(0,0,0,.18)] backdrop-blur-xl ${compact ? "p-2.5" : "p-3"}`} aria-label="Recognized trade">
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

      <div className={`grid min-w-0 gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] font-black tracking-[0.14em] text-[var(--foreground-muted)]">YOU</div>
          <div className="space-y-1.5">
            {session.userSide.map((slot) => <SlotRow key={slot.slotId} slot={slot} onCommand={onCommand} compact={compact} />)}
            {!session.userSide.length && <div className="text-xs text-[var(--foreground-muted)]">No items detected.</div>}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] font-black tracking-[0.14em] text-[var(--foreground-muted)]">THEM</div>
          <div className="space-y-1.5">
            {session.theirSide.map((slot) => <SlotRow key={slot.slotId} slot={slot} onCommand={onCommand} compact={compact} />)}
            {!session.theirSide.length && <div className="text-xs text-[var(--foreground-muted)]">No items detected.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
