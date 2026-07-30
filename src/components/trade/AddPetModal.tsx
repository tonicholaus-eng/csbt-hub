"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import pets from "../../data/pets.json";
import { TradePet } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (pet: TradePet) => void;
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
      <div className="flex h-full w-full flex-col items-center justify-center px-2 text-center">
        <span
          aria-hidden="true"
          className="text-4xl sm:text-5xl"
        >
          🐾
        </span>

        <span className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 sm:text-xs">
          Image coming soon
        </span>

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
      width={96}
      height={96}
      unoptimized
      onError={() => setImageFailed(true)}
      className="h-20 w-20 object-contain drop-shadow-lg transition-transform duration-300 group-hover/card:scale-110 group-hover/card:rotate-3 sm:h-24 sm:w-24"
    />
  );
}

function displayValue(
  value: string | number | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "—";
  }

  return String(value);
}

export default function AddPetModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const shouldReduceMotion =
    useReducedMotion();

  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const previouslyFocusedElement =
    useRef<HTMLElement | null>(null);

  const [search, setSearch] =
    useState("");

  const normalizedSearch = search
    .trim()
    .toLowerCase();

  const filteredPets = useMemo(() => {
    if (!normalizedSearch) {
      return pets;
    }

    return pets.filter((pet) =>
      pet.PETS.toLowerCase().includes(
        normalizedSearch,
      ),
    );
  }, [normalizedSearch]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    previouslyFocusedElement.current =
      document.activeElement instanceof
      HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const focusTimer = window.setTimeout(
      () => {
        searchInputRef.current?.focus();
      },
      shouldReduceMotion ? 0 : 100,
    );

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog =
        document.getElementById(
          "add-pet-dialog",
        );

      if (!dialog) {
        return;
      }

      const focusableElements =
        dialog.querySelectorAll<HTMLElement>(
          [
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "a[href]",
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        );

      if (!focusableElements.length) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement ===
          firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement ===
          lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.clearTimeout(focusTimer);

      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      previouslyFocusedElement.current?.focus();
    };
  }, [open, onClose, shouldReduceMotion]);

  function handleSelect(pet: TradePet) {
    onSelect(pet);
    setSearch("");
  }

  function clearSearch() {
    setSearch("");

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration: shouldReduceMotion
              ? 0
              : 0.2,
          }}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              onClose();
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4 sm:backdrop-blur-md"
        >
          <motion.div
            id="add-pet-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-pet-title"
            aria-describedby="add-pet-description"
            initial={{
              opacity: 0,
              y: shouldReduceMotion
                ? 0
                : 24,
              scale: shouldReduceMotion
                ? 1
                : 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: shouldReduceMotion
                ? 0
                : 18,
              scale: shouldReduceMotion
                ? 1
                : 0.98,
            }}
            transition={{
              duration: shouldReduceMotion
                ? 0
                : 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/40 bg-white/95 shadow-[0_35px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95 sm:h-[88vh] sm:rounded-[36px]"
          >
            {/* Background decoration */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-500/5" />

            <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/5" />

            {/* Header */}
            <div className="relative z-20 shrink-0 border-b border-slate-200/80 bg-white/90 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-3 py-1 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300 sm:px-4 sm:py-1.5">
                    <span aria-hidden="true">
                      🐾
                    </span>

                    Pet Selector
                  </span>

                  <h2
                    id="add-pet-title"
                    className="mt-3 text-2xl font-black leading-tight tracking-tight text-slate-800 dark:text-white sm:text-4xl"
                  >
                    Select a Pet
                  </h2>

                  <p
                    id="add-pet-description"
                    className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base"
                  >
                    {filteredPets.length}{" "}
                    {filteredPets.length === 1
                      ? "pet"
                      : "pets"}{" "}
                    available
                  </p>
                </div>

                <motion.button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 1.08,
                          rotate: 5,
                        }
                  }
                  whileTap={{
                    scale: shouldReduceMotion
                      ? 1
                      : 0.92,
                  }}
                  aria-label="Close pet selector"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-lg font-black text-white shadow-lg outline-none transition-colors duration-300 hover:bg-red-600 focus-visible:ring-4 focus-visible:ring-red-300/50 dark:shadow-red-950/40 dark:focus-visible:ring-red-400/30 sm:h-11 sm:w-11 sm:rounded-2xl"
                >
                  <span aria-hidden="true">
                    ✕
                  </span>
                </motion.button>
              </div>

              {/* Search */}
              <div className="relative mt-4 sm:mt-6">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl sm:left-5 sm:text-2xl">
                  🔍
                </span>

                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search any Adopt Me pet..."
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Search pets"
                  className="w-full rounded-2xl border-2 border-yellow-200 bg-white py-3 pl-12 pr-14 text-sm font-semibold text-slate-800 shadow-inner outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 dark:border-amber-400/20 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-amber-400 dark:focus:ring-amber-400/15 sm:py-4 sm:pl-14 sm:pr-16 sm:text-lg"
                />

                <AnimatePresence>
                  {search && (
                    <motion.button
                      type="button"
                      initial={{
                        opacity: 0,
                        scale: 0.8,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.8,
                      }}
                      onClick={clearSearch}
                      aria-label="Clear pet search"
                      className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-500 outline-none transition-colors hover:bg-red-100 hover:text-red-600 focus-visible:ring-4 focus-visible:ring-yellow-200 dark:bg-white/[0.07] dark:text-slate-400 dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:focus-visible:ring-amber-400/20 sm:right-3 sm:h-10 sm:w-10"
                    >
                      <span aria-hidden="true">
                        ✕
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Results */}
            {filteredPets.length === 0 ? (
              <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 text-center">
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          y: [0, -7, 0],
                          rotate: [
                            -3,
                            3,
                            -3,
                          ],
                        }
                  }
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-6xl sm:text-8xl"
                  aria-hidden="true"
                >
                  🔍
                </motion.div>

                <h3 className="mt-5 text-2xl font-black text-slate-700 dark:text-white sm:mt-6 sm:text-3xl">
                  No Pets Found
                </h3>

                <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400 sm:mt-3 sm:text-base">
                  No pets match “{search}”. Try
                  another spelling or a shorter
                  name.
                </p>

                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-6 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 font-black text-white shadow-lg outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-yellow-300/50 dark:focus-visible:ring-amber-400/30"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="grid grid-cols-2 items-stretch gap-3 p-3 sm:gap-5 sm:p-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredPets.map(
                    (pet, index) => (
                      <motion.button
                        type="button"
                        key={pet.PETS}
                        initial={{
                          opacity: 0,
                          y: shouldReduceMotion
                            ? 0
                            : 14,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          duration:
                            shouldReduceMotion
                              ? 0
                              : 0.25,
                          delay:
                            shouldReduceMotion
                              ? 0
                              : Math.min(
                                  index * 0.015,
                                  0.2,
                                ),
                        }}
                        whileHover={
                          shouldReduceMotion
                            ? undefined
                            : {
                                y: -5,
                                scale: 1.015,
                              }
                        }
                        whileTap={{
                          scale:
                            shouldReduceMotion
                              ? 1
                              : 0.97,
                        }}
                        onClick={() =>
                          handleSelect(
                            pet as TradePet,
                          )
                        }
                        aria-label={`Add ${pet.PETS} to the trade`}
                        className="group/card relative flex min-h-[330px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-md outline-none transition-[background-color,border-color,box-shadow] duration-300 hover:border-yellow-300 hover:shadow-xl focus-visible:border-yellow-400 focus-visible:ring-4 focus-visible:ring-yellow-200/70 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_16px_40px_rgba(0,0,0,.25)] dark:hover:border-amber-400/30 dark:hover:bg-slate-900 dark:focus-visible:border-amber-400 dark:focus-visible:ring-amber-400/20 sm:min-h-[405px] sm:rounded-3xl sm:p-4"
                      >
                        {/* Glow */}
                        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-300/10 opacity-0 blur-3xl transition-opacity duration-300 group-hover/card:opacity-100 dark:bg-amber-500/10" />

                        {/* Shine */}
                        <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 blur-lg transition-all duration-700 group-hover/card:left-[130%] group-hover/card:opacity-100 dark:via-white/10" />

                        {/* Image */}
                        <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-yellow-50 via-white to-orange-100 shadow-inner dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 sm:h-32 sm:rounded-3xl">
                          <PetImage
                            src={pet.IMAGE}
                            name={pet.PETS}
                          />
                        </div>

                        {/* Name */}
                        <h3 className="relative z-10 mt-3 line-clamp-2 min-h-[44px] w-full break-words text-center text-sm font-black leading-snug text-slate-900 dark:text-white sm:mt-5 sm:min-h-[56px] sm:text-lg">
                          {pet.PETS}
                        </h3>

                        {/* Values */}
                        <div className="relative z-10 mt-3 w-full space-y-2 text-[10px] font-bold sm:mt-4 sm:text-xs">
                          <div className="flex items-center justify-between gap-2 rounded-lg bg-yellow-100 px-2 py-2 text-yellow-800 dark:bg-amber-400/10 dark:text-amber-300 sm:rounded-xl sm:px-3">
                            <span>Normal</span>

                            <span className="min-w-0 truncate text-right font-black">
                              {displayValue(
                                pet.NORMAL,
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 rounded-lg bg-cyan-100 px-2 py-2 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300 sm:rounded-xl sm:px-3">
                            <span>Neon</span>

                            <span className="min-w-0 truncate text-right font-black">
                              {displayValue(
                                pet.NEON,
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 rounded-lg bg-pink-100 px-2 py-2 text-pink-800 dark:bg-pink-400/10 dark:text-pink-300 sm:rounded-xl sm:px-3">
                            <span>Mega</span>

                            <span className="min-w-0 truncate text-right font-black">
                              {displayValue(
                                pet.MEGA,
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Add button appearance */}
                        <div className="relative z-10 mt-auto w-full pt-4">
                          <div className="rounded-xl bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 px-2 py-2.5 text-center text-xs font-black text-white shadow-md transition-transform duration-300 group-hover/card:scale-[1.02] sm:rounded-2xl sm:py-3 sm:text-base">
                            + Add Pet
                          </div>
                        </div>
                      </motion.button>
                    ),
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}