"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Pet } from "../types/pet";

type Props = {
  pets: Pet[];
  onSelect: (pet: Pet) => void;
};

type PetImageProps = {
  src?: string;
  name: string;
};

function PetImage({ src, name }: PetImageProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (!src || imageFailed) {
    return (
      <div className="flex h-24 w-24 items-center justify-center">
        <span aria-hidden="true" className="text-5xl">
          🐾
        </span>
        <span className="sr-only">Image unavailable for {name}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={96}
      height={96}
      unoptimized
      onError={() => setImageFailed(true)}
      className="h-24 w-24 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110"
    />
  );
}


const cardGradients = [
  "from-amber-400 via-yellow-400 to-orange-500",
  "from-cyan-400 via-sky-400 to-blue-500",
  "from-pink-400 via-fuchsia-400 to-purple-500",
  "from-emerald-400 via-green-400 to-teal-500",
];

export default function SearchResults({
  pets,
  onSelect,
}: Props) {
  const shouldReduceMotion = useReducedMotion();

  if (pets.length === 0) return null;

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 25,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative mt-10"
    >
      {/* Header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <motion.div
          initial={{
            opacity: 0,
            x: -20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.5,
          }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-4 py-2 text-sm font-black text-amber-700 backdrop-blur">
            ✨ Matches Found
          </span>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-gray-800 sm:text-4xl">
            Search Results
          </h2>

          <p className="mt-2 text-gray-500">
            We found{" "}
            <span className="font-black text-gray-700">
              {pets.length} {pets.length === 1 ? "pet" : "pets"}
            </span>{" "}
            matching your search.
          </p>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            x: 20,
          }}
          animate={
            shouldReduceMotion
              ? {
                  opacity: 1,
                  x: 0,
                }
              : {
                  opacity: 1,
                  x: 0,
                  scale: [1, 1.04, 1],
                }
          }
          transition={{
            delay: 0.1,
            duration: shouldReduceMotion ? 0.5 : 1.8,
            repeat: shouldReduceMotion ? 0 : Infinity,
            repeatDelay: shouldReduceMotion ? 0 : 1.5,
            ease: "easeInOut",
          }}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/60 bg-white/80 px-5 py-2.5 text-sm font-black text-amber-600 shadow-lg backdrop-blur-xl"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>

          Live Search
        </motion.div>
      </div>

      {/* Results container */}
      <div className="relative overflow-hidden rounded-[34px] border border-white/60 bg-white/75 p-3 shadow-[0_25px_70px_rgba(15,23,42,.13)] backdrop-blur-xl sm:p-4">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-yellow-200/25 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl" />

        <AnimatePresence mode="popLayout">
          <div className="relative space-y-3">
            {pets.map((pet, index) => {
              const gradient =
                cardGradients[index % cardGradients.length];

              return (
                <motion.button
                  layout
                  key={pet.PETS}
                  type="button"
                  onClick={() => onSelect(pet)}
                  initial={{
                    opacity: 0,
                    y: 20,
                    scale: 0.98,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.96,
                  }}
                  transition={{
                    delay: index * 0.06,
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : {
                          y: -4,
                          scale: 1.008,
                        }
                  }
                  whileTap={{
                    scale: 0.985,
                  }}
                  className="group relative flex w-full flex-col gap-5 overflow-hidden rounded-[26px] border border-gray-100/80 bg-white/85 p-5 text-left shadow-sm transition-shadow duration-300 hover:shadow-xl sm:flex-row sm:items-center sm:p-6"
                >
                  {/* Top accent */}
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`}
                  />

                  {/* Hover background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.06]`}
                  />

                  {/* Moving shine */}
                  <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 rotate-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 blur-md transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />

                  {/* Pet image */}
                  <motion.div
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            rotate: index % 2 === 0 ? 3 : -3,
                            scale: 1.06,
                          }
                    }
                    className={`relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${gradient} p-[2px] sm:mx-0`}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-gradient-to-br from-white via-white to-gray-50 p-3">
                      <PetImage
                        src={pet.IMAGE}
                        name={pet.PETS}
                      />
                    </div>

                    <div className="absolute -right-2 -top-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-gray-900 px-2 text-xs font-black text-white shadow-lg">
                      #{index + 1}
                    </div>
                  </motion.div>

                  {/* Pet information */}
                  <div className="relative min-w-0 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <h3 className="truncate text-2xl font-black text-gray-800 transition-colors duration-300 group-hover:text-amber-600">
                        {pet.PETS}
                      </h3>

                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-green-700">
                        Updated
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Current Normal, Neon, and Mega trading values.
                    </p>

                    {/* Values */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-yellow-100 bg-yellow-50 px-3 py-2.5 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-yellow-600">
                          Normal
                        </p>

                        <p className="mt-1 truncate text-lg font-black text-yellow-700">
                          {pet.NORMAL}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-cyan-600">
                          Neon
                        </p>

                        <p className="mt-1 truncate text-lg font-black text-cyan-700">
                          {pet.NEON}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-pink-100 bg-pink-50 px-3 py-2.5 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-pink-600">
                          Mega
                        </p>

                        <p className="mt-1 truncate text-lg font-black text-pink-700">
                          {pet.MEGA}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <motion.div
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            x: 4,
                          }
                    }
                    className={`relative flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${gradient} px-5 py-3.5 font-black text-white shadow-lg transition-shadow duration-300 group-hover:shadow-xl sm:w-auto`}
                  >
                    <span>View Pet</span>

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
                      }}
                    >
                      →
                    </motion.span>
                  </motion.div>
                </motion.button>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}