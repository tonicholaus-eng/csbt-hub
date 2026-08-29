"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { getItemById, searchCatalogTypeahead } from "../../../lib/search";
import { describeRecognitionCounts, type NichTradeSession, type NichTradeSlot } from "../../../lib/nich/tradeSession";

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
  // Only a CATALOG name is ever displayed. A model-only rawName is never shown
  // as an identity — but a resolved catalog entry that merely failed to
  // auto-confirm IS shown, marked tentative, because failing to auto-confirm is
  // not the same as failing to identify.
  const currentName = slot.canonicalName ?? "";
  const currentNameKey = normalizedItemName(currentName);
  const unknownLabel = String(slot.category ?? "").toUpperCase() === "PET" ? "Unknown pet" : "Unknown item";
  const displayState: "recognized" | "tentative" | "unknown" = slot.status === "CONFIRMED"
    ? "recognized"
    : currentName
      ? "tentative"
      : "unknown";
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentName);

  const candidates = slot.alternatives
    .filter((candidate) => candidate.itemId !== slot.canonicalItemId && normalizedItemName(candidate.itemName) !== currentNameKey)
    .slice(0, compact ? 3 : 4);

  const liveSearchResults = useMemo(() => {
    const query = editValue.trim();
    if (!query) return [];

    // Prefix and token matches from the real CSBT catalog come first, so typing
    // "fro" lists Frost Dragon / Frost Fury before any fuzzy neighbour.
    const pets = searchCatalogTypeahead(query, { limit: 12, category: "PET" });
    const all = searchCatalogTypeahead(query, { limit: 12 });
    const merged = [...pets, ...all.filter((candidate) => !pets.some((pet) => pet.ID === candidate.ID))];

    return merged
      .filter((candidate) => normalizedItemName(candidate.NAME) !== currentNameKey)
      .slice(0, compact ? 5 : 7);
  }, [compact, currentNameKey, editValue]);

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
            <button
              type="button"
              onClick={() => {
                setEditValue(currentName);
                setEditing(true);
              }}
              className={`${compact ? "text-[11px]" : "text-xs"} min-w-0 break-words text-left font-black leading-tight text-[var(--foreground)] underline-offset-2 transition hover:text-[color-mix(in_srgb,var(--foreground)_80%,var(--purple))] hover:underline`}
              aria-label={`Edit ${currentName || "unknown item"} in ${sideText} slot ${slot.gridPosition}`}
              title="Click to correct this item"
            >
              {displayState === "tentative" ? `${currentName} (?)` : currentName || unknownLabel}
            </button>
            <span className="shrink-0 rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[8px] font-black text-[var(--foreground-muted)]">
              {variantLabel(slot)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[8px] font-bold leading-tight text-[var(--foreground-muted)]">
            <span>Slot {slot.gridPosition}</span>
            <span aria-hidden="true">•</span>
            <span>
              {displayState === "recognized"
                ? (slot.correctedByUser ? "Correction applied" : "Recognized")
                : displayState === "tentative"
                  ? "Needs confirmation"
                  : candidates.length
                    ? "Choose the right pet"
                    : "Needs confirmation"}
            </span>
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
            onClick={() => {
              setEditValue(currentName);
              setEditing((value) => !value);
            }}
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
        <div className="relative mt-2">
          <div className={`${compact ? "grid grid-cols-1 gap-1.5" : "flex gap-1.5"}`}>
            <div className="relative min-w-0 flex-1">
              <input
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (liveSearchResults[0]) {
                      setEditValue(liveSearchResults[0].NAME);
                      onCommand(`${sideText} slot ${slot.gridPosition} is ${liveSearchResults[0].NAME}`);
                      setEditing(false);
                    } else {
                      submitEdit();
                    }
                  }
                  if (event.key === "Escape") setEditing(false);
                }}
                placeholder="Search Adopt Me pets…"
                className="min-h-10 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-[11px] font-bold text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--purple)_28%,transparent)]"
                autoFocus
                autoComplete="off"
              />

              {editValue.trim() && liveSearchResults.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_98%,black)] p-1.5 shadow-[0_18px_44px_rgba(0,0,0,.45)]"
                  role="listbox"
                  aria-label={`Catalog suggestions for ${editValue}`}
                >
                  {liveSearchResults.map((candidate) => (
                    <button
                      key={candidate.ID}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setEditValue(candidate.NAME);
                        onCommand(`${sideText} slot ${slot.gridPosition} is ${candidate.NAME}`);
                        setEditing(false);
                      }}
                      className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--purple)_32%,transparent)]"
                    >
                      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-3)]">
                        {candidate.IMAGE ? (
                          <Image
                            src={candidate.IMAGE}
                            alt=""
                            width={30}
                            height={30}
                            unoptimized
                            className="h-7 w-7 object-contain"
                          />
                        ) : (
                          <span aria-hidden="true" className="text-xs">?</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-black text-[var(--foreground)]">
                          {candidate.NAME}
                        </span>
                        <span className="block truncate text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                          {String(candidate.CATEGORY)}
                          {candidate.RARITY ? ` · ${candidate.RARITY}` : ""}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                disabled={!editValue.trim()}
                className="min-h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-3)] px-3 text-[9px] font-black text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>

          {editValue.trim() && liveSearchResults.length === 0 && (
            <div className="mt-1.5 text-[8px] font-bold text-[var(--foreground-muted)]">
              No CSBT catalog matches yet. Keep typing the exact name.
            </div>
          )}
        </div>
      )}

      {!editing && candidates.length > 0 && (
        <div className="mt-2" aria-label={`Possible catalog matches for ${sideText} slot ${slot.gridPosition}`}>
          {unresolved && (
            <div className="mb-1 text-[8px] font-black uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
              Possible matches
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((candidate) => {
              const candidateItem = getItemById(candidate.itemId);
              return (
                <button
                  key={`${slot.slotId}-${candidate.itemId}`}
                  type="button"
                  onClick={() => onCommand(`${sideText} slot ${slot.gridPosition} is ${candidate.itemName}`)}
                  className="flex min-h-8 max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-1.5 py-1 text-left text-[9px] font-black leading-tight text-[var(--foreground)] transition hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--purple)_20%,transparent)]"
                >
                  {candidateItem?.IMAGE && (
                    <Image
                      src={candidateItem.IMAGE}
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                      className="h-5 w-5 shrink-0 object-contain"
                    />
                  )}
                  <span className="min-w-0 truncate">{candidate.itemName}</span>
                  {candidateItem?.RARITY && (
                    <span className="shrink-0 text-[7px] font-bold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                      {candidateItem.RARITY}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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
  // ONE canonical count for the whole card. The header and both columns are
  // derived from it, so the card can never claim "No items detected" while it is
  // rendering slot rows.
  const counts = describeRecognitionCounts(session);

  return (
    <section className={`mb-2 w-full min-w-0 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_90%,transparent)] shadow-[0_14px_36px_rgba(0,0,0,.18)] backdrop-blur-xl ${compact ? "p-2.5" : "p-3"}`} aria-label="Recognized trade">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black tracking-[0.16em] text-[var(--foreground-muted)]">TRADE REVIEW</div>
          <div className="mt-0.5 text-xs font-black text-[var(--foreground)]">
            {counts.headline}
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
            {!session.userSide.length && <div className="text-xs text-[var(--foreground-muted)]">{counts.emptySideLabel}</div>}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] font-black tracking-[0.14em] text-[var(--foreground-muted)]">THEM</div>
          <div className="space-y-1.5">
            {session.theirSide.map((slot) => <SlotRow key={slot.slotId} slot={slot} onCommand={onCommand} compact={compact} />)}
            {!session.theirSide.length && <div className="text-xs text-[var(--foreground-muted)]">{counts.emptySideLabel}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
