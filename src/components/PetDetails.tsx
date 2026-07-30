"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pet } from "../types/pet";

type Props = {
  pet: Pet;
  onBack: () => void;
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
      <div className="flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60">
        <span aria-hidden="true" className="text-7xl">
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
      width={256}
      height={256}
      priority
      unoptimized
      onError={() => setImageFailed(true)}
      className="h-52 w-52 object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,.25)] sm:h-60 sm:w-60"
    />
  );
}


const valueCards = [
  {
    key: "NORMAL",
    label: "Normal",
    icon: "🟡",
    description: "Standard version",
    cardStyle:
      "border-yellow-200 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100",
    iconStyle: "bg-yellow-200/70",
    valueStyle: "text-yellow-700",
    glowStyle: "group-hover:shadow-yellow-300/40",
  },
  {
    key: "NEON",
    label: "Neon",
    icon: "🔷",
    description: "Glowing neon version",
    cardStyle:
      "border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100",
    iconStyle: "bg-cyan-200/70",
    valueStyle: "text-cyan-700",
    glowStyle: "group-hover:shadow-cyan-300/40",
  },
  {
    key: "MEGA",
    label: "Mega",
    icon: "🌈",
    description: "Mega neon version",
    cardStyle:
      "border-pink-200 bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-100",
    iconStyle: "bg-pink-200/70",
    valueStyle: "text-pink-700",
    glowStyle: "group-hover:shadow-pink-300/40",
  },
] as const;

export default function PetDetails({ pet, onBack }: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      key={pet.PETS}
      initial={{
        opacity: 0,
        y: 35,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative mt-16 overflow-hidden rounded-[38px] border border-white/60 bg-white/85 shadow-[0_30px_80px_rgba(15,23,42,.16)] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-yellow-400 to-orange-500 px-6 py-8 text-white sm:px-8 lg:px-12 lg:py-12">
        {/* Background lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.32),transparent_60%)]" />

        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/15 blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 45, 0],
                  y: [0, 30, 0],
                  scale: [1, 1.12, 1],
                }
          }
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -bottom-40 -right-28 h-[430px] w-[430px] rounded-full bg-orange-300/30 blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, -40, 0],
                  y: [0, -25, 0],
                  scale: [1, 1.15, 1],
                }
          }
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Moving shine */}
        <motion.div
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  left: ["-50%", "130%"],
                }
          }
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatDelay: 4,
            ease: "easeInOut",
          }}
        />

        <div className="relative z-10">
          <motion.button
            type="button"
            onClick={onBack}
            whileHover={{
              x: -4,
              scale: 1.04,
            }}
            whileTap={{
              scale: 0.96,
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-5 py-2.5 font-black shadow-lg backdrop-blur-xl transition-colors hover:bg-white/30"
          >
            <span aria-hidden="true">←</span>
            Back to pets
          </motion.button>

          <div className="mt-9 flex flex-col items-center gap-8 lg:flex-row lg:gap-12">
            {/* Pet image */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.8,
                rotate: -8,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: 0,
              }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 130,
                damping: 14,
              }}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 1.04,
                      rotate: 2,
                    }
              }
              className="relative flex h-64 w-64 shrink-0 items-center justify-center rounded-[34px] border border-white/25 bg-white/15 p-6 shadow-2xl backdrop-blur-xl sm:h-72 sm:w-72"
            >
              <div className="absolute inset-4 rounded-[28px] bg-white/10 blur-lg" />

              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: [0, -10, 0],
                        rotate: [-2, 2, -2],
                      }
                }
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <PetImage
                  src={pet.IMAGE}
                  name={pet.PETS}
                />
              </motion.div>

              <motion.span
                className="absolute right-5 top-5 text-2xl"
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: [0.8, 1.25, 0.8],
                        rotate: [0, 180, 360],
                        opacity: [0.4, 1, 0.4],
                      }
                }
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                ✨
              </motion.span>
            </motion.div>

            {/* Pet information */}
            <motion.div
              initial={{
                opacity: 0,
                x: 35,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.25,
                duration: 0.65,
                ease: "easeOut",
              }}
              className="flex-1 text-center lg:text-left"
            >
              <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <h1 className="text-4xl font-black tracking-tight drop-shadow-lg sm:text-5xl lg:text-6xl">
                  {pet.PETS}
                </h1>

                <motion.span
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: [1, 1.04, 1],
                        }
                  }
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-green-500/90 px-4 py-2 text-sm font-black shadow-lg backdrop-blur"
                >
                  <span>✓</span>
                  Updated
                </motion.span>
              </div>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/90 lg:mx-0">
                Compare the latest CSBT values for the Normal, Neon, and Mega
                versions of this pet.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
                <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                  📊 Live values
                </span>

                <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                  🗓️ Updated daily
                </span>

                <span className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                  💎 CSBT database
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="relative p-6 sm:p-8 lg:p-12">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-3/4 -translate-x-1/2 rounded-full bg-yellow-200/15 blur-3xl" />

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.35,
            duration: 0.6,
          }}
          className="relative mb-8 text-center"
        >
          <span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-700">
            Current Trading Values
          </span>

          <h2 className="mt-4 text-3xl font-black text-gray-800 sm:text-4xl">
            Value Breakdown
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-gray-500">
            Select the version that matches the pet you are checking.
          </p>
        </motion.div>

        <div className="relative grid gap-6 lg:grid-cols-3">
          {valueCards.map((card, index) => (
            <motion.div
              key={card.key}
              initial={{
                opacity: 0,
                y: 35,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.45 + index * 0.1,
                duration: 0.55,
                ease: "easeOut",
              }}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: -10,
                      scale: 1.025,
                      rotate: index === 1 ? 0 : index === 0 ? -1 : 1,
                    }
              }
              className={`group relative overflow-hidden rounded-[30px] border p-7 text-center shadow-lg transition-shadow duration-300 hover:shadow-2xl ${card.cardStyle} ${card.glowStyle}`}
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              <div className="relative">
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          y: [0, -5, 0],
                          rotate: [-2, 2, -2],
                        }
                  }
                  transition={{
                    duration: 4 + index,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-inner ${card.iconStyle}`}
                >
                  {card.icon}
                </motion.div>

                <p className="mt-6 text-sm font-black uppercase tracking-[0.28em] text-gray-500">
                  {card.label}
                </p>

                <p className="mt-2 text-sm font-medium text-gray-500">
                  {card.description}
                </p>

                <motion.p
                  key={`${pet.PETS}-${card.key}`}
                  initial={{
                    opacity: 0,
                    scale: 0.75,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    delay: 0.65 + index * 0.1,
                    type: "spring",
                    stiffness: 180,
                    damping: 14,
                  }}
                  className={`mt-6 text-5xl font-black tabular-nums sm:text-6xl ${card.valueStyle}`}
                >
                  {pet[card.key]}
                </motion.p>

                <div className="mx-auto mt-6 h-1.5 w-16 rounded-full bg-current opacity-20 transition-all duration-300 group-hover:w-28" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Information cards */}
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.8,
            duration: 0.6,
          }}
          className="relative mt-10 grid gap-5 md:grid-cols-3"
        >
          {[
            {
              icon: "🗄️",
              label: "Database",
              value: "Active",
              valueStyle: "text-green-600",
              accentStyle: "from-green-400 to-emerald-500",
            },
            {
              icon: "🔄",
              label: "Updates",
              value: "Daily",
              valueStyle: "text-amber-600",
              accentStyle: "from-yellow-400 to-orange-500",
            },
            {
              icon: "💠",
              label: "Source",
              value: "CSBT",
              valueStyle: "text-blue-600",
              accentStyle: "from-cyan-400 to-blue-500",
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: -6,
                      scale: 1.02,
                    }
              }
              className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white/80 p-6 shadow-md backdrop-blur transition-shadow duration-300 hover:shadow-xl"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accentStyle}`}
              />

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  {item.icon}
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-500">
                    {item.label}
                  </p>

                  <p className={`mt-1 text-2xl font-black ${item.valueStyle}`}>
                    {index === 0 && (
                      <span className="mr-1" aria-hidden="true">
                        ✓
                      </span>
                    )}

                    {item.value}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 1,
            duration: 0.6,
          }}
          className="relative mt-8 rounded-3xl border border-amber-200 bg-amber-50/80 px-6 py-5 text-center text-sm leading-relaxed text-amber-800"
        >
          Values can change as the Adopt Me trading market evolves. Always
          compare both sides carefully before completing a trade.
        </motion.div>
      </div>
    </motion.section>
  );
}