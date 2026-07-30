"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  SelectedTradePet,
  TradePet,
  ValueType,
} from "./types";

type Props = {
  selectedPet: SelectedTradePet;
  onRemove: () => void;
  onValueTypeChange: (
    valueType: ValueType,
  ) => void;
};

const badgeColors: Record<
  ValueType,
  string
> = {
  NORMAL:
    "border-yellow-300 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 dark:border-amber-400/20 dark:from-amber-400/10 dark:to-orange-400/10 dark:text-amber-300",
  NEON:
    "border-cyan-300 bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 dark:border-cyan-400/20 dark:from-cyan-400/10 dark:to-blue-400/10 dark:text-cyan-300",
  MEGA:
    "border-pink-300 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 dark:border-pink-400/20 dark:from-pink-400/10 dark:to-purple-400/10 dark:text-pink-300",
};

type PetImageProps = {
  src?: string;
  name: string;
};

function PetImage({
  src,
  name,
}: PetImageProps) {
  const [imageFailed, setImageFailed] =
    useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (!src || imageFailed) {
    return (
      <div className="flex h-[72px] w-[72px] items-center justify-center text-4xl">
        <span aria-hidden="true">🐾</span>

        <span className="sr-only">
          Image unavailable for {name}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={72}
      height={72}
      unoptimized
      onError={() => setImageFailed(true)}
      className="h-[72px] w-[72px] object-contain transition-transform duration-300 group-hover/card:scale-110 group-hover/card:rotate-3"
    />
  );
}

function formatPetValue(
  value: TradePet[ValueType],
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "0";
  }

  return String(value);
}

function hasAvailableValue(
  value: TradePet[ValueType],
) {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  const normalizedValue = String(value)
    .trim()
    .replace(/,/g, "");

  if (!normalizedValue) {
    return false;
  }

  const firstNumber = normalizedValue.match(
    /-?\d+(?:\.\d+)?/,
  );

  if (!firstNumber) {
    return false;
  }

  const numericValue = Number(firstNumber[0]);

  return (
    Number.isFinite(numericValue) &&
    numericValue > 0
  );
}

export default function TradePetCard({
  selectedPet,
  onRemove,
  onValueTypeChange,
}: Props) {
  const shouldReduceMotion =
    useReducedMotion();

  const { pet, valueType } = selectedPet;

  return (
    <motion.article
      layout={!shouldReduceMotion}
      whileHover={
        shouldReduceMotion
          ? undefined
          : {
              y: -4,
              scale: 1.01,
            }
      }
      className="group/card relative overflow-hidden rounded-[22px] border border-white/70 bg-white/90 p-4 shadow-md backdrop-blur transition-[background-color,border-color,box-shadow] duration-300 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/85 dark:shadow-[0_14px_35px_rgba(0,0,0,.25)] dark:hover:border-white/15 sm:rounded-3xl sm:p-5"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-orange-300/10 blur-3xl transition-opacity duration-300 group-hover/card:opacity-100 dark:bg-amber-500/5" />

      {/* Shine */}
      <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 blur-lg transition-all duration-700 group-hover/card:left-[130%] group-hover/card:opacity-100 dark:via-white/10" />

      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400" />

      {/* Remove button */}
      <motion.button
        type="button"
        onClick={onRemove}
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                scale: 1.1,
                rotate: 6,
              }
        }
        whileTap={{
          scale: shouldReduceMotion
            ? 1
            : 0.9,
        }}
        aria-label={`Remove ${pet.PETS} from trade`}
        title={`Remove ${pet.PETS}`}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-sm font-black text-white opacity-100 shadow-lg outline-none transition-colors duration-300 hover:bg-red-600 focus-visible:ring-4 focus-visible:ring-red-300/50 sm:right-4 sm:top-4 sm:opacity-0 sm:group-hover/card:opacity-100 sm:focus-visible:opacity-100 dark:shadow-red-950/40 dark:focus-visible:ring-red-400/30"
      >
        <span aria-hidden="true">✕</span>
      </motion.button>

      <div className="relative flex items-center gap-4 pr-8 sm:gap-5 sm:pr-6">
        {/* Image */}
        <motion.div
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  scale: 1.05,
                }
          }
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] border border-white/70 bg-gradient-to-br from-yellow-50 via-white to-orange-100 shadow-inner dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 sm:h-24 sm:w-24 sm:rounded-3xl"
        >
          <PetImage
            src={pet.IMAGE}
            name={pet.PETS}
          />
        </motion.div>

        {/* Information */}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-lg font-black text-slate-800 dark:text-white sm:text-xl">
            {pet.PETS}
          </h4>

          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
            Current CSBT Value
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-3">
            <div className="relative">
              <label
                htmlFor={`variant-${selectedPet.id}`}
                className="sr-only"
              >
                Choose variant for {pet.PETS}
              </label>

              <select
                id={`variant-${selectedPet.id}`}
                value={valueType}
                onChange={(event) =>
                  onValueTypeChange(
                    event.target
                      .value as ValueType,
                  )
                }
                className={`cursor-pointer appearance-none rounded-full border py-1 pl-3 pr-8 text-[10px] font-black uppercase tracking-wide outline-none transition-all focus-visible:ring-4 sm:py-1.5 sm:pl-4 sm:pr-9 sm:text-xs ${badgeColors[valueType]}`}
              >
                <option
                  value="NORMAL"
                  disabled={
                    !hasAvailableValue(
                      pet.NORMAL,
                    )
                  }
                >
                  Normal
                </option>

                <option
                  value="NEON"
                  disabled={
                    !hasAvailableValue(
                      pet.NEON,
                    )
                  }
                >
                  Neon
                </option>

                <option
                  value="MEGA"
                  disabled={
                    !hasAvailableValue(
                      pet.MEGA,
                    )
                  }
                >
                  Mega
                </option>
              </select>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px]"
              >
                ▼
              </span>
            </div>

            <motion.span
              key={`${selectedPet.id}-${valueType}`}
              initial={{
                opacity: 0,
                scale: shouldReduceMotion
                  ? 1
                  : 0.9,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.2,
              }}
              className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-base font-black tabular-nums text-slate-700 shadow-sm dark:bg-white/[0.07] dark:text-slate-200 sm:px-4 sm:text-lg"
            >
              {formatPetValue(
                pet[valueType],
              )}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}