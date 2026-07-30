"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { MouseEvent } from "react";

type HeroProps = {
  totalPets: number;
};

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const featureItems = [
  {
    icon: "🔍",
    label: "Instant Search",
  },
  {
    icon: "🤝",
    label: "Trade Calculator",
  },
  {
    icon: "📈",
    label: "Updated Values",
  },
];

const statItems = (totalPets: number) => [
  {
    value: `${totalPets}+`,
    label: "Pets",
    description: "Tracked values",
    shouldFloat: false,
  },
  {
    value: "⚡",
    label: "Fast Search",
    description: "Instant results",
    shouldFloat: true,
  },
  {
    value: "💎",
    label: "Accurate Values",
    description: "Daily updates",
    shouldFloat: true,
  },
  {
    value: "🏆",
    label: "Fair Trades",
    description: "Trade smarter",
    shouldFloat: true,
  },
];

export default function Hero({ totalPets }: HeroProps) {
  const shouldReduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, {
    stiffness: 80,
    damping: 20,
    mass: 0.6,
  });

  const smoothMouseY = useSpring(mouseY, {
    stiffness: 80,
    damping: 20,
    mass: 0.6,
  });

  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [2.5, -2.5]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-2.5, 2.5]);

  const frostX = useTransform(smoothMouseX, [-0.5, 0.5], [-18, 18]);
  const frostY = useTransform(smoothMouseY, [-0.5, 0.5], [-14, 14]);

  const shadowX = useTransform(smoothMouseX, [-0.5, 0.5], [16, -16]);
  const shadowY = useTransform(smoothMouseY, [-0.5, 0.5], [12, -12]);

  const owlX = useTransform(smoothMouseX, [-0.5, 0.5], [-12, 12]);
  const owlY = useTransform(smoothMouseY, [-0.5, 0.5], [16, -16]);

  const unicornX = useTransform(smoothMouseX, [-0.5, 0.5], [14, -14]);
  const unicornY = useTransform(smoothMouseY, [-0.5, 0.5], [-12, 12]);

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (shouldReduceMotion) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <motion.section
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        shouldReduceMotion
          ? undefined
          : {
              rotateX,
              rotateY,
              transformPerspective: 1400,
            }
      }
      className="group relative overflow-hidden rounded-[40px] border border-white/30 bg-gradient-to-br from-amber-500 via-yellow-400 to-orange-500 px-5 py-12 text-white shadow-[0_30px_80px_rgba(251,146,60,.35)] will-change-transform dark:shadow-[0_30px_90px_rgba(0,0,0,.5)] sm:px-8 md:py-20"
    >
      {/* Background lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.32),transparent_58%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,.13)_45%,transparent_70%)] opacity-70" />

      <motion.div
        className="absolute -left-24 -top-24 hidden h-80 w-80 rounded-full bg-white/15 blur-3xl md:block"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, 40, 0],
                y: [0, 28, 0],
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
        className="absolute -right-20 bottom-0 hidden h-96 w-96 rounded-full bg-orange-300/25 blur-3xl md:block"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, -45, 0],
                y: [0, -30, 0],
                scale: [1, 1.15, 1],
              }
        }
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute left-1/2 top-0 hidden h-80 w-80 -translate-x-1/2 rounded-full bg-yellow-100/15 blur-3xl md:block"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                y: [0, 45, 0],
                scale: [1, 0.9, 1],
              }
        }
        transition={{
          duration: 14,
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

      {/* Decorative rings */}
      <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full border border-white/15" />
      <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border border-white/10" />
      <div className="absolute -bottom-36 -left-24 h-72 w-72 rounded-full border border-white/10" />

      {/* Floating pets */}
      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: frostX,
                y: frostY,
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                rotate: [-12, -7, -12],
              }
        }
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute left-8 top-8 hidden lg:block"
      >
        <Image
          src="/pets/frost-dragon.webp"
          alt=""
          width={144}
          height={144}
          priority
          className="h-36 w-36 object-contain opacity-25 drop-shadow-2xl"
        />
      </motion.div>

      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: shadowX,
                y: shadowY,
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                rotate: [12, 18, 12],
              }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute bottom-8 left-10 hidden lg:block"
      >
        <Image
          src="/pets/shadow-dragon.webp"
          alt=""
          width={144}
          height={144}
          className="h-36 w-36 object-contain opacity-25 drop-shadow-2xl"
        />
      </motion.div>

      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: owlX,
                y: owlY,
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                rotate: [-4, 4, -4],
              }
        }
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute right-10 top-10 hidden lg:block"
      >
        <Image
          src="/pets/owl.webp"
          alt=""
          width={128}
          height={128}
          className="h-32 w-32 object-contain opacity-25 drop-shadow-2xl"
        />
      </motion.div>

      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: unicornX,
                y: unicornY,
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                rotate: [4, -5, 4],
              }
        }
        transition={{
          duration: 6.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute bottom-10 right-10 hidden lg:block"
      >
        <Image
          src="/pets/balloon-unicorn.webp"
          alt=""
          width={128}
          height={128}
          className="h-32 w-32 object-contain opacity-25 drop-shadow-2xl"
        />
      </motion.div>

      {/* Sparkles */}
      <motion.span
        className="pointer-events-none absolute left-[18%] top-[18%] text-2xl"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.25, 0.8],
                rotate: [0, 180, 360],
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

      <motion.span
        className="pointer-events-none absolute right-[18%] top-[28%] text-xl"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                opacity: [0.2, 0.9, 0.2],
                scale: [0.7, 1.2, 0.7],
                rotate: [360, 180, 0],
              }
        }
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      >
        ⭐
      </motion.span>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.span
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          whileHover={{
            scale: 1.05,
          }}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-5 py-2 text-sm font-bold shadow-lg backdrop-blur-xl"
        >
          <motion.span
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    rotate: [0, 12, -8, 0],
                  }
            }
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            🚀
          </motion.span>

          Updated Daily
        </motion.span>

        <motion.h1
          custom={0.15}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 text-4xl font-black tracking-tight drop-shadow-lg sm:text-6xl md:text-8xl"
        >
          <span className="relative inline-block">
            CSBT HUB

            <motion.span
              className="absolute -bottom-3 left-1/2 h-1.5 -translate-x-1/2 rounded-full bg-white/80"
              initial={{
                width: 0,
              }}
              animate={{
                width: "65%",
              }}
              transition={{
                delay: 0.8,
                duration: 0.8,
                ease: "easeOut",
              }}
            />
          </span>
        </motion.h1>

        <motion.p
          custom={0.3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-white/90 sm:text-xl md:text-2xl"
        >
          The fastest way to check{" "}
          <span className="font-black text-white">
            Adopt Me pet values
          </span>
          , compare trades, and avoid bad deals.
        </motion.p>

        <motion.div
          custom={0.45}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-4"
        >
          {featureItems.map((item) => (
            <motion.span
              key={item.label}
              whileHover={{
                y: -4,
                scale: 1.05,
              }}
              whileTap={{
                scale: 0.97,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 18,
              }}
              className="group relative overflow-hidden rounded-full border border-white/20 bg-white/15 px-5 py-3 font-bold shadow-lg backdrop-blur-xl"
            >
              <span className="relative z-10">
                {item.icon} {item.label}
              </span>

              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          custom={0.6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-14 grid gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6"
        >
          {statItems(totalPets).map((item, index) => (
            <motion.div
              key={item.label}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: -10,
                      scale: 1.04,
                      rotate: index % 2 === 0 ? -1 : 1,
                    }
              }
              whileTap={{
                scale: 0.98,
              }}
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 18,
              }}
              className="relative overflow-hidden rounded-3xl border border-white/25 bg-white/15 p-5 shadow-xl backdrop-blur-xl sm:p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />

              <motion.div
                className="relative text-4xl font-black sm:text-5xl"
                animate={
                  shouldReduceMotion || !item.shouldFloat
                    ? undefined
                    : {
                        y: [0, -5, 0],
                      }
                }
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.2,
                }}
              >
                {item.value}
              </motion.div>

              <p className="relative mt-3 font-black text-white">
                {item.label}
              </p>

              <p className="relative mt-1 text-sm text-white/70">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom highlight */}
      <div className="absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </motion.section>
  );
}