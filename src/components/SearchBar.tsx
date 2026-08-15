"use client";

import Image from "next/image";
import {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
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
import { searchItems } from "../lib/search";
import type { ItemCategory } from "./trade/types";
import { getItemCategoryDetails } from "../lib/itemCategory";

type SearchBarProps = {
  search: string;
  onChange: (value: string) => void;
};

type SuggestionImageProps = {
  src?: string;
  name: string;
  category: ItemCategory;
  selected: boolean;
};

const quickSearches = [
  { emoji: "🔥", name: "Frost Dragon" },
  { emoji: "🦉", name: "Owl" },
  { emoji: "🐉", name: "Shadow Dragon" },
  { emoji: "🦇", name: "Bat Dragon" },
];

function SuggestionImage({
  src,
  name,
  category,
  selected,
}: SuggestionImageProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setImageFailed(false));
  }, [src]);

  return (
    <div
      className={`
        relative
        flex
        h-12
        w-12
        shrink-0
        items-center
        justify-center
        overflow-hidden
        rounded-2xl
        border
        shadow-sm
        ${
          selected
            ? "border-yellow-200 bg-white dark:border-amber-400/40 dark:bg-slate-800"
            : "border-gray-100 bg-gradient-to-br from-white to-yellow-50 dark:border-white/10 dark:from-slate-800 dark:to-slate-900"
        }
      `}
    >
      {!src || imageFailed ? (
        <span
          aria-hidden="true"
          className="text-2xl"
        >
          {getItemCategoryDetails(category).icon}
        </span>
      ) : (
        <Image
          src={src}
          alt={name}
          width={48}
          height={48}
          unoptimized
          onError={() => setImageFailed(true)}
          className="h-11 w-11 object-contain p-1 transition-transform duration-200 group-hover:scale-110"
        />
      )}
    </div>
  );
}

function HighlightedName({
  name,
  query,
}: {
  name: string;
  query: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return <>{name}</>;
  }

  const exactIndex = name
    .toLowerCase()
    .indexOf(normalizedQuery);

  if (exactIndex !== -1) {
    const beforeMatch = name.slice(0, exactIndex);

    const match = name.slice(
      exactIndex,
      exactIndex + normalizedQuery.length,
    );

    const afterMatch = name.slice(
      exactIndex + normalizedQuery.length,
    );

    return (
      <>
        {beforeMatch}

        <span className="rounded-md bg-yellow-200/80 px-0.5 text-yellow-800 dark:bg-amber-400/20 dark:text-amber-300">
          {match}
        </span>

        {afterMatch}
      </>
    );
  }

  const words = name.split(" ");
  const queryFirstCharacter =
    normalizedQuery.charAt(0);

  return (
    <>
      {words.map((word, index) => {
        const shouldHighlight =
          queryFirstCharacter &&
          word
            .toLowerCase()
            .startsWith(queryFirstCharacter);

        return (
          <span key={`${word}-${index}`}>
            {index > 0 ? " " : ""}

            {shouldHighlight ? (
              <span className="rounded-md bg-yellow-200/80 px-0.5 text-yellow-800 dark:bg-amber-400/20 dark:text-amber-300">
                {word}
              </span>
            ) : (
              word
            )}
          </span>
        );
      })}
    </>
  );
}

export default function SearchBar({
  search,
  onChange,
}: SearchBarProps) {
  const shouldReduceMotion = useReducedMotion();

  const searchContainerRef =
    useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const [isFocused, setIsFocused] =
    useState(false);

  const [selectedIndex, setSelectedIndex] =
    useState(-1);

  const suggestions = useMemo(() => {
    if (!search.trim()) {
      return [];
    }

    return searchItems(search).slice(0, 6);
  }, [search]);

  const isDropdownOpen =
    isFocused && search.trim().length > 0;

  useEffect(() => {
    queueMicrotask(() => setSelectedIndex(-1));
  }, [search]);

  useEffect(() => {
    function handleClickOutside(
      event: globalThis.MouseEvent,
    ) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsFocused(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  function selectSuggestion(name: string) {
    onChange(name);
    setIsFocused(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Escape") {
      setIsFocused(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();

      return;
    }

    if (!suggestions.length) {
      if (event.key === "Enter") {
        setIsFocused(false);
        inputRef.current?.blur();
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsFocused(true);

      setSelectedIndex((currentIndex) => {
        if (
          currentIndex >=
          suggestions.length - 1
        ) {
          return 0;
        }

        return currentIndex + 1;
      });

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsFocused(true);

      setSelectedIndex((currentIndex) => {
        if (currentIndex <= 0) {
          return suggestions.length - 1;
        }

        return currentIndex - 1;
      });

      return;
    }

    if (event.key === "Enter") {
      if (selectedIndex >= 0) {
        event.preventDefault();

        const selectedPet =
          suggestions[selectedIndex];

        if (selectedPet) {
          selectSuggestion(selectedPet.NAME);
        }
      } else if (suggestions[0]) {
        event.preventDefault();

        selectSuggestion(
          suggestions[0].NAME,
        );
      }
    }
  }

  function handleClear(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();

    onChange("");
    setSelectedIndex(-1);
    setIsFocused(true);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <div
      ref={searchContainerRef}
      className="relative z-30 mx-auto -mt-10 max-w-5xl px-4"
    >
      {/* Glow */}
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                opacity: isFocused
                  ? [0.45, 0.8, 0.45]
                  : 0.45,
                scale: isFocused
                  ? [1, 1.03, 1]
                  : 1,
              }
        }
        transition={{
          duration: 3,
          repeat: isFocused ? Infinity : 0,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-[36px] bg-gradient-to-r from-yellow-300/40 via-orange-300/35 to-pink-300/30 blur-3xl dark:from-amber-500/20 dark:via-orange-500/15 dark:to-violet-500/15"
      />

      {/* Search box */}
      <motion.div
        animate={{
          y: isFocused ? -2 : 0,
          scale: isFocused ? 1.005 : 1,
        }}
        transition={{
          duration: 0.25,
          ease: "easeOut",
        }}
        className="relative overflow-visible rounded-[36px] border border-white/60 bg-white/75 p-3 shadow-[0_25px_70px_rgba(251,146,60,.18)] backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_25px_70px_rgba(0,0,0,.35)]"
      >
        {/* Top highlight */}
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/30" />

        <div className="relative">
          <motion.div
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    rotate: isFocused
                      ? [0, -8, 8, 0]
                      : 0,
                    scale: isFocused
                      ? [1, 1.15, 1]
                      : 1,
                  }
            }
            transition={{
              duration: 0.6,
            }}
            className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-2xl sm:left-6 sm:text-3xl"
          >
            🔍
          </motion.div>

          <input
            ref={inputRef}
            type="text"
            value={search}
            placeholder="Search any Trading item..."
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-label="Search Trading items and pet wear"
            aria-expanded={isDropdownOpen}
            aria-controls="item-search-suggestions"
            aria-activedescendant={
              selectedIndex >= 0
                ? `item-suggestion-${selectedIndex}`
                : undefined
            }
            onFocus={() => setIsFocused(true)}
            onChange={(event) => {
              onChange(event.target.value);
              setIsFocused(true);
            }}
            onKeyDown={handleInputKeyDown}
            className="
              w-full
              rounded-3xl
              border
              border-yellow-100
              bg-white/90
              dark:border-white/10
              dark:bg-slate-950/85
              py-5
              pl-14
              pr-16
              text-base
              font-semibold
              text-gray-800
              shadow-inner
              dark:text-slate-100
              dark:shadow-black/20
              outline-none
              transition-all
              duration-300
              placeholder:font-medium
              placeholder:text-gray-400
              dark:placeholder:text-slate-500
              focus:border-yellow-300
              dark:focus:border-amber-400/60
              focus:ring-4
              focus:ring-yellow-200/80
              dark:focus:ring-amber-400/15
              sm:py-6
              sm:pl-16
              sm:pr-20
              sm:text-xl
            "
          />

          <AnimatePresence>
            {search && (
              <motion.button
                type="button"
                initial={{
                  opacity: 0,
                  scale: 0.7,
                  rotate: -45,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.7,
                  rotate: 45,
                }}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: 1.1,
                        rotate: 5,
                      }
                }
                whileTap={{
                  scale: 0.92,
                }}
                onClick={handleClear}
                aria-label="Clear pet search"
                className="
                  absolute
                  right-3
                  top-1/2
                  flex
                  h-11
                  w-11
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-xl
                  bg-gradient-to-br
                  from-red-500
                  to-rose-600
                  text-lg
                  font-black
                  text-white
                  shadow-lg
                  shadow-red-300/30
                  outline-none
                  ring-red-200
                  focus-visible:ring-4
                  sm:right-4
                  sm:h-12
                  sm:w-12
                  sm:rounded-2xl
                "
              >
                ✕
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Autocomplete suggestions */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              id="item-search-suggestions"
              role="listbox"
              initial={{
                opacity: 0,
                y: -10,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -8,
                scale: 0.98,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute left-1 right-1 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[24px] border border-white/80 bg-white/95 p-2 shadow-[0_25px_70px_rgba(15,23,42,.2)] backdrop-blur-2xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_25px_70px_rgba(0,0,0,.45)] sm:left-3 sm:right-3 sm:rounded-[28px]"
            >
              <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-600 dark:text-amber-300 sm:text-xs">
                    Item Suggestions
                  </p>

                  <p className="mt-1 hidden text-xs text-gray-400 dark:text-slate-500 sm:block">
                    Use ↑ ↓ and Enter to select
                  </p>
                </div>

                {suggestions.length > 0 && (
                  <span className="shrink-0 rounded-full bg-yellow-100 px-3 py-1 text-[10px] font-black text-yellow-700 dark:bg-amber-400/15 dark:text-amber-300 sm:text-xs">
                    {suggestions.length} found
                  </span>
                )}
              </div>

              {suggestions.length > 0 ? (
                <div className="max-h-[390px] space-y-1 overflow-y-auto overscroll-contain">
                  {suggestions.map(
                    (pet, index) => {
                      const isSelected =
                        selectedIndex === index;

                      return (
                        <motion.button
                          id={`item-suggestion-${index}`}
                          key={pet.ID}
                          type="button"
                          role="option"
                          aria-selected={
                            isSelected
                          }
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              shouldReduceMotion
                                ? 0
                                : index * 0.035,
                            duration: 0.2,
                          }}
                          onMouseEnter={() =>
                            setSelectedIndex(
                              index,
                            )
                          }
                          onMouseDown={(
                            event,
                          ) => {
                            event.preventDefault();

                            selectSuggestion(
                              pet.NAME,
                            );
                          }}
                          className={`
                            group
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-[20px]
                            border
                            px-3
                            py-3
                            text-left
                            outline-none
                            transition-all
                            duration-200
                            sm:gap-4
                            sm:rounded-[22px]
                            sm:px-4
                            ${
                              isSelected
                                ? "border-yellow-200 bg-gradient-to-r from-yellow-100 via-orange-50 to-pink-50 shadow-md dark:border-amber-400/30 dark:from-amber-500/15 dark:via-orange-500/10 dark:to-violet-500/10"
                                : "border-transparent hover:border-yellow-100 hover:bg-yellow-50/70 dark:hover:border-white/10 dark:hover:bg-white/5"
                            }
                          `}
                        >
                          <motion.div
                            animate={
                              isSelected &&
                              !shouldReduceMotion
                                ? {
                                    rotate: [
                                      -3, 3, -3,
                                    ],
                                    scale: [
                                      1,
                                      1.05,
                                      1,
                                    ],
                                  }
                                : undefined
                            }
                            transition={{
                              duration: 1.4,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          >
                            <SuggestionImage
                              src={pet.IMAGE}
                              name={pet.NAME}
                              category={pet.CATEGORY}
                              selected={
                                isSelected
                              }
                            />
                          </motion.div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`
                                truncate
                                text-sm
                                font-black
                                transition-colors
                                sm:text-base
                                ${
                                  isSelected
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-700 dark:text-slate-200"
                                }
                              `}
                            >
                              <HighlightedName
                                name={pet.NAME}
                                query={search}
                              />
                            </p>

                            <p className="mt-0.5 text-[10px] font-medium text-gray-400 dark:text-slate-500 sm:text-xs">
                              {getItemCategoryDetails(
                                pet.CATEGORY,
                              ).label}
                            </p>
                          </div>

                          <motion.span
                            animate={{
                              x: isSelected
                                ? 3
                                : 0,
                            }}
                            className={`
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              text-xs
                              font-black
                              transition-all
                              sm:h-9
                              sm:w-9
                              sm:text-sm
                              ${
                                isSelected
                                  ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md"
                                  : "bg-gray-100 text-gray-400 group-hover:bg-yellow-100 group-hover:text-yellow-700 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-amber-400/15 dark:group-hover:text-amber-300"
                              }
                            `}
                          >
                            →
                          </motion.span>
                        </motion.button>
                      );
                    },
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 6,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="rounded-[22px] border border-dashed border-gray-200 bg-gray-50/80 px-5 py-8 text-center dark:border-white/10 dark:bg-slate-950/60"
                >
                  <div className="text-4xl">
                    🔎
                  </div>

                  <p className="mt-3 font-black text-gray-700 dark:text-slate-200">
                    No close matches found
                  </p>

                  <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
                    Try another spelling or a
                    shorter pet name.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Quick searches */}
      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
        }}
        transition={{
          delay: 0.15,
          duration: 0.45,
        }}
        className="mt-6 flex flex-wrap justify-center gap-3"
      >
        {quickSearches.map((pet, index) => (
          <motion.button
            key={pet.name}
            type="button"
            initial={{
              opacity: 0,
              y: 10,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              delay: index * 0.06,
            }}
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    y: -4,
                    scale: 1.05,
                  }
            }
            whileTap={{
              scale: 0.96,
            }}
            onClick={() => {
              onChange(pet.name);
              setIsFocused(false);
              setSelectedIndex(-1);
            }}
            className="
              rounded-full
              border
              border-white/60
              bg-white/80
              dark:border-white/10
              dark:bg-slate-900/75
              px-4
              py-2.5
              text-xs
              font-bold
              text-gray-700
              shadow-lg
              dark:text-slate-200
              dark:shadow-black/20
              backdrop-blur-xl
              transition-colors
              duration-300
              hover:bg-gradient-to-r
              hover:from-yellow-100
              hover:to-orange-100
              dark:hover:from-amber-500/15
              dark:hover:to-orange-500/10
              hover:shadow-xl
              focus-visible:outline-none
              focus-visible:ring-4
              focus-visible:ring-yellow-200
              dark:focus-visible:ring-amber-400/20
              sm:px-5
              sm:text-sm
            "
          >
            <span className="mr-1">
              {pet.emoji}
            </span>

            {pet.name}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}