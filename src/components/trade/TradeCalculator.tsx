"use client";

import { useMemo, useState } from "react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

import AddPetModal from "./AddPetModal";
import TradeSide from "./TradeSide";
import TradeSummary from "./TradeSummary";
import {
  SelectedTradeItem,
  TradeItem,
  ValueSource,
  ValueType,
} from "./types";
import { getItemValue, parseTradeValue } from "../../lib/valueSystem";

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
  const shouldReduceMotion =
    useReducedMotion();

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
    className="relative mt-20 overflow-hidden rounded-[30px] border border-white/60 bg-white/75 p-4 shadow-[0_30px_90px_rgba(15,23,42,.14)] backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_30px_100px_rgba(0,0,0,.42)] sm:rounded-[40px] sm:p-8 lg:p-10"
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
          className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/85 px-5 py-2 text-sm font-black text-yellow-700 shadow-sm backdrop-blur dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
        >
          <span>🧮</span>
          Trade Calculator
        </motion.span>

        <h2
          id="trade-calculator-heading"
          className="mt-6 text-4xl font-black tracking-tight text-slate-800 dark:text-white sm:text-5xl md:text-6xl"
        >
          Calculate Your Trade
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
          Compare both offers using either GCash or Elve Shark values before accepting a trade.
        </p>
      </div>

      <div className="mx-auto mt-9 flex max-w-3xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">

        <select
          value={valueSource}
          onChange={(event) =>
            changeValueSource(event.target.value as ValueSource)
          }
          aria-label="Value source"
          className="min-h-14 cursor-pointer rounded-2xl border-2 border-cyan-300 bg-white/95 px-5 py-3.5 font-bold text-slate-800 shadow-sm outline-none transition duration-200 hover:border-cyan-400 hover:shadow-md focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/25 dark:border-cyan-400/40 dark:bg-slate-950/90 dark:text-slate-100 dark:hover:border-cyan-300/70 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/20 dark:[color-scheme:dark]"
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
          className="min-h-14 cursor-pointer rounded-2xl border-2 border-amber-300 bg-white/95 px-5 py-3.5 font-bold text-slate-800 shadow-sm outline-none transition duration-200 hover:border-amber-400 hover:shadow-md focus:border-amber-400 focus:ring-4 focus:ring-amber-300/25 dark:border-amber-400/45 dark:bg-slate-950/90 dark:text-slate-100 dark:hover:border-amber-300/75 dark:focus:border-amber-300 dark:focus:ring-amber-400/20 dark:[color-scheme:dark]"
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
          className="min-h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3.5 font-bold text-white disabled:opacity-40"
        >
          🔄 Swap Offers
        </motion.button>

        <motion.button
          onClick={clearTrade}
          disabled={tradeIsEmpty}
          className="min-h-14 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 px-6 py-3.5 font-bold text-white disabled:opacity-40"
        >
          🗑 Clear Trade
        </motion.button>

      </div>

      <div className="my-9 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/10" />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-8">

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

        <div className="flex items-center justify-center">
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

      <TradeSummary
        yourTotal={yourTotal}
        theirTotal={theirTotal}
        valueSource={valueSource}
      />

    </div>
  </motion.section>

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