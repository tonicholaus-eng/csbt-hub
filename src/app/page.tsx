"use client";

import { MouseEvent, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import pets from "../data/pets.json";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import SearchBar from "../components/SearchBar";
import Footer from "../components/Footer";
import TradeCalculator from "../components/trade/TradeCalculator";
import PopularPets from "../components/PopularPets";
import Stats from "../components/Stats";
import SearchResults from "../components/SearchResults";
import PetDetails from "../components/PetDetails";

import { searchPets } from "../lib/search";
import { Pet } from "../types/pet";

const floatingParticles = [
  {
    left: "5%",
    top: "8%",
    size: "text-2xl",
    delay: 0,
    duration: 7,
    symbol: "✦",
  },
  {
    left: "17%",
    top: "18%",
    size: "text-3xl",
    delay: 1.2,
    duration: 9,
    symbol: "✨",
  },
  {
    left: "91%",
    top: "13%",
    size: "text-xl",
    delay: 2.3,
    duration: 8,
    symbol: "✧",
  },
  {
    left: "82%",
    top: "26%",
    size: "text-3xl",
    delay: 3.5,
    duration: 10,
    symbol: "⭐",
  },
  {
    left: "7%",
    top: "34%",
    size: "text-xl",
    delay: 0.8,
    duration: 8,
    symbol: "✦",
  },
  {
    left: "24%",
    top: "43%",
    size: "text-2xl",
    delay: 4.2,
    duration: 11,
    symbol: "✨",
  },
  {
    left: "76%",
    top: "49%",
    size: "text-xl",
    delay: 2.8,
    duration: 9,
    symbol: "✧",
  },
  {
    left: "94%",
    top: "59%",
    size: "text-3xl",
    delay: 5.4,
    duration: 12,
    symbol: "⭐",
  },
  {
    left: "10%",
    top: "66%",
    size: "text-2xl",
    delay: 3.1,
    duration: 10,
    symbol: "✨",
  },
  {
    left: "31%",
    top: "74%",
    size: "text-xl",
    delay: 6.2,
    duration: 8,
    symbol: "✦",
  },
  {
    left: "71%",
    top: "80%",
    size: "text-3xl",
    delay: 1.8,
    duration: 11,
    symbol: "✧",
  },
  {
    left: "89%",
    top: "90%",
    size: "text-2xl",
    delay: 4.8,
    duration: 9,
    symbol: "✨",
  },
];

const glassOrbs = [
  {
    left: "3%",
    top: "24%",
    size: "h-20 w-20",
    delay: 0,
    duration: 13,
  },
  {
    left: "88%",
    top: "38%",
    size: "h-28 w-28",
    delay: 2,
    duration: 17,
  },
  {
    left: "12%",
    top: "56%",
    size: "h-16 w-16",
    delay: 4,
    duration: 14,
  },
  {
    left: "78%",
    top: "70%",
    size: "h-24 w-24",
    delay: 1,
    duration: 16,
  },
  {
    left: "38%",
    top: "87%",
    size: "h-14 w-14",
    delay: 5,
    duration: 12,
  },
];

const pawPrints = [
  {
    left: "5%",
    top: "18%",
    rotate: -18,
    size: "text-5xl",
    delay: 0,
  },
  {
    left: "91%",
    top: "31%",
    rotate: 22,
    size: "text-6xl",
    delay: 2,
  },
  {
    left: "8%",
    top: "52%",
    rotate: 14,
    size: "text-6xl",
    delay: 4,
  },
  {
    left: "88%",
    top: "66%",
    rotate: -24,
    size: "text-5xl",
    delay: 1,
  },
  {
    left: "18%",
    top: "81%",
    rotate: -8,
    size: "text-6xl",
    delay: 3,
  },
  {
    left: "82%",
    top: "92%",
    rotate: 18,
    size: "text-5xl",
    delay: 5,
  },
];

export default function Home() {
  const shouldReduceMotion = useReducedMotion();

  const [search, setSearch] = useState("");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const cursorX = useMotionValue(50);
  const cursorY = useMotionValue(18);

  const smoothCursorX = useSpring(cursorX, {
    stiffness: 70,
    damping: 22,
    mass: 0.8,
  });

  const smoothCursorY = useSpring(cursorY, {
    stiffness: 70,
    damping: 22,
    mass: 0.8,
  });

  const cursorBackground = useTransform(
    [smoothCursorX, smoothCursorY],
    ([x, y]) =>
      `radial-gradient(600px circle at ${x}% ${y}%, rgba(255,255,255,.48), rgba(253,224,71,.12) 32%, transparent 68%)`,
  );

  const results = searchPets(search);

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (shouldReduceMotion) return;

    const bounds = event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) *
      100;

    const y =
      ((event.clientY - bounds.top) / Math.max(bounds.height, 1)) *
      100;

    cursorX.set(x);
    cursorY.set(y);
  }

  return (
    <motion.main
      onMouseMove={handleMouseMove}
      className="relative min-h-screen overflow-hidden bg-[#fff8e9]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
    >
      {/* Base sky gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#dff6ff_0%,#edf9ff_12%,#fff8df_34%,#fff2d7_57%,#fbeeff_78%,#eaf7ff_100%)]" />

      {/* Mouse-following light */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: cursorBackground,
        }}
      />

      {/* Premium animated world background */}
      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        {/* Fine grain */}
        <div
          className="absolute inset-0 opacity-[0.055] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.7'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Grid texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] bg-[size:64px_64px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

        {/* Dot texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.7)_1.2px,transparent_1.2px)] bg-[size:28px_28px] opacity-20" />

        {/* Top atmospheric light */}
        <div className="absolute inset-x-0 top-0 h-[850px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,1),rgba(255,255,255,.2)_42%,transparent_72%)]" />

        {/* Sun glow */}
        <motion.div
          className="absolute left-1/2 top-[-260px] h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.98)_0%,rgba(254,240,138,.5)_30%,rgba(251,191,36,.15)_55%,transparent_72%)] blur-2xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  scale: [1, 1.08, 1],
                  opacity: [0.82, 1, 0.82],
                }
          }
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Light rays */}
        <motion.div
          className="absolute -top-40 left-[7%] h-[1000px] w-52 origin-top -rotate-[18deg] bg-gradient-to-b from-white/50 via-yellow-100/15 to-transparent blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  rotate: [-20, -13, -20],
                  opacity: [0.18, 0.38, 0.18],
                }
          }
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -top-40 right-[5%] h-[1100px] w-64 origin-top rotate-[20deg] bg-gradient-to-b from-white/45 via-orange-100/15 to-transparent blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  rotate: [18, 25, 18],
                  opacity: [0.15, 0.34, 0.15],
                }
          }
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Aurora ribbons */}
        <motion.div
          className="absolute -left-[15%] top-[420px] h-[340px] w-[130%] rotate-[-7deg] rounded-[50%] bg-gradient-to-r from-cyan-200/10 via-yellow-200/30 to-pink-200/15 blur-[80px]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: ["-4%", "4%", "-4%"],
                  y: [0, -35, 0],
                  rotate: [-7, -3, -7],
                }
          }
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -left-[20%] top-[1500px] h-[440px] w-[140%] rotate-[5deg] rounded-[50%] bg-gradient-to-r from-violet-200/15 via-cyan-200/20 to-yellow-200/15 blur-[100px]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: ["4%", "-5%", "4%"],
                  y: [0, 55, 0],
                  rotate: [5, 1, 5],
                }
          }
          transition={{
            duration: 26,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -left-[20%] top-[2750px] h-[480px] w-[145%] rotate-[-5deg] rounded-[50%] bg-gradient-to-r from-pink-200/15 via-orange-100/25 to-blue-200/15 blur-[110px]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: ["-3%", "5%", "-3%"],
                  y: [0, -45, 0],
                  rotate: [-5, -1, -5],
                }
          }
          transition={{
            duration: 29,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Large glow fields */}
        <motion.div
          className="absolute -left-72 -top-52 h-[850px] w-[850px] rounded-full bg-yellow-300/30 blur-[180px]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 100, 30, 0],
                  y: [0, 55, 120, 0],
                  scale: [1, 1.14, 0.96, 1],
                }
          }
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -right-80 top-[260px] h-[820px] w-[820px] rounded-full bg-orange-300/25 blur-[190px]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, -110, -30, 0],
                  y: [0, 90, -15, 0],
                  scale: [1, 0.94, 1.16, 1],
                }
          }
          transition={{
            duration: 27,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute left-1/2 top-[1050px] h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-300/20 blur-[220px]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: ["-50%", "-42%", "-58%", "-50%"],
                  y: [0, -95, 70, 0],
                  scale: [1, 1.16, 0.93, 1],
                }
          }
          transition={{
            duration: 31,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -left-56 top-[1900px] h-[780px] w-[780px] rounded-full bg-pink-300/20 blur-[210px]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 150, 45, 0],
                  y: [0, -90, 50, 0],
                  scale: [1, 1.12, 0.95, 1],
                }
          }
          transition={{
            duration: 29,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute -right-60 top-[2650px] h-[780px] w-[780px] rounded-full bg-violet-300/20 blur-[220px]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, -120, -40, 0],
                  y: [0, 75, -45, 0],
                  scale: [1, 0.94, 1.14, 1],
                }
          }
          transition={{
            duration: 32,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Cloud layer one */}
        <motion.div
          className="absolute -left-20 top-28 opacity-[0.24]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [-30, 85, -30],
                  y: [0, -16, 0],
                }
          }
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="flex items-center">
            <span className="text-[110px] leading-none">☁️</span>
            <span className="-ml-10 mt-9 text-[72px] leading-none">
              ☁️
            </span>
          </div>
        </motion.div>

        <motion.div
          className="absolute -right-16 top-[460px] opacity-[0.2]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [45, -90, 45],
                  y: [0, 18, 0],
                }
          }
          transition={{
            duration: 29,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="flex items-center">
            <span className="text-[80px] leading-none">☁️</span>
            <span className="-ml-8 mt-6 text-[120px] leading-none">
              ☁️
            </span>
          </div>
        </motion.div>

        {/* Cloud layer two */}
        <motion.div
          className="absolute left-[8%] top-[1250px] opacity-[0.15]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [-70, 110, -70],
                  y: [0, -24, 0],
                }
          }
          transition={{
            duration: 33,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="flex items-center">
            <span className="text-[125px] leading-none">☁️</span>
            <span className="-ml-12 mt-10 text-[82px] leading-none">
              ☁️
            </span>
          </div>
        </motion.div>

        <motion.div
          className="absolute right-[4%] top-[2180px] opacity-[0.15]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [70, -120, 70],
                  y: [0, 24, 0],
                }
          }
          transition={{
            duration: 36,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="flex items-center">
            <span className="text-[90px] leading-none">☁️</span>
            <span className="-ml-10 mt-8 text-[130px] leading-none">
              ☁️
            </span>
          </div>
        </motion.div>

        <motion.div
          className="absolute left-[18%] top-[3100px] opacity-[0.13]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [-100, 120, -100],
                  y: [0, -18, 0],
                }
          }
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-[135px] leading-none">☁️</span>
        </motion.div>

        {/* Glass bubbles */}
        {glassOrbs.map((orb, index) => (
          <motion.div
            key={`${orb.left}-${orb.top}`}
            className={`absolute ${orb.size} rounded-full border border-white/45 bg-gradient-to-br from-white/40 via-white/15 to-transparent shadow-[inset_10px_10px_22px_rgba(255,255,255,.35),0_18px_45px_rgba(96,165,250,.08)] backdrop-blur-sm`}
            style={{
              left: orb.left,
              top: orb.top,
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    y: [0, -32 - index * 4, 0],
                    x: [0, index % 2 === 0 ? 18 : -18, 0],
                    scale: [1, 1.08, 1],
                    rotate: [0, index % 2 === 0 ? 12 : -12, 0],
                  }
            }
            transition={{
              duration: orb.duration,
              delay: orb.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="absolute left-[18%] top-[16%] h-[22%] w-[34%] rotate-[-28deg] rounded-full bg-white/60 blur-sm" />
          </motion.div>
        ))}

        {/* Floating sparkles */}
        {floatingParticles.map((particle, index) => (
          <motion.div
            key={`${particle.left}-${particle.top}`}
            className={`absolute ${particle.size} font-black text-yellow-400/75 drop-shadow-[0_0_12px_rgba(250,204,21,.5)]`}
            style={{
              left: particle.left,
              top: particle.top,
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    y: [0, -18 - index * 1.5, 0],
                    x: [0, index % 2 === 0 ? 8 : -8, 0],
                    rotate: [0, 180, 360],
                    scale: [0.7, 1.28, 0.7],
                    opacity: [0.2, 0.95, 0.2],
                  }
            }
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {particle.symbol}
          </motion.div>
        ))}

        {/* Faint paw pattern */}
        {pawPrints.map((paw, index) => (
          <motion.div
            key={`${paw.left}-${paw.top}`}
            className={`absolute ${paw.size} text-slate-700/[0.055]`}
            style={{
              left: paw.left,
              top: paw.top,
              rotate: paw.rotate,
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    y: [0, index % 2 === 0 ? -20 : 20, 0],
                    rotate: [
                      paw.rotate,
                      paw.rotate + (index % 2 === 0 ? 10 : -10),
                      paw.rotate,
                    ],
                  }
            }
            transition={{
              duration: 11 + index,
              delay: paw.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            🐾
          </motion.div>
        ))}

        {/* Horizon glow separators */}
        <div className="absolute inset-x-[-10%] top-[900px] h-px bg-gradient-to-r from-transparent via-white/70 to-transparent blur-sm" />

        <div className="absolute inset-x-[-10%] top-[1850px] h-px bg-gradient-to-r from-transparent via-white/60 to-transparent blur-sm" />

        <div className="absolute inset-x-[-10%] top-[2850px] h-px bg-gradient-to-r from-transparent via-white/50 to-transparent blur-sm" />

        {/* Edge vignettes */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-sky-100/30 to-transparent" />

        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-pink-100/25 to-transparent" />

        {/* Bottom atmospheric fade */}
        <div className="absolute inset-x-0 bottom-0 h-[720px] bg-gradient-to-t from-sky-100/80 via-violet-50/35 to-transparent" />
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6">
          <Hero totalPets={pets.length} />

          <motion.div
            className="mt-12"
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.35,
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <SearchBar
              search={search}
              onChange={(value) => {
                setSearch(value);
                setSelectedPet(null);
              }}
            />
          </motion.div>

          <motion.section
            className="relative mt-20"
            initial={{
              opacity: 0,
              y: 45,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.1,
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="pointer-events-none absolute -inset-20 -z-10 rounded-full bg-gradient-to-r from-cyan-200/10 via-white/20 to-yellow-200/10 blur-3xl" />

            <TradeCalculator />
          </motion.section>

          <motion.section
            className="relative mt-24"
            initial={{
              opacity: 0,
              y: 45,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.1,
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="pointer-events-none absolute -inset-24 -z-10 rounded-full bg-gradient-to-br from-yellow-200/10 via-pink-200/15 to-violet-200/10 blur-3xl" />

            {!selectedPet ? (
              <>
                <SearchResults
                  pets={results}
                  onSelect={(pet) => {
                    setSelectedPet(pet);
                    setSearch(pet.PETS);
                  }}
                />

                <div className="mt-24">
                  <PopularPets
                    onSelect={(pet) => {
                      setSelectedPet(pet);
                      setSearch(pet.PETS);
                    }}
                  />
                </div>
              </>
            ) : (
              <PetDetails
                pet={selectedPet}
                onBack={() => {
                  setSelectedPet(null);
                  setSearch("");
                }}
              />
            )}
          </motion.section>

          <motion.section
            className="relative mt-28"
            initial={{
              opacity: 0,
              y: 45,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.15,
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="pointer-events-none absolute -inset-24 -z-10 rounded-full bg-gradient-to-r from-orange-200/10 via-white/20 to-cyan-200/10 blur-3xl" />

            <Stats totalPets={pets.length} />
          </motion.section>
        </div>

        <Footer />
      </div>
    </motion.main>
  );
}