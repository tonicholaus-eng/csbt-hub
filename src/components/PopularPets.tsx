"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";

import { Pet } from "../types/pet";
import { getPet } from "../lib/search";

const popularPets = [
  "Frost Dragon",
  "Shadow Dragon",
  "Owl",
  "Crow",
  "Parrot",
  "Giraffe",
  "Balloon Unicorn",
  "Evil Unicorn",
];

const gradients = [
  "from-cyan-400 via-sky-400 to-blue-500",
  "from-slate-600 via-slate-800 to-slate-950",
  "from-amber-400 via-orange-400 to-yellow-500",
  "from-purple-500 via-fuchsia-500 to-pink-500",
  "from-green-400 via-emerald-500 to-teal-500",
  "from-yellow-400 via-orange-500 to-red-500",
  "from-pink-400 via-fuchsia-500 to-violet-500",
  "from-red-500 via-pink-500 to-purple-500",
];

type Props = {
  onSelect: (pet: Pet) => void;
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
      <div className="flex h-32 w-32 items-center justify-center text-6xl sm:h-36 sm:w-36">
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
      width={150}
      height={150}
      unoptimized
      onError={() => setImageFailed(true)}
      className="mx-auto h-32 w-32 object-contain drop-shadow-2xl sm:h-36 sm:w-36"
    />
  );
}

export default function PopularPets({
  onSelect,
}: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="values"
      aria-labelledby="popular-values-heading"
      className="relative"
    >
      <motion.div
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
          margin: "-60px",
        }}
        transition={{
          duration: shouldReduceMotion
            ? 0
            : 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mb-10 text-center sm:mb-14"
      >
        <motion.span
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  scale: 1.05,
                }
          }
          className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/80 px-5 py-2 text-sm font-bold text-yellow-700 shadow-sm backdrop-blur dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
        >
          <span aria-hidden="true">⭐</span>
          Community Favorites
        </motion.span>

        <h2
          id="popular-values-heading"
          className="mt-5 text-4xl font-black tracking-tight text-slate-800 dark:text-white sm:text-5xl md:text-6xl"
        >
          Popular Values
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
          The pets traders search for the most
          every day.
        </p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-4 lg:gap-8">
        {popularPets.map((name, index) => {
          const pet = getPet(name);

          if (!pet) {
            return null;
          }

          return (
            <motion.button
              key={name}
              type="button"
              onClick={() => onSelect(pet)}
              initial={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : 45,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                margin: "-40px",
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.55,
                delay: shouldReduceMotion
                  ? 0
                  : index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: -12,
                      rotateX: 4,
                      rotateY:
                        index % 2 === 0
                          ? -4
                          : 4,
                      scale: 1.03,
                    }
              }
              whileTap={{
                scale: shouldReduceMotion
                  ? 1
                  : 0.97,
              }}
              aria-label={`View current values for ${pet.PETS}`}
              className="group relative isolate overflow-hidden rounded-[28px] border border-white/60 bg-white/75 p-5 text-left shadow-xl backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_22px_60px_rgba(0,0,0,.3)] dark:hover:border-white/15 dark:hover:bg-slate-900/85 dark:focus-visible:ring-amber-400/30 sm:rounded-[32px] sm:p-6"
            >
              {/* Card background */}
              <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-br from-white/30 via-transparent to-yellow-100/20 dark:from-white/[0.03] dark:via-transparent dark:to-amber-500/[0.03]" />

              {/* Shine */}
              <div className="pointer-events-none absolute inset-y-0 -left-1/2 -z-10 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 blur-lg transition-all duration-700 group-hover:left-[130%] group-hover:opacity-100 dark:via-white/10" />

              {/* Card glow */}
              <div
                className={`pointer-events-none absolute -right-20 -top-20 -z-10 h-52 w-52 rounded-full bg-gradient-to-br ${gradients[index]} opacity-[0.08] blur-3xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-[0.18] dark:opacity-[0.1] dark:group-hover:opacity-[0.2]`}
              />

              {/* Top accent */}
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradients[index]}`}
              />

              {/* Ranking badge */}
              <div className="absolute right-4 top-4 z-20 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-black text-slate-700 shadow-md backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300 sm:right-5 sm:top-5">
                #{index + 1}
              </div>

              {/* Pet image */}
              <div
                className={`relative rounded-[24px] bg-gradient-to-br ${gradients[index]} p-[2px] sm:rounded-3xl`}
              >
                <div className="flex min-h-48 items-center justify-center rounded-[22px] bg-gradient-to-br from-white via-white to-slate-50 p-5 transition-colors duration-300 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 sm:p-6">
                  <motion.div
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            rotate: [-2, 2, -2],
                            scale: 1.08,
                          }
                    }
                    transition={{
                      duration: 0.5,
                    }}
                  >
                    <PetImage
                      src={pet.IMAGE}
                      name={pet.PETS}
                    />
                  </motion.div>
                </div>
              </div>

              {/* Pet information */}
              <h3 className="mt-5 truncate text-xl font-black text-slate-800 transition-colors duration-300 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-300 sm:mt-6 sm:text-2xl">
                {pet.PETS}
              </h3>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                View current trading values
              </p>

              {/* Value preview */}
              <div className="mt-5 grid grid-cols-3 gap-2 text-center sm:mt-6">
                <div className="min-w-0 rounded-xl bg-yellow-100 px-1 py-2.5 dark:bg-amber-400/10">
                  <div className="text-[10px] font-bold text-yellow-700 dark:text-amber-300 sm:text-xs">
                    Normal
                  </div>

                  <div className="mt-0.5 truncate text-sm font-black text-yellow-800 dark:text-amber-200 sm:text-base">
                    {pet.NORMAL}
                  </div>
                </div>

                <div className="min-w-0 rounded-xl bg-cyan-100 px-1 py-2.5 dark:bg-cyan-400/10">
                  <div className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 sm:text-xs">
                    Neon
                  </div>

                  <div className="mt-0.5 truncate text-sm font-black text-cyan-800 dark:text-cyan-200 sm:text-base">
                    {pet.NEON}
                  </div>
                </div>

                <div className="min-w-0 rounded-xl bg-pink-100 px-1 py-2.5 dark:bg-pink-400/10">
                  <div className="text-[10px] font-bold text-pink-700 dark:text-pink-300 sm:text-xs">
                    Mega
                  </div>

                  <div className="mt-0.5 truncate text-sm font-black text-pink-800 dark:text-pink-200 sm:text-base">
                    {pet.MEGA}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-700 transition-all duration-300 group-hover:bg-amber-500 group-hover:text-white dark:bg-white/[0.06] dark:text-slate-300 dark:group-hover:bg-amber-500 dark:group-hover:text-slate-950 sm:mt-6 sm:px-5">
                <span>View Details</span>

                <motion.span
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          x: [0, 4, 0],
                        }
                  }
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.12,
                  }}
                  aria-hidden="true"
                >
                  →
                </motion.span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}