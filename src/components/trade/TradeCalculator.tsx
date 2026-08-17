"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

import AddPetModal from "./AddPetModal";
import TradeSide from "./TradeSide";
import TradeSummary from "./TradeSummary";
import SaveTradeButton from "./SaveTradeButton";
import {
  SelectedTradeItem,
  TradeItem,
  ValueSource,
  ValueType,
} from "./types";
import { getItemValue, parseTradeValue } from "../../lib/valueSystem";
import { getItemById } from "../../lib/search";
import { buildTradeContextParams, decodeTradeRows, selectedItemsToRows } from "../../lib/tradeContext";

type TradeSideType = "your" | "their";

const valueOptions: {
  value: ValueType;
  label: string;
}[] = [
  {
    value: "NORMAL",
    label: "🟡 Normal Default",
  },
  {
    value: "NEON",
    label: "🔷 Neon Default",
  },
  {
    value: "MEGA",
    label: "🌈 Mega Default",
  },
];

function parseItemValue(
  item: TradeItem,
  valueType: ValueType,
  valueSource: ValueSource,
) {
  return parseTradeValue(
    getItemValue(item, valueSource, valueType),
  ) ?? 0;
}

function hasItemValue(
  item: TradeItem,
  valueType: ValueType,
  valueSource: ValueSource,
) {
  return parseItemValue(item, valueType, valueSource) > 0;
}

function getStartingValueType(
  item: TradeItem,
  preferredValueType: ValueType,
  valueSource: ValueSource,
): ValueType {
  if (hasItemValue(item, preferredValueType, valueSource)) {
    return preferredValueType;
  }

  const valueTypes: ValueType[] = ["NORMAL", "NEON", "MEGA"];
  return valueTypes.find((valueType) => hasItemValue(item, valueType, valueSource)) ?? preferredValueType;
}

function createSelectedItem(
  item: TradeItem,
  defaultValueType: ValueType,
  valueSource: ValueSource,
): SelectedTradeItem {
  return {
    id: crypto.randomUUID(),
    item,
    valueType: getStartingValueType(item, defaultValueType, valueSource),
  };
}

export default function TradeCalculator() {
  const shouldReduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const initialItemHandled = useRef(false);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [activeSide, setActiveSide] =
    useState<TradeSideType>("your");

  const [
    defaultValueType,
    setDefaultValueType,
  ] = useState<ValueType>(
    "NORMAL",
  );

  const [valueSource, setValueSource] =
    useState<ValueSource>("GCASH");

  const [
    yourItems,
    setYourItems,
  ] = useState<
    SelectedTradeItem[]
  >([]);

  const [
    theirItems,
    setTheirItems,
  ] = useState<
    SelectedTradeItem[]
  >([]);

  const yourTotal = useMemo(
    () =>
      yourItems.reduce(
        (
          total,
          selectedItem,
        ) =>
          total +
          parseItemValue(
            selectedItem.item,
            selectedItem.valueType,
            valueSource,
          ),
        0,
      ),
    [yourItems, valueSource],
  );

  const theirTotal = useMemo(
    () =>
      theirItems.reduce(
        (
          total,
          selectedItem,
        ) =>
          total +
          parseItemValue(
            selectedItem.item,
            selectedItem.valueType,
            valueSource,
          ),
        0,
      ),
    [theirItems, valueSource],
  );

  const tradeIsEmpty =
    yourItems.length === 0 &&
    theirItems.length === 0;

  const mobileResult = useMemo(() => {
    const safeYourTotal = Number.isFinite(yourTotal)
      ? Math.max(0, yourTotal)
      : 0;
    const safeTheirTotal = Number.isFinite(theirTotal)
      ? Math.max(0, theirTotal)
      : 0;
    const difference = Math.abs(
      safeTheirTotal - safeYourTotal,
    );
    const baseline = Math.max(
      safeYourTotal,
      safeTheirTotal,
      1,
    );
    const differencePercent =
      (difference / baseline) * 100;
    const formattedDifference =
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(difference);

    if (
      safeYourTotal === 0 &&
      safeTheirTotal === 0
    ) {
      return {
        title: "READY",
        emoji: "🧮",
        message: "Add valued items to compare",
        color:
          "from-slate-600 via-slate-700 to-slate-900",
      };
    }

    if (differencePercent <= 5) {
      return {
        title: "FAIR",
        emoji: "🤝",
        message: `Only ${differencePercent.toFixed(
          1,
        )}% apart`,
        color:
          "from-amber-400 via-orange-500 to-orange-600",
      };
    }

    if (safeTheirTotal > safeYourTotal) {
      return {
        title: "WIN",
        emoji: "🏆",
        message: `You gain ${formattedDifference}`,
        color:
          "from-emerald-500 via-green-600 to-green-700",
      };
    }

    return {
      title: "LOSE",
      emoji: "⚠️",
      message: `You overpay ${formattedDifference}`,
      color:
        "from-rose-500 via-red-600 to-red-700",
    };
  }, [yourTotal, theirTotal]);


  function openAddItemModal(
    side: TradeSideType,
  ) {
    setActiveSide(side);
    setModalOpen(true);
  }

  function addItem(
    item: TradeItem,
  ) {
    const selectedItem =
      createSelectedItem(
        item,
        defaultValueType,
        valueSource,
      );

    if (activeSide === "your") {
      setYourItems(
        (currentItems) => [
          ...currentItems,
          selectedItem,
        ],
      );
    } else {
      setTheirItems(
        (currentItems) => [
          ...currentItems,
          selectedItem,
        ],
      );
    }

    setModalOpen(false);
  }

  function removeYour(
    id: string,
  ) {
    setYourItems(
      (currentItems) =>
        currentItems.filter(
          (
            selectedItem,
          ) =>
            selectedItem.id !==
            id,
        ),
    );
  }

  function removeTheir(
    id: string,
  ) {
    setTheirItems(
      (currentItems) =>
        currentItems.filter(
          (
            selectedItem,
          ) =>
            selectedItem.id !==
            id,
        ),
    );
  }

  function updateYourValueType(
    id: string,
    valueType: ValueType,
  ) {
    setYourItems(
      (currentItems) =>
        currentItems.map(
          (
            selectedItem,
          ) =>
            selectedItem.id === id
              ? {
                  ...selectedItem,
                  valueType,
                }
              : selectedItem,
        ),
    );
  }

  function updateTheirValueType(
    id: string,
    valueType: ValueType,
  ) {
    setTheirItems(
      (currentItems) =>
        currentItems.map(
          (
            selectedItem,
          ) =>
            selectedItem.id === id
              ? {
                  ...selectedItem,
                  valueType,
                }
              : selectedItem,
        ),
    );
  }

  function changeValueSource(nextSource: ValueSource) {
    setValueSource(nextSource);
    const normalizeItems = (items: SelectedTradeItem[]) =>
      items.map((selectedItem) => ({
        ...selectedItem,
        valueType: getStartingValueType(
          selectedItem.item,
          selectedItem.valueType,
          nextSource,
        ),
      }));
    setYourItems(normalizeItems);
    setTheirItems(normalizeItems);
  }

  function swapSides() {
    const previousYourItems =
      yourItems;

    setYourItems(theirItems);
    setTheirItems(
      previousYourItems,
    );
  }

  function clearTrade() {
    setYourItems([]);
    setTheirItems([]);
  }

  useEffect(() => {
    if (initialItemHandled.current) return;
    const requestedSource: ValueSource = searchParams.get("source") === "ELVE" ? "ELVE" : "GCASH";
    const yourContext = decodeTradeRows(searchParams.get("your"));
    const theirContext = decodeTradeRows(searchParams.get("their"));
    const expandRows = (rows: ReturnType<typeof decodeTradeRows>) => rows.flatMap((row) => {
      const item = getItemById(row.itemId);
      if (!item) return [];
      const valueType = getStartingValueType(item, row.valueType, requestedSource);
      return Array.from({ length: row.quantity }, () => ({ id: crypto.randomUUID(), item, valueType }));
    });

    if (yourContext.length || theirContext.length) {
      initialItemHandled.current = true;
      queueMicrotask(() => {
        setValueSource(requestedSource);
        setYourItems(expandRows(yourContext));
        setTheirItems(expandRows(theirContext));
      });
      return;
    }

    const itemId = searchParams.get("add");
    if (!itemId) return;
    const item = getItemById(itemId);
    initialItemHandled.current = true;
    if (!item) return;
    queueMicrotask(() => setValueSource(requestedSource));
    queueMicrotask(() => setYourItems((current) => [...current, createSelectedItem(item, defaultValueType, requestedSource)]));
  }, [defaultValueType, searchParams]);

  return (
    <>
  <motion.section
    id="calculator"
    aria-labelledby="trade-calculator-heading"
    initial={{
      opacity: 0,
      y: shouldReduceMotion ? 0 : 35,
    }}
    whileInView={{
      opacity: 1,
      y: 0,
    }}
    viewport={{
      once: true,
      margin: "-70px",
    }}
    transition={{
      duration: shouldReduceMotion
        ? 0
        : 0.7,
      ease: [0.22, 1, 0.36, 1],
    }}
    className="relative mt-2 overflow-hidden rounded-[24px] border border-white/60 bg-white/75 p-3 shadow-[0_30px_90px_rgba(15,23,42,.14)] backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_30px_100px_rgba(0,0,0,.42)] sm:mt-10 sm:rounded-[40px] sm:p-8 lg:mt-20 lg:p-10"
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,.12),transparent_52%)] dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,.08),transparent_55%)]" />

    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.025)_1px,transparent_1px)] bg-[size:36px_36px] dark:bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)]" />

    <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />

    <div className="pointer-events-none absolute -bottom-32 -right-28 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />

    <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/20" />

    <div className="relative">
      <div className="text-center">
        <motion.span
          whileHover={
            shouldReduceMotion
              ? undefined
              : { scale: 1.05 }
          }
          className="hidden items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/85 px-5 py-2 text-sm font-black text-yellow-700 shadow-sm backdrop-blur dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300 sm:inline-flex"
        >
          <span>🧮</span>
          Trade Calculator
        </motion.span>

        <h2
          id="trade-calculator-heading"
          className="mt-1 text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:mt-6 sm:text-5xl md:text-6xl"
        >
          Calculate Your Trade
        </h2>

        <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:mt-4 sm:text-lg">
          Compare both offers using either GCash or Elve Shark values before accepting a trade.
        </p>
      </div>

      <div className="mx-auto mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:mt-9 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">

        <select
          value={valueSource}
          onChange={(event) =>
            changeValueSource(event.target.value as ValueSource)
          }
          aria-label="Value source"
          className="min-h-11 min-w-0 cursor-pointer rounded-xl border-2 border-cyan-300 bg-white/95 px-2 py-2 text-xs font-bold text-slate-800 shadow-sm outline-none transition duration-200 hover:border-cyan-400 hover:shadow-md focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/25 dark:border-cyan-400/40 dark:bg-slate-950/90 dark:text-slate-100 dark:hover:border-cyan-300/70 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/20 dark:[color-scheme:dark] sm:min-h-14 sm:rounded-2xl sm:px-5 sm:py-3.5 sm:text-base"
        >
          <option
            value="GCASH"
            className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
          >
            💸 GCash Values
          </option>
          <option
            value="ELVE"
            className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
          >
            🦈 Elve Shark Values
          </option>
        </select>

        <select
          value={defaultValueType}
          onChange={(event) =>
            setDefaultValueType(
              event.target.value as ValueType
            )
          }
          aria-label="Default pet variant"
          className="min-h-11 min-w-0 cursor-pointer rounded-xl border-2 border-amber-300 bg-white/95 px-2 py-2 text-xs font-bold text-slate-800 shadow-sm outline-none transition duration-200 hover:border-amber-400 hover:shadow-md focus:border-amber-400 focus:ring-4 focus:ring-amber-300/25 dark:border-amber-400/45 dark:bg-slate-950/90 dark:text-slate-100 dark:hover:border-amber-300/75 dark:focus:border-amber-300 dark:focus:ring-amber-400/20 dark:[color-scheme:dark] sm:min-h-14 sm:rounded-2xl sm:px-5 sm:py-3.5 sm:text-base"
        >
          {valueOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
            >
              {option.label}
            </option>
          ))}
        </select>

        <motion.button
          onClick={swapSides}
          disabled={tradeIsEmpty}
          className="min-h-11 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-2 text-xs font-bold text-white disabled:opacity-40 sm:min-h-14 sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-base"
        >
          🔄 Swap Offers
        </motion.button>

        <motion.button
          onClick={clearTrade}
          disabled={tradeIsEmpty}
          className="min-h-11 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-2 py-2 text-xs font-bold text-white disabled:opacity-40 sm:min-h-14 sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-base"
        >
          🗑 Clear Trade
        </motion.button>

      </div>

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/10 sm:my-9" />

      <div className="grid grid-cols-2 gap-2 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-8">

        <TradeSide
          title="Your Offer"
          color="yellow"
          items={yourItems}
          total={yourTotal}
          onAdd={() =>
            openAddItemModal("your")
          }
          onRemove={removeYour}
          onValueTypeChange={
            updateYourValueType
          }
          valueSource={valueSource}
        />

        <div className="hidden items-center justify-center xl:flex">
          <motion.div
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    scale: [1, 1.06, 1],
                  }
            }
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-3xl font-black text-white"
          >
            VS
          </motion.div>
        </div>

        <TradeSide
          title="Their Offer"
          color="cyan"
          items={theirItems}
          total={theirTotal}
          onAdd={() =>
            openAddItemModal("their")
          }
          onRemove={removeTheir}
          onValueTypeChange={
            updateTheirValueType
          }
          valueSource={valueSource}
        />

      </div>

      <div className="hidden lg:block">
        <TradeSummary
          yourTotal={yourTotal}
          theirTotal={theirTotal}
          valueSource={valueSource}
        />
      </div>

      <SaveTradeButton
        yourItems={yourItems}
        theirItems={theirItems}
        yourTotal={yourTotal}
        theirTotal={theirTotal}
        valueSource={valueSource}
      />

      {!tradeIsEmpty && (() => {
        const context = buildTradeContextParams(selectedItemsToRows(yourItems), selectedItemsToRows(theirItems), valueSource);
        const contextString = context.toString();
        const prompt = [
          "Explain this CSBT Trade Calculator result using the deterministic totals below. Do not invent or recalculate values.",
          `Value source: ${valueSource}. Your total: ${yourTotal}. Their total: ${theirTotal}.`,
          `You give: ${yourItems.map((row) => `${row.valueType} ${row.item.NAME}`).join(", ") || "nothing"}.`,
          `They give: ${theirItems.map((row) => `${row.valueType} ${row.item.NAME}`).join(", ") || "nothing"}.`,
        ].join(" ");
        const opinion = new URLSearchParams(context);
        const exchange = new URLSearchParams(context);
        exchange.set("tab", "browse");
        const target = theirItems[0]?.item.NAME ?? yourItems[0]?.item.NAME;
        if (target) exchange.set("q", target);
        return <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-[var(--brand-primary)]">Next step</p><h3 className="mt-1 text-lg font-black text-[var(--foreground)]">Turn the result into an action.</h3><div className="mt-3 flex flex-wrap gap-2"><Link href={`/nich?prompt=${encodeURIComponent(prompt)}`} className="csbt-btn-secondary min-h-11 px-4 py-2.5 text-xs font-black">Explain with NICH</Link><Link href={`/exchange?${exchange.toString()}`} className="csbt-btn-primary min-h-11 px-4 py-2.5 text-xs font-black">Find Traders</Link><Link href={`/trade-feed?${opinion.toString()}`} className="csbt-btn-secondary min-h-11 px-4 py-2.5 text-xs font-black">Get Opinions</Link><button type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/calculator?${contextString}`)} className="csbt-btn-quiet min-h-11 px-4 py-2.5 text-xs font-black">Copy Trade Link</button></div></div>;
      })()}

    </div>
  </motion.section>

  {!modalOpen && !tradeIsEmpty && (
    <motion.aside
      aria-live="polite"
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-3 mt-4 overflow-hidden rounded-2xl bg-gradient-to-r p-3 text-white shadow-lg lg:hidden ${mobileResult.color}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="text-2xl">{mobileResult.emoji}</span><p className="text-xl font-black">{mobileResult.title}</p></div>
          <p className="mt-0.5 text-xs font-semibold text-white/85">{mobileResult.message}</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-white/15 bg-black/15 p-2 text-center">
          <div className="min-w-14 px-1"><p className="text-[9px] font-black uppercase text-white/70">You</p><p className="text-sm font-black tabular-nums">{yourTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p></div>
          <div className="min-w-14 border-l border-white/15 px-1"><p className="text-[9px] font-black uppercase text-white/70">Them</p><p className="text-sm font-black tabular-nums">{theirTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p></div>
        </div>
      </div>
    </motion.aside>
  )}

  <AddPetModal
    open={modalOpen}
    onClose={() =>
      setModalOpen(false)
    }
    onSelect={addItem}
    valueSource={valueSource}
  />
</>
);
}