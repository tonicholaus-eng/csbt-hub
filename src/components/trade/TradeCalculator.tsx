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
  SelectedTradePet,
  TradePet,
  ValueType,
} from "./types";

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

function parsePetValue(
  pet: TradePet,
  valueType: ValueType,
) {
  const rawValue = pet[valueType];

  if (
    rawValue === null ||
    rawValue === undefined
  ) {
    return 0;
  }

  const normalizedValue = String(rawValue)
    .trim()
    .replace(/,/g, "");

  if (!normalizedValue) {
    return 0;
  }

  /*
   * Values may be stored as ranges such as "10 - 12".
   * The first valid number is used to stay consistent
   * with the calculator's previous behavior.
   */
  const firstNumber = normalizedValue.match(
    /-?\d+(?:\.\d+)?/,
  );

  if (!firstNumber) {
    return 0;
  }

  const numericValue = Number(firstNumber[0]);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
}

function hasPetValue(
  pet: TradePet,
  valueType: ValueType,
) {
  return parsePetValue(pet, valueType) > 0;
}

function getStartingValueType(
  pet: TradePet,
  preferredValueType: ValueType,
): ValueType {
  if (hasPetValue(pet, preferredValueType)) {
    return preferredValueType;
  }

  const valueTypes: ValueType[] = [
    "NORMAL",
    "NEON",
    "MEGA",
  ];

  return (
    valueTypes.find((valueType) =>
      hasPetValue(pet, valueType),
    ) ?? preferredValueType
  );
}

function createSelectedPet(
  pet: TradePet,
  defaultValueType: ValueType,
): SelectedTradePet {
  return {
    id: crypto.randomUUID(),
    pet,
    valueType: getStartingValueType(
      pet,
      defaultValueType,
    ),
  };
}

export default function TradeCalculator() {
  const shouldReduceMotion = useReducedMotion();

  const [modalOpen, setModalOpen] =
    useState(false);

  const [activeSide, setActiveSide] =
    useState<TradeSideType>("your");

  const [
    defaultValueType,
    setDefaultValueType,
  ] = useState<ValueType>("NORMAL");

  const [yourPets, setYourPets] = useState<
    SelectedTradePet[]
  >([]);

  const [theirPets, setTheirPets] = useState<
    SelectedTradePet[]
  >([]);

  const yourTotal = useMemo(
    () =>
      yourPets.reduce(
        (total, selectedPet) =>
          total +
          parsePetValue(
            selectedPet.pet,
            selectedPet.valueType,
          ),
        0,
      ),
    [yourPets],
  );

  const theirTotal = useMemo(
    () =>
      theirPets.reduce(
        (total, selectedPet) =>
          total +
          parsePetValue(
            selectedPet.pet,
            selectedPet.valueType,
          ),
        0,
      ),
    [theirPets],
  );

  const tradeIsEmpty =
    yourPets.length === 0 &&
    theirPets.length === 0;

  function openAddPetModal(
    side: TradeSideType,
  ) {
    setActiveSide(side);
    setModalOpen(true);
  }

  function addPet(pet: TradePet) {
    const selectedPet = createSelectedPet(
      pet,
      defaultValueType,
    );

    if (activeSide === "your") {
      setYourPets((currentPets) => [
        ...currentPets,
        selectedPet,
      ]);
    } else {
      setTheirPets((currentPets) => [
        ...currentPets,
        selectedPet,
      ]);
    }

    setModalOpen(false);
  }

  function removeYour(id: string) {
    setYourPets((currentPets) =>
      currentPets.filter(
        (selectedPet) =>
          selectedPet.id !== id,
      ),
    );
  }

  function removeTheir(id: string) {
    setTheirPets((currentPets) =>
      currentPets.filter(
        (selectedPet) =>
          selectedPet.id !== id,
      ),
    );
  }

  function updateYourValueType(
    id: string,
    valueType: ValueType,
  ) {
    setYourPets((currentPets) =>
      currentPets.map((selectedPet) =>
        selectedPet.id === id
          ? {
              ...selectedPet,
              valueType,
            }
          : selectedPet,
      ),
    );
  }

  function updateTheirValueType(
    id: string,
    valueType: ValueType,
  ) {
    setTheirPets((currentPets) =>
      currentPets.map((selectedPet) =>
        selectedPet.id === id
          ? {
              ...selectedPet,
              valueType,
            }
          : selectedPet,
      ),
    );
  }

  function swapSides() {
    const previousYourPets = yourPets;

    setYourPets(theirPets);
    setTheirPets(previousYourPets);
  }

  function clearTrade() {
    setYourPets([]);
    setTheirPets([]);
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
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,.12),transparent_52%)] dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,.08),transparent_55%)]" />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.025)_1px,transparent_1px)] bg-[size:36px_36px] dark:bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)]" />

        <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />

        <div className="pointer-events-none absolute -bottom-32 -right-28 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />

        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/20" />

        <div className="relative">
          {/* Heading */}
          <div className="text-center">
            <motion.span
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 1.05,
                    }
              }
              className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/85 px-5 py-2 text-sm font-black text-yellow-700 shadow-sm backdrop-blur dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
            >
              <span aria-hidden="true">
                🧮
              </span>

              Trade Calculator
            </motion.span>

            <h2
              id="trade-calculator-heading"
              className="mt-6 text-4xl font-black tracking-tight text-slate-800 dark:text-white sm:text-5xl md:text-6xl"
            >
              Calculate Your Trade
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
              Compare both offers instantly using
              the latest CSBT values before
              accepting a trade.
            </p>
          </div>

          {/* Controls */}
          <div className="mx-auto mt-9 flex max-w-3xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <label
              className="sr-only"
              htmlFor="trade-value-type"
            >
              Select the default value category for
              newly added pets
            </label>

            <select
              id="trade-value-type"
              value={defaultValueType}
              onChange={(event) =>
                setDefaultValueType(
                  event.target
                    .value as ValueType,
                )
              }
              title="Default variant for newly added pets"
              className="min-h-14 cursor-pointer rounded-2xl border-2 border-yellow-300 bg-white/90 px-5 py-3.5 font-bold text-slate-700 shadow-sm outline-none transition-all duration-300 hover:border-yellow-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200/70 dark:border-amber-400/25 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-400/50 dark:focus:border-amber-400 dark:focus:ring-amber-400/15 sm:px-6"
            >
              {valueOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <motion.button
              type="button"
              onClick={swapSides}
              disabled={tradeIsEmpty}
              whileHover={
                shouldReduceMotion ||
                tradeIsEmpty
                  ? undefined
                  : {
                      y: -4,
                      scale: 1.02,
                    }
              }
              whileTap={
                shouldReduceMotion ||
                tradeIsEmpty
                  ? undefined
                  : {
                      scale: 0.96,
                    }
              }
              className="min-h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3.5 font-bold text-white shadow-lg shadow-cyan-300/25 outline-none transition-opacity duration-300 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-cyan-950/30 dark:focus-visible:ring-cyan-400/30"
            >
              <span aria-hidden="true">
                🔄
              </span>{" "}
              Swap Offers
            </motion.button>

            <motion.button
              type="button"
              onClick={clearTrade}
              disabled={tradeIsEmpty}
              whileHover={
                shouldReduceMotion ||
                tradeIsEmpty
                  ? undefined
                  : {
                      y: -4,
                      scale: 1.02,
                    }
              }
              whileTap={
                shouldReduceMotion ||
                tradeIsEmpty
                  ? undefined
                  : {
                      scale: 0.96,
                    }
              }
              className="min-h-14 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 px-6 py-3.5 font-bold text-white shadow-lg shadow-red-300/25 outline-none transition-opacity duration-300 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-red-300/50 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-red-950/30 dark:focus-visible:ring-red-400/30"
            >
              <span aria-hidden="true">
                🗑
              </span>{" "}
              Clear Trade
            </motion.button>
          </div>

          <p className="mx-auto mt-3 max-w-2xl text-center text-xs font-medium text-slate-400 dark:text-slate-500 sm:text-sm">
            The selected default only affects newly
            added pets. Each pet can be changed
            individually afterward.
          </p>

          <div className="my-9 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/10 sm:my-12" />

          {/* Offers */}
          <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-8">
            <TradeSide
              title="Your Offer"
              color="yellow"
              pets={yourPets}
              total={yourTotal}
              onAdd={() =>
                openAddPetModal("your")
              }
              onRemove={removeYour}
              onValueTypeChange={
                updateYourValueType
              }
            />

            <div className="flex items-center justify-center">
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: [
                          1,
                          1.06,
                          1,
                        ],
                        boxShadow: [
                          "0 20px 50px rgba(249,115,22,.25)",
                          "0 25px 70px rgba(249,115,22,.4)",
                          "0 20px 50px rgba(249,115,22,.25)",
                        ],
                      }
                }
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-2xl font-black text-white shadow-2xl ring-8 ring-white/50 dark:ring-white/5 sm:h-24 sm:w-24 sm:text-3xl xl:h-28 xl:w-28 xl:text-4xl"
                aria-label="Versus"
              >
                <div className="pointer-events-none absolute inset-1 rounded-full border border-white/30" />

                VS
              </motion.div>
            </div>

            <TradeSide
              title="Their Offer"
              color="cyan"
              pets={theirPets}
              total={theirTotal}
              onAdd={() =>
                openAddPetModal("their")
              }
              onRemove={removeTheir}
              onValueTypeChange={
                updateTheirValueType
              }
            />
          </div>

          <TradeSummary
            yourTotal={yourTotal}
            theirTotal={theirTotal}
          />
        </div>
      </motion.section>

      <AddPetModal
        open={modalOpen}
        onClose={() =>
          setModalOpen(false)
        }
        onSelect={addPet}
      />
    </>
  );
}