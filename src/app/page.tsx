"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import pets from "../data/pets.json";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import SearchBar from "../components/SearchBar";
import Footer from "../components/Footer";
import { NichAssistant } from "../components/nich";
import TradeCalculator from "../components/trade/TradeCalculator";
import PopularPets from "../components/PopularPets";
import Stats from "../components/Stats";
import SearchResults from "../components/SearchResults";
import PetDetails from "../components/PetDetails";

import { searchPets } from "../lib/search";
import { Pet } from "../types/pet";

const desktopSparkles = [
  {
    left: "8%",
    top: "12%",
    symbol: "✦",
    size: "text-xl",
    delay: 0,
  },
  {
    left: "89%",
    top: "20%",
    symbol: "✨",
    size: "text-2xl",
    delay: 1.5,
  },
  {
    left: "12%",
    top: "48%",
    symbol: "✧",
    size: "text-2xl",
    delay: 3,
  },
  {
    left: "86%",
    top: "68%",
    symbol: "✦",
    size: "text-xl",
    delay: 2,
  },
  {
    left: "18%",
    top: "87%",
    symbol: "✨",
    size: "text-2xl",
    delay: 4,
  },
  {
    left: "79%",
    top: "93%",
    symbol: "✧",
    size: "text-xl",
    delay: 1,
  },
];

export default function Home() {
  const shouldReduceMotion = useReducedMotion();

  const [search, setSearch] = useState("");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(
    null,
  );

  const normalizedSearch = search.trim();
  const isSearching = normalizedSearch.length > 0;
  const results = isSearching ? searchPets(search) : [];

  return (
    <motion.main
      className="relative min-h-screen overflow-x-hidden bg-[#fff8e9]"
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.45,
      }}
    >
  

      {/* Lightweight base background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#f1fbff_15%,#fff9e8_38%,#fff3dc_62%,#fdf0ff_82%,#eef9ff_100%)]" />

      {/* Static atmospheric lighting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.98),rgba(255,248,214,.38)_42%,transparent_72%)]" />

      <div className="pointer-events-none absolute -left-40 top-24 h-[420px] w-[420px] rounded-full bg-yellow-200/25 blur-[90px] sm:h-[560px] sm:w-[560px]" />

      <div className="pointer-events-none absolute -right-44 top-[520px] h-[440px] w-[440px] rounded-full bg-orange-200/20 blur-[95px] sm:h-[600px] sm:w-[600px]" />

      <div className="pointer-events-none absolute left-1/2 top-[1500px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-200/15 blur-[105px] sm:h-[700px] sm:w-[700px]" />

      <div className="pointer-events-none absolute -left-44 top-[2500px] h-[480px] w-[480px] rounded-full bg-pink-200/15 blur-[100px] sm:h-[650px] sm:w-[650px]" />

      {/* Lightweight texture */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.65)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] bg-[size:80px_80px] opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      {/* Subtle static color ribbons */}
      <div className="pointer-events-none absolute -left-[20%] top-[720px] h-64 w-[140%] rotate-[-5deg] rounded-[50%] bg-gradient-to-r from-cyan-100/10 via-yellow-100/25 to-pink-100/10 blur-[60px]" />

      <div className="pointer-events-none absolute -left-[20%] top-[2050px] h-72 w-[140%] rotate-[4deg] rounded-[50%] bg-gradient-to-r from-violet-100/10 via-cyan-100/20 to-orange-100/10 blur-[70px]" />

      {/* Desktop-only animated decoration */}
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
        <motion.div
          className="absolute -left-20 top-28 opacity-[0.16]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [-20, 55, -20],
                  y: [0, -10, 0],
                }
          }
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-[100px] leading-none">☁️</span>
        </motion.div>

        <motion.div
          className="absolute -right-16 top-[850px] opacity-[0.13]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [35, -55, 35],
                  y: [0, 12, 0],
                }
          }
          transition={{
            duration: 34,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-[120px] leading-none">☁️</span>
        </motion.div>

        <motion.div
          className="absolute left-[14%] top-[2350px] opacity-[0.11]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [-40, 65, -40],
                }
          }
          transition={{
            duration: 38,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-[110px] leading-none">☁️</span>
        </motion.div>

        {desktopSparkles.map((sparkle, index) => (
          <motion.div
            key={`${sparkle.left}-${sparkle.top}`}
            className={`absolute ${sparkle.size} font-black text-yellow-400/65 drop-shadow-[0_0_8px_rgba(250,204,21,.35)]`}
            style={{
              left: sparkle.left,
              top: sparkle.top,
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    y: [0, -12, 0],
                    scale: [0.85, 1.15, 0.85],
                    opacity: [0.3, 0.8, 0.3],
                  }
            }
            transition={{
              duration: 7 + index,
              delay: sparkle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {sparkle.symbol}
          </motion.div>
        ))}

        <motion.div
          className="absolute left-[5%] top-[38%] rotate-12 text-6xl text-slate-700/[0.045]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -14, 0],
                  rotate: [12, 18, 12],
                }
          }
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🐾
        </motion.div>

        <motion.div
          className="absolute right-[6%] top-[74%] -rotate-12 text-6xl text-slate-700/[0.045]"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, 14, 0],
                  rotate: [-12, -18, -12],
                }
          }
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🐾
        </motion.div>
      </div>

      {/* Soft edge shading */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-sky-100/20 to-transparent lg:block" />

      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-24 bg-gradient-to-l from-pink-100/20 to-transparent lg:block" />

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[500px] bg-gradient-to-t from-sky-100/65 via-violet-50/20 to-transparent" />

      {/* Main content */}
      <div className="relative z-10 min-w-0">
        <Navbar />

        <div className="mx-auto w-full max-w-7xl px-3 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-32">
          <Hero totalPets={pets.length} />

          {/* Search bar */}
          <motion.div
            className="mt-10 sm:mt-12"
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: shouldReduceMotion ? 0 : 0.2,
              duration: shouldReduceMotion ? 0 : 0.45,
              ease: "easeOut",
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

          {/* Search results or selected pet */}
          {(isSearching || selectedPet) && (
            <motion.section
              className="relative mt-8 min-w-0 sm:mt-10"
              initial={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.4,
                ease: "easeOut",
              }}
            >
              <div className="pointer-events-none absolute -inset-10 -z-10 hidden rounded-full bg-gradient-to-br from-yellow-100/10 via-pink-100/10 to-violet-100/10 blur-2xl sm:block" />

              {selectedPet ? (
                <PetDetails
                  pet={selectedPet}
                  onBack={() => {
                    setSelectedPet(null);
                    setSearch("");
                  }}
                />
              ) : (
                <SearchResults
                  pets={results}
                  onSelect={(pet) => {
                    setSelectedPet(pet);
                    setSearch(pet.PETS);
                  }}
                />
              )}
            </motion.section>
          )}

          {/* Trade calculator */}
          <motion.section
            className={`relative min-w-0 ${
              isSearching || selectedPet
                ? "mt-16 sm:mt-20"
                : "mt-14 sm:mt-20"
            }`}
            initial={{
              opacity: 0,
              y: shouldReduceMotion ? 0 : 28,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.08,
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.5,
              ease: "easeOut",
            }}
          >
            <div className="pointer-events-none absolute -inset-10 -z-10 hidden rounded-full bg-gradient-to-r from-cyan-100/10 via-white/15 to-yellow-100/10 blur-2xl sm:block" />

            <TradeCalculator />
          </motion.section>

          {/* Popular pets */}
          <motion.section
            className="relative mt-16 min-w-0 sm:mt-24"
            initial={{
              opacity: 0,
              y: shouldReduceMotion ? 0 : 28,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.08,
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.5,
              ease: "easeOut",
            }}
          >
            <div className="pointer-events-none absolute -inset-12 -z-10 hidden rounded-full bg-gradient-to-br from-yellow-100/10 via-pink-100/10 to-violet-100/10 blur-2xl sm:block" />

            <PopularPets
              onSelect={(pet) => {
                setSelectedPet(pet);
                setSearch(pet.PETS);

                window.requestAnimationFrame(() => {
                  window.scrollTo({
                    top: 0,
                    behavior: shouldReduceMotion
                      ? "auto"
                      : "smooth",
                  });
                });
              }}
            />
          </motion.section>

          {/* Stats */}
          <motion.section
            className="relative mt-20 min-w-0 sm:mt-28"
            initial={{
              opacity: 0,
              y: shouldReduceMotion ? 0 : 28,
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
              duration: shouldReduceMotion ? 0 : 0.5,
              ease: "easeOut",
            }}
          >
            <div className="pointer-events-none absolute -inset-12 -z-10 hidden rounded-full bg-gradient-to-r from-orange-100/10 via-white/15 to-cyan-100/10 blur-2xl sm:block" />

            <Stats totalPets={pets.length} />
          </motion.section>
        </div>

        <Footer />
      </div>

      <NichAssistant />
    </motion.main>
  );
}