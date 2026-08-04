"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import valueSources from "../data/valueSources.json";
import type { TradeItem, ValueSource } from "./trade/types";
import {
  VALUE_SOURCE_LABELS,
  formatTradeValue,
  getItemValue,
  hasItemValue,
} from "../lib/valueSystem";
import { getItemCategoryDetails } from "../lib/itemCategory";

type Props = {
  pet: TradeItem;
  onBack: () => void;
};

type PetImageProps = {
  src?: string;
  name: string;
  category: TradeItem["CATEGORY"];
};

function PetImage({ src, name, category }: PetImageProps) {
  const [failed, setFailed] = useState(false);
  const categoryDetails = getItemCategoryDetails(category);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-52 w-52 items-center justify-center text-7xl">
        {categoryDetails.icon}
        <span className="sr-only">Image unavailable for {name}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={256}
      height={256}
      priority
      unoptimized
      onError={() => setFailed(true)}
      className="h-52 w-52 object-contain drop-shadow-xl"
    />
  );
}

const cards = [
  {
    key: "NORMAL",
    label: "Regular",
    icon: "🟡",
    style: "from-yellow-50 to-orange-100 text-yellow-700",
  },
  {
    key: "NEON",
    label: "Neon",
    icon: "🔷",
    style: "from-cyan-50 to-blue-100 text-cyan-700",
  },
  {
    key: "MEGA",
    label: "Mega",
    icon: "🌈",
    style: "from-pink-50 to-purple-100 text-pink-700",
  },
] as const;

function formatUpdatedAt(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function PetDetails({ pet, onBack }: Props) {
  const reduceMotion = useReducedMotion();
  const categoryDetails = getItemCategoryDetails(pet.CATEGORY);
  const elveOnly =
    categoryDetails.elveOnly ||
    (!hasItemValue(pet, "GCASH", "NORMAL") &&
      hasItemValue(pet, "ELVE", "NORMAL"));
  const [source, setSource] = useState<ValueSource>(
    elveOnly ? "ELVE" : "GCASH",
  );

  useEffect(() => {
    setSource(elveOnly ? "ELVE" : "GCASH");
  }, [elveOnly, pet.ID]);

  const availableCards = categoryDetails.regularOnly
    ? cards.filter((card) => card.key === "NORMAL")
    : cards;

  const elveUpdatedAt =
    (valueSources as {
      sources?: { ELVE?: { updatedAt?: string } };
    }).sources?.ELVE?.updatedAt;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 overflow-hidden rounded-[38px] border border-white/60 bg-white/85 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80"
    >
      <div className="bg-gradient-to-br from-amber-500 via-yellow-400 to-orange-500 px-6 py-10 text-white sm:px-10">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-white/20 px-5 py-2 font-black backdrop-blur"
        >
          ← Back
        </button>

        <div className="mt-8 flex flex-col items-center gap-8 lg:flex-row">
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="rounded-[34px] bg-white/20 p-6"
          >
            <PetImage src={pet.IMAGE} name={pet.NAME} category={pet.CATEGORY} />
          </motion.div>

          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-black">{pet.NAME}</h1>
            <p className="mt-4 text-lg text-white/90">
              {categoryDetails.regularOnly
                ? categoryDetails.elveOnly
                  ? "View its current Elve Shark regular value."
                  : "Compare its GCash and Elve Shark regular values."
                : "Compare Regular, Neon, and Mega values from two separate systems."}
            </p>
            <span className="mt-5 inline-flex rounded-full bg-white/20 px-4 py-2 font-black">
              {categoryDetails.icon} {categoryDetails.label}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-10">
        <h2 className="text-center text-3xl font-black">Value Breakdown</h2>

        <div className="mx-auto mt-6 flex max-w-xl rounded-2xl border border-slate-200 bg-slate-100 p-1.5 dark:border-white/10 dark:bg-slate-900">
          {(["GCASH", "ELVE"] as const).map((option) => {
            const disabled = option === "GCASH" && elveOnly;

            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => setSource(option)}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  source === option
                    ? "bg-white text-slate-900 shadow dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {option === "GCASH" ? "💸 GCash" : "🦈 Elve Shark"}
              </button>
            );
          })}
        </div>

        {elveOnly && (
          <p className="mt-3 text-center text-xs font-bold text-amber-600 dark:text-amber-300">
            Eggs and toys currently use Elve Shark values only.
          </p>
        )}

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {VALUE_SOURCE_LABELS[source]}
          {source === "ELVE"
            ? ` • Updated ${formatUpdatedAt(elveUpdatedAt)}`
            : " • CSBT master data"}
        </p>

        <div
          className={`mt-8 grid gap-6 ${
            availableCards.length === 1
              ? "mx-auto max-w-md"
              : "lg:grid-cols-3"
          }`}
        >
          {availableCards.map((card) => (
            <motion.div
              key={`${source}-${card.key}`}
              whileHover={reduceMotion ? undefined : { y: -8 }}
              className={`rounded-[30px] border bg-gradient-to-br p-7 text-center shadow-lg ${card.style}`}
            >
              <div className="text-4xl">{card.icon}</div>
              <p className="mt-4 text-sm font-black uppercase">{card.label}</p>
              <p className="mt-5 text-5xl font-black">
                {formatTradeValue(getItemValue(pet, source, card.key))}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          <strong>Important:</strong> GCash and Elve Shark are separate value systems. The site never combines them in one calculation.
        </div>
      </div>
    </motion.section>
  );
}
