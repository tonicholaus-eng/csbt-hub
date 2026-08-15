"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ItemSearchPicker from "../items/ItemSearchPicker";
import type { PotionValueStatus, TradeItem, ValueSource, ValueType } from "../trade/types";
import { useAuthSession } from "../../hooks/useAuthSession";
import { getItemById } from "../../lib/search";
import { getItemCategoryDetails } from "../../lib/itemCategory";
import {
  formatTradeValue,
  getAvailablePotionStatuses,
  getInventoryItemValue,
  hasItemValue,
  parseTradeValue,
} from "../../lib/valueSystem";

type InventoryPotion = "BASE" | PotionValueStatus;

type InventoryEntry = {
  key: string;
  itemId: string;
  valueType: ValueType;
  potionStatus: InventoryPotion;
  quantity: number;
};

type InventoryDbRow = {
  id: string;
  item_id: string;
  value_type: ValueType;
  potion_status: InventoryPotion;
  quantity: number;
};

const POTION_LABELS: Record<InventoryPotion, string> = {
  BASE: "General value",
  NO_POTION: "No Potion",
  RIDE: "Ride",
  FLY: "Fly",
  FLY_RIDE: "Fly + Ride",
};

const LOCAL_KEY = "csbt_inventory_guest_v1";

function makeKey(itemId: string, valueType: ValueType, potionStatus: InventoryPotion) {
  return `${itemId}:${valueType}:${potionStatus}`;
}

function safeQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(999, Math.round(value)));
}

export default function InventoryCalculator() {
  const { supabase, user, loading: authLoading } = useAuthSession();
  const searchParams = useSearchParams();
  const [source, setSource] = useState<ValueSource>("GCASH");
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const queryHandled = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    let active = true;

    void (async () => {
      setLoaded(false);
      setError(null);
      setMigrationMissing(false);

      if (supabase && user) {
        const { data, error: loadError } = await supabase
          .from("inventory_items")
          .select("id,item_id,value_type,potion_status,quantity")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (!active) return;
        if (loadError) {
          setMigrationMissing(/relation|schema|does not exist/i.test(loadError.message));
          setError(loadError.message);
          setEntries([]);
        } else {
          const rows = (data ?? []) as InventoryDbRow[];
          setEntries(
            rows
              .filter((row) => Boolean(getItemById(row.item_id)))
              .map((row) => ({
                key: row.id,
                itemId: row.item_id,
                valueType: row.value_type,
                potionStatus: row.potion_status ?? "BASE",
                quantity: safeQuantity(Number(row.quantity)),
              })),
          );
        }
      } else {
        try {
          const saved = window.localStorage.getItem(LOCAL_KEY);
          const parsed = saved ? (JSON.parse(saved) as InventoryEntry[]) : [];
          setEntries(
            Array.isArray(parsed)
              ? parsed.filter((entry) => Boolean(getItemById(entry.itemId))).map((entry) => ({
                  ...entry,
                  key: entry.key || crypto.randomUUID(),
                  quantity: safeQuantity(entry.quantity),
                  potionStatus: entry.potionStatus ?? "BASE",
                }))
              : [],
          );
        } catch {
          setEntries([]);
        }
      }

      setDirty(false);
      setLoaded(true);
    })();

    return () => { active = false; };
  }, [authLoading, supabase, user]);

  useEffect(() => {
    if (!loaded || user || !entries) return;
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  }, [entries, loaded, user]);

  function addItem(item: TradeItem) {
    const valueType: ValueType = hasItemValue(item, source, "NORMAL")
      ? "NORMAL"
      : hasItemValue(item, source, "NEON")
        ? "NEON"
        : hasItemValue(item, source, "MEGA")
          ? "MEGA"
          : "NORMAL";
    const potionStatus: InventoryPotion = "BASE";
    const identity = makeKey(item.ID, valueType, potionStatus);

    setEntries((current) => {
      const existingIndex = current.findIndex(
        (entry) => makeKey(entry.itemId, entry.valueType, entry.potionStatus) === identity,
      );
      if (existingIndex === -1) {
        return [
          ...current,
          { key: crypto.randomUUID(), itemId: item.ID, valueType, potionStatus, quantity: 1 },
        ];
      }
      return current.map((entry, index) =>
        index === existingIndex ? { ...entry, quantity: safeQuantity(entry.quantity + 1) } : entry,
      );
    });
    setDirty(true);
    setNotice(`${item.NAME} added to your inventory.`);
    setError(null);
  }

  useEffect(() => {
    if (!loaded || queryHandled.current) return;
    const itemId = searchParams.get("add");
    if (!itemId) return;
    const item = getItemById(itemId);
    queryHandled.current = true;
    if (!item) return;
    const requestedSource: ValueSource = searchParams.get("source") === "ELVE" ? "ELVE" : "GCASH";
    queueMicrotask(() => setSource(requestedSource));
    const valueType: ValueType = hasItemValue(item, requestedSource, "NORMAL") ? "NORMAL" : hasItemValue(item, requestedSource, "NEON") ? "NEON" : hasItemValue(item, requestedSource, "MEGA") ? "MEGA" : "NORMAL";
    const identity = makeKey(item.ID, valueType, "BASE");
    queueMicrotask(() => setEntries((current) => {
      const existingIndex = current.findIndex((entry) => makeKey(entry.itemId, entry.valueType, entry.potionStatus) === identity);
      if (existingIndex === -1) return [...current, { key: crypto.randomUUID(), itemId: item.ID, valueType, potionStatus: "BASE", quantity: 1 }];
      return current.map((entry, index) => index === existingIndex ? { ...entry, quantity: safeQuantity(entry.quantity + 1) } : entry);
    }));
    queueMicrotask(() => setDirty(true));
    queueMicrotask(() => setNotice(`${item.NAME} added to your inventory.`));
  }, [loaded, searchParams]);

  function updateEntry(key: string, patch: Partial<InventoryEntry>) {
    setEntries((current) => current.map((entry) => entry.key === key ? { ...entry, ...patch } : entry));
    setDirty(true);
    setNotice(null);
  }

  function removeEntry(key: string) {
    setEntries((current) => current.filter((entry) => entry.key !== key));
    setDirty(true);
  }

  const calculatedEntries = useMemo(() => {
    return entries
      .map((entry) => {
        const item = getItemById(entry.itemId);
        if (!item) return null;
        const unitValue = parseTradeValue(
          getInventoryItemValue(item, source, entry.valueType, entry.potionStatus),
        );
        return {
          ...entry,
          item,
          unitValue,
          totalValue: unitValue === null ? null : unitValue * entry.quantity,
        };
      })
      .filter(Boolean) as Array<InventoryEntry & { item: TradeItem; unitValue: number | null; totalValue: number | null }>;
  }, [entries, source]);

  const stats = useMemo(() => {
    let total = 0;
    let units = 0;
    const breakdown = new Map<string, number>();
    let highest: (typeof calculatedEntries)[number] | null = null;

    for (const entry of calculatedEntries) {
      units += entry.quantity;
      if (entry.totalValue !== null) {
        total += entry.totalValue;
        breakdown.set(entry.item.CATEGORY, (breakdown.get(entry.item.CATEGORY) ?? 0) + entry.totalValue);
        if (!highest || entry.totalValue > (highest.totalValue ?? -Infinity)) highest = entry;
      }
    }

    const topEntries = calculatedEntries
      .filter((entry) => entry.totalValue !== null)
      .sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0))
      .slice(0, 5);

    return { total, units, breakdown, highest, topEntries };
  }, [calculatedEntries]);

  async function saveInventory() {
    if (!supabase || !user) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    const merged = new Map<string, (typeof calculatedEntries)[number]>();
    for (const entry of calculatedEntries) {
      const identity = makeKey(entry.item.ID, entry.valueType, entry.potionStatus);
      const previous = merged.get(identity);
      merged.set(
        identity,
        previous
          ? { ...entry, quantity: safeQuantity(previous.quantity + entry.quantity) }
          : entry,
      );
    }

    const rows = Array.from(merged.values()).map((entry) => ({
      user_id: user.id,
      item_id: entry.item.ID,
      item_name: entry.item.NAME,
      image_url: entry.item.IMAGE || null,
      category: entry.item.CATEGORY,
      value_type: entry.valueType,
      potion_status: entry.potionStatus,
      quantity: entry.quantity,
    }));

    // Save current entries first so a later cleanup failure cannot wipe the member's inventory.
    if (rows.length) {
      const { error: upsertError } = await supabase
        .from("inventory_items")
        .upsert(rows, { onConflict: "user_id,item_id,value_type,potion_status" });

      if (upsertError) {
        setSaving(false);
        setMigrationMissing(/relation|schema|does not exist/i.test(upsertError.message));
        setError(upsertError.message);
        return;
      }
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("inventory_items")
      .select("id,item_id,value_type,potion_status")
      .eq("user_id", user.id);

    if (existingError) {
      setSaving(false);
      setMigrationMissing(/relation|schema|does not exist/i.test(existingError.message));
      setError(existingError.message);
      return;
    }

    const keep = new Set(rows.map((row) => makeKey(row.item_id, row.value_type, row.potion_status)));
    const staleIds = (existingRows ?? [])
      .filter((row) => !keep.has(makeKey(String(row.item_id), row.value_type as ValueType, (row.potion_status ?? "BASE") as InventoryPotion)))
      .map((row) => String(row.id));

    if (staleIds.length) {
      const { error: deleteError } = await supabase
        .from("inventory_items")
        .delete()
        .in("id", staleIds);

      if (deleteError) {
        setSaving(false);
        setError(deleteError.message);
        return;
      }
    }

    setDirty(false);
    setNotice("Inventory saved to your CSBT profile.");
    setSaving(false);
  }

  if (!loaded || authLoading) {
    return <div className="h-72 animate-pulse rounded-[30px] bg-white/60 dark:bg-white/5" />;
  }

  return (
    <div className="space-y-6">
      {migrationMissing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          Run <code>src/lib/supabase/phase-two.sql</code> in Supabase to enable saved inventories. You can still try the calculator locally for now.
        </div>
      )}

      <section className="rounded-[28px] border border-white/65 bg-white/75 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.17em] text-amber-600 dark:text-amber-300">Add items</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Build your inventory</h2>
            <div className="mt-4 max-w-2xl">
              <ItemSearchPicker onSelect={addItem} valueSource={source} placeholder="Search pets, vehicles, food, stickers, toys…" />
            </div>
          </div>

          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
            {(["GCASH", "ELVE"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSource(option)}
                className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${source === option ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
              >
                {option === "GCASH" ? "💸 GCash" : "🦈 Elve Shark"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Inventory value" value={`${source === "GCASH" ? "₱" : "🦈 "}${formatTradeValue(stats.total)}`} />
        <Stat label="Different entries" value={calculatedEntries.length.toLocaleString()} />
        <Stat label="Total item units" value={stats.units.toLocaleString()} />
        <Stat label="Highest stack" value={stats.highest ? stats.highest.item.NAME : "—"} small />
      </section>

      <section className="rounded-[28px] border border-white/65 bg-white/75 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.17em] text-cyan-600 dark:text-cyan-300">Inventory</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{calculatedEntries.length ? `${calculatedEntries.length} saved entries` : "Nothing added yet"}</h2>
          </div>
          {user ? (
            <button
              type="button"
              disabled={saving || (!dirty && !migrationMissing)}
              onClick={() => void saveInventory()}
              className="min-h-11 rounded-2xl csbt-theme-primary px-5 text-sm font-black text-slate-950 disabled:opacity-40"
            >
              {saving ? "Saving…" : dirty ? "Save inventory" : "✓ Saved"}
            </button>
          ) : (
            <Link href="/profile" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">Sign in to save →</Link>
          )}
        </div>

        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {notice && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}

        {calculatedEntries.length ? (
          <div className="mt-5 space-y-3">
            {calculatedEntries.map((entry) => {
              const category = getItemCategoryDetails(entry.item.CATEGORY);
              const valueTypes: ValueType[] = category.regularOnly ? ["NORMAL"] : ["NORMAL", "NEON", "MEGA"];
              const potionStatuses = getAvailablePotionStatuses(entry.item, source, entry.valueType);
              return (
                <article key={entry.key} className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.03] md:grid-cols-[minmax(220px,1.5fr)_120px_150px_110px_130px_42px] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-2xl dark:bg-white/5">
                      {entry.item.IMAGE ? <Image src={entry.item.IMAGE} alt="" width={56} height={56} unoptimized className="h-12 w-12 object-contain" /> : category.icon}
                    </span>
                    <span className="min-w-0">
                      <Link href={`/values/${encodeURIComponent(entry.item.ID)}`} className="block truncate text-sm font-black text-slate-900 hover:text-amber-600 dark:text-white">{entry.item.NAME}</Link>
                      <span className="text-[10px] font-bold text-slate-400">{category.label}{entry.item.RARITY ? ` • ${entry.item.RARITY}` : ""}</span>
                    </span>
                  </div>

                  <select value={entry.valueType} onChange={(event) => updateEntry(entry.key, { valueType: event.target.value as ValueType, potionStatus: "BASE" })} className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black dark:border-white/10 dark:bg-slate-900">
                    {valueTypes.map((type) => <option key={type} value={type}>{type === "NORMAL" ? "Regular" : type === "NEON" ? "Neon" : "Mega"}</option>)}
                  </select>

                  {potionStatuses.length ? (
                    <select value={entry.potionStatus} onChange={(event) => updateEntry(entry.key, { potionStatus: event.target.value as InventoryPotion })} className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black dark:border-white/10 dark:bg-slate-900">
                      <option value="BASE">General value</option>
                      {potionStatuses.map((status) => <option key={status} value={status}>{POTION_LABELS[status]}</option>)}
                    </select>
                  ) : <span className="hidden text-xs font-bold text-slate-400 md:block">General value</span>}

                  <input type="number" min={1} max={999} value={entry.quantity} onChange={(event) => updateEntry(entry.key, { quantity: safeQuantity(Number(event.target.value)) })} aria-label={`Quantity for ${entry.item.NAME}`} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-center text-xs font-black dark:border-white/10 dark:bg-slate-900" />

                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Stack value</p>
                    <p className="mt-1 text-sm font-black tabular-nums text-slate-950 dark:text-white">{entry.totalValue === null ? "N/A" : `${source === "GCASH" ? "₱" : ""}${formatTradeValue(entry.totalValue)}`}</p>
                  </div>

                  <button type="button" onClick={() => removeEntry(entry.key)} aria-label={`Remove ${entry.item.NAME}`} className="h-10 w-10 rounded-xl bg-rose-50 text-sm font-black text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">×</button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/10">
            <p className="text-4xl">🎒</p>
            <p className="mt-3 font-black text-slate-800 dark:text-white">Search an item above to start.</p>
            <p className="mt-1 text-xs text-slate-400">Your totals always use the newest values in the CSBT master database.</p>
          </div>
        )}
      </section>

      {stats.breakdown.size > 0 && (
        <section className="rounded-[28px] border border-white/65 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65">
          <p className="text-xs font-black uppercase tracking-[0.17em] text-violet-600 dark:text-violet-300">Value breakdown</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(stats.breakdown.entries()).sort((a, b) => b[1] - a[1]).map(([category, value]) => {
              const details = getItemCategoryDetails(category);
              const percent = stats.total > 0 ? (value / stats.total) * 100 : 0;
              return (
                <div key={category} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-2"><span className="font-black text-slate-800 dark:text-white">{details.icon} {details.pluralLabel}</span><span className="text-xs font-black text-slate-400">{percent.toFixed(0)}%</span></div>
                  <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{source === "GCASH" ? "₱" : "🦈 "}{formatTradeValue(value)}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {stats.topEntries.length > 0 && (
        <section className="rounded-[28px] border border-white/65 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/65">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.17em] text-emerald-600 dark:text-emerald-300">Highest-value items</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Your top stacks</h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Top {stats.topEntries.length}</span>
          </div>
          <div className="mt-4 grid gap-2">
            {stats.topEntries.map((entry, index) => {
              const details = getItemCategoryDetails(entry.item.CATEGORY);
              return (
                <Link key={entry.key} href={`/values/${encodeURIComponent(entry.item.ID)}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-amber-50 dark:bg-white/5 dark:hover:bg-amber-400/10">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black shadow-sm dark:bg-slate-900">{index + 1}</span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xl dark:bg-slate-900">
                    {entry.item.IMAGE ? <Image src={entry.item.IMAGE} alt="" width={44} height={44} unoptimized className="h-10 w-10 object-contain" /> : details.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{entry.item.NAME}</span>
                    <span className="block text-[10px] font-bold text-slate-400">{entry.quantity}× {entry.valueType === "NORMAL" ? "Regular" : entry.valueType === "NEON" ? "Neon" : "Mega"}</span>
                  </span>
                  <span className="shrink-0 text-sm font-black tabular-nums text-slate-950 dark:text-white">{source === "GCASH" ? "₱" : "🦈 "}{formatTradeValue(entry.totalValue ?? 0)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-[24px] border border-white/65 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-2 font-black text-slate-950 dark:text-white ${small ? "truncate text-lg" : "text-2xl sm:text-3xl"}`}>{value}</p>
    </div>
  );
}
