"use client";

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

const sparkleDots = [
  {
    left: "18%",
    top: "20%",
    delay: 0,
    size: "h-2.5 w-2.5",
  },
  {
    left: "28%",
    top: "72%",
    delay: 1.2,
    size: "h-2 w-2",
  },
  {
    left: "78%",
    top: "28%",
    delay: 0.6,
    size: "h-2.5 w-2.5",
  },
  {
    left: "86%",
    top: "58%",
    delay: 1.8,
    size: "h-2 w-2",
  },
];

function SparkleCross({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative ${className ?? ""}`}
    >
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rounded-full bg-white/60" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 rounded-full bg-white/60" />
    </div>
  );
}

export default function Hero({
  totalPets,
}: HeroProps) {
  const shouldReduceMotion =
    useReducedMotion();

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

  const rotateX = useTransform(
    smoothMouseY,
    [-0.5, 0.5],
    [2.5, -2.5],
  );
  const rotateY = useTransform(
    smoothMouseX,
    [-0.5, 0.5],
    [-2.5, 2.5],
  );

  const leftDecorX = useTransform(
    smoothMouseX,
    [-0.5, 0.5],
    [-12, 12],
  );
  const leftDecorY = useTransform(
    smoothMouseY,
    [-0.5, 0.5],
    [-10, 10],
  );

  const rightDecorX = useTransform(
    smoothMouseX,
    [-0.5, 0.5],
    [14, -14],
  );
  const rightDecorY = useTransform(
    smoothMouseY,
    [-0.5, 0.5],
    [10, -10],
  );

  const bottomLeftX = useTransform(
    smoothMouseX,
    [-0.5, 0.5],
    [-10, 10],
  );
  const bottomLeftY = useTransform(
    smoothMouseY,
    [-0.5, 0.5],
    [8, -8],
  );

  const bottomRightX = useTransform(
    smoothMouseX,
    [-0.5, 0.5],
    [10, -10],
  );
  const bottomRightY = useTransform(
    smoothMouseY,
    [-0.5, 0.5],
    [-8, 8],
  );

  function handleMouseMove(
    event: MouseEvent<HTMLElement>,
  ) {
    if (shouldReduceMotion) return;

    const bounds =
      event.currentTarget.getBoundingClientRect();
    const x =
      (event.clientX - bounds.left) /
        bounds.width -
      0.5;
    const y =
      (event.clientY - bounds.top) /
        bounds.height -
      0.5;

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

      {/* New clean decorative design */}
      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: leftDecorX,
                y: leftDecorY,
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                rotate: [-6, -2, -6],
              }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute left-6 top-6 hidden lg:block"
      >
        <div className="relative h-28 w-24 rotate-[-8deg] rounded-[24px] border border-white/25 bg-white/12 shadow-[0_18px_50px_rgba(120,53,15,.18)] backdrop-blur-md">
          <div className="absolute inset-3 rounded-[18px] border border-white/15" />
          <div className="absolute left-5 top-5 h-3 w-3 rounded-full bg-white/75" />
          <div className="absolute left-10 top-5 h-3 w-3 rounded-full bg-white/45" />
          <div className="absolute left-15 top-5 h-3 w-3 rounded-full bg-white/25" />
          <div className="absolute left-5 top-12 h-1.5 w-12 rounded-full bg-white/45" />
          <div className="absolute left-5 top-17 h-1.5 w-8 rounded-full bg-white/35" />
          <div className="absolute bottom-5 left-5 h-10 w-10 rounded-2xl bg-gradient-to-br from-white/50 to-white/10" />
        </div>
      </motion.div>

      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: rightDecorX,
                y: rightDecorY,
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                rotate: [0, 6, 0],
              }
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute right-7 top-7 hidden lg:block"
      >
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full border border-white/20 bg-white/8 backdrop-blur-sm" />
          <div className="absolute inset-[10px] rounded-full border border-white/20" />
          <div className="absolute inset-[22px] rounded-full bg-white/12 shadow-[0_15px_35px_rgba(120,53,15,.18)]" />
          <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/75" />
        </div>
      </motion.div>

      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: bottomLeftX,
                y: bottomLeftY,
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                rotate: [0, -3, 0],
              }
        }
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute bottom-7 left-7 hidden lg:block"
      >
        <div className="relative h-28 w-36">
          <div className="absolute bottom-2 left-1 h-14 w-14 rounded-full border border-white/20 bg-white/10 shadow-xl backdrop-blur-md" />
          <div className="absolute bottom-12 left-12 h-7 w-7 rounded-full border border-white/20 bg-white/12 shadow-lg backdrop-blur-md" />
          <div className="absolute bottom-0 left-20 h-5 w-5 rounded-full border border-white/20 bg-white/15 shadow-md backdrop-blur-md" />
          <div className="absolute right-2 top-4 h-16 w-18 rounded-[20px] border border-white/20 bg-white/10 shadow-xl backdrop-blur-md">
            <div className="absolute left-4 top-5 h-6 w-1 rounded-full bg-white/35" />
            <div className="absolute left-8 top-2 h-9 w-1 rounded-full bg-white/55" />
            <div className="absolute left-12 top-7 h-4 w-1 rounded-full bg-white/28" />
          </div>
        </div>
      </motion.div>

      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                x: bottomRightX,
                y: bottomRightY,
              }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : {
                rotate: [4, 1, 4],
              }
        }
        transition={{
          duration: 7.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute bottom-7 right-8 hidden lg:block"
      >
        <div className="relative h-28 w-36">
          <div className="absolute bottom-0 right-0 h-16 w-16 rotate-6 rounded-[22px] border border-white/20 bg-white/10 shadow-xl backdrop-blur-md" />
          <div className="absolute bottom-4 right-9 h-18 w-18 -rotate-6 rounded-[24px] border border-white/25 bg-white/14 shadow-2xl backdrop-blur-md" />
          <div className="absolute left-6 top-2 h-3 w-3 rounded-full bg-white/70" />
          <div className="absolute left-12 top-7 h-2.5 w-2.5 rounded-full bg-white/45" />
          <div className="absolute left-2 top-10 h-1.5 w-10 rounded-full bg-white/35" />
        </div>
      </motion.div>

      {/* Sparkles */}
      {sparkleDots.map((sparkle) => (
        <motion.div
          key={`${sparkle.left}-${sparkle.top}`}
          className="pointer-events-none absolute"
          style={{
            left: sparkle.left,
            top: sparkle.top,
          }}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  opacity: [0.25, 0.95, 0.25],
                  scale: [0.8, 1.2, 0.8],
                  rotate: [0, 180, 360],
                }
          }
          transition={{
            duration: 4.4,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <SparkleCross
            className={`${sparkle.size} opacity-80`}
          />
        </motion.div>
      ))}

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
          {statItems(totalPets).map(
            (item, index) => (
              <motion.div
                key={item.label}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -10,
                        scale: 1.04,
                        rotate:
                          index % 2 === 0
                            ? -1
                            : 1,
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
                    shouldReduceMotion ||
                    !item.shouldFloat
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
            ),
          )}
        </motion.div>
      </div>

      {/* Bottom highlight */}
      <div className="absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </motion.section>
  );
}