"use client";

import Image from "next/image";
import {
  useDeferredValue,
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

import tradingItemsData from "../../data/tradingItems.json";
import {
  ItemCategory,
  TradeItem,
  ValueSource,
} from "./types";
import {
  VALUE_SOURCE_SHORT_LABELS,
  formatTradeValue,
  getItemValue,
  hasItemValue,
} from "../../lib/valueSystem";
import {
  getItemCategoryDetails,
  getItemCategoryIcon,
  getItemCategoryLabel,
} from "../../lib/itemCategory";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: TradeItem) => void;
  valueSource: ValueSource;
};

type CategoryFilter =
  | "ALL"
  | ItemCategory;

type ItemImageProps = {
  src?: string;
  name: string;
  category: ItemCategory;
};

const ITEMS_PER_PAGE = 30;

const categoryOptions: { value: CategoryFilter; label: string; icon: string }[] = [
  { value: "ALL", label: "All Items", icon: "✨" },
  { value: "PET", label: "Pets", icon: "🐾" },
  { value: "PETWEAR", label: "Pet Wear", icon: "🎩" },
  { value: "EGG", label: "Eggs", icon: "🥚" },
  { value: "VEHICLE", label: "Vehicles", icon: "🚗" },
  { value: "FOOD", label: "Food", icon: "🍎" },
  { value: "GIFT", label: "Gifts", icon: "🎁" },
  { value: "STROLLER", label: "Strollers", icon: "🛒" },
  { value: "TOY", label: "Toys", icon: "🪀" },
  { value: "STICKER", label: "Stickers", icon: "🏷️" },
  { value: "OTHER", label: "Other", icon: "📦" },
];

const tradingItems =
  tradingItemsData as TradeItem[];

function ItemImage({
  src,
  name,
  category,
}: ItemImageProps) {
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
          {getItemCategoryIcon(category)}
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
      loading="lazy"
      onError={() =>
        setImageFailed(true)
      }
      className="h-20 w-20 object-contain drop-shadow-lg transition-transform duration-300 group-hover/card:scale-110 group-hover/card:rotate-3 sm:h-24 sm:w-24"
    />
  );
}

export default function AddPetModal({
  open,
  onClose,
  onSelect,
  valueSource,
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

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<CategoryFilter>(
    "ALL",
  );

  const [
    visibleCount,
    setVisibleCount,
  ] = useState(
    ITEMS_PER_PAGE,
  );

  const deferredSearch =
    useDeferredValue(search);

  const normalizedSearch =
    deferredSearch
      .trim()
      .toLowerCase();

  const visibleCategoryOptions = categoryOptions;

  const filteredItems =
    useMemo(() => {
      return tradingItems.filter(
        (item) => {
          const matchesCategory =
            selectedCategory ===
              "ALL" ||
            item.CATEGORY ===
              selectedCategory;

          const matchesSearch =
            !normalizedSearch ||
            item.NAME
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const hasSourceValue =
            hasItemValue(
              item,
              valueSource,
              "NORMAL",
            ) ||
            hasItemValue(
              item,
              valueSource,
              "NEON",
            ) ||
            hasItemValue(
              item,
              valueSource,
              "MEGA",
            );

          return (
            matchesCategory &&
            matchesSearch &&
            hasSourceValue
          );
        },
      );
    }, [
      normalizedSearch,
      selectedCategory,
      valueSource,
    ]);

  const visibleItems =
    useMemo(
      () =>
        filteredItems.slice(
          0,
          visibleCount,
        ),
      [
        filteredItems,
        visibleCount,
      ],
    );

  const hasMoreItems =
    visibleCount <
    filteredItems.length;

  useEffect(() => {
    setVisibleCount(
      ITEMS_PER_PAGE,
    );
  }, [
    normalizedSearch,
    selectedCategory,
  ]);


  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedCategory(
        "ALL",
      );
      setVisibleCount(
        ITEMS_PER_PAGE,
      );
      return;
    }

    previouslyFocusedElement.current =
      document.activeElement instanceof
      HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    const focusTimer =
      window.setTimeout(
        () => {
          searchInputRef.current?.focus();
        },
        shouldReduceMotion
          ? 0
          : 100,
      );

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        event.preventDefault();
        onClose();
        return;
      }

      if (
        event.key !== "Tab"
      ) {
        return;
      }

      const dialog =
        document.getElementById(
          "add-item-dialog",
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

      if (
        !focusableElements.length
      ) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
          focusableElements.length -
            1
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
      window.clearTimeout(
        focusTimer,
      );

      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      previouslyFocusedElement.current?.focus();
    };
  }, [
    open,
    onClose,
    shouldReduceMotion,
  ]);

  function handleSelect(
    item: TradeItem,
  ) {
    onSelect(item);
    setSearch("");
  }

  function clearSearch() {
    setSearch("");
    setVisibleCount(
      ITEMS_PER_PAGE,
    );

    requestAnimationFrame(
      () => {
        searchInputRef.current?.focus();
      },
    );
  }

  return (
    <AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
        id="add-item-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
        aria-describedby="add-item-description"
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
          duration:
            shouldReduceMotion
              ? 0
              : 0.25,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/40 bg-white/95 shadow-[0_35px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95 sm:h-[88vh] sm:rounded-[36px]"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-500/5" />

        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/5" />

        <div className="relative z-20 shrink-0 border-b border-slate-200/80 bg-white/90 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 sm:p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0">

              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-3 py-1 text-xs font-black text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300 sm:px-4 sm:py-1.5">
                <span aria-hidden="true">
                  ✨
                </span>

                Item Selector
              </span>

              <h2
                id="add-item-title"
                className="mt-3 text-2xl font-black leading-tight tracking-tight text-slate-800 dark:text-white sm:text-4xl"
              >
                Select an Item
              </h2>

              <p
                id="add-item-description"
                className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base"
              >
                {filteredItems.length}{" "}
                {filteredItems.length ===
                1
                  ? "item"
                  : "items"}{" "}
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
                scale:
                  shouldReduceMotion
                    ? 1
                    : 0.92,
              }}
              aria-label="Close item selector"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-lg font-black text-white shadow-lg outline-none transition-colors duration-300 hover:bg-red-600 focus-visible:ring-4 focus-visible:ring-red-300/50 dark:shadow-red-950/40 dark:focus-visible:ring-red-400/30 sm:h-11 sm:w-11 sm:rounded-2xl"
            >
              ✕

            </motion.button>

          </div>

          <div className="mt-5 flex flex-wrap gap-3">

            {visibleCategoryOptions.map(
              (option) => {
                const active =
                  selectedCategory ===
                  option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(
                        option.value,
                      )
                    }
                    className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${
                      active
                        ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 text-white shadow-lg"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-yellow-300 hover:bg-yellow-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
                    }`}
                  >
                    <span className="mr-2">
                      {option.icon}
                    </span>

                    {option.label}
                  </button>
                );
              },
            )}

          </div>

          <div className="relative mt-6">

            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">
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
              placeholder="Search pets, pet wear, eggs, or toys..."
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-2xl border-2 border-yellow-200 bg-white py-4 pl-14 pr-16 text-lg font-semibold outline-none transition-all focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 dark:border-amber-400/20 dark:bg-slate-900 dark:text-white"
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
                  onClick={
                    clearSearch
                  }
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100 font-black hover:bg-red-100 hover:text-red-600 dark:bg-white/[0.07]"
                >
                  ✕

                </motion.button>
              )}

            </AnimatePresence>

          </div>

        </div>
                {filteredItems.length === 0 ? (
          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 text-center">
            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      y: [0, -7, 0],
                      rotate: [-3, 3, -3],
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
              No Items Found
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400 sm:mt-3 sm:text-base">
              No items match “{search}”. Try
              another spelling, a shorter
              name, or a different category.
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
              {visibleItems.map(
                (item, index) => (
                  <motion.button
                    type="button"
                    key={item.ID}
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
                              index *
                                0.015,
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
                      handleSelect(item)
                    }
                    aria-label={`Add ${item.NAME} to the trade`}
                    className="group/card relative flex min-h-[330px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-md outline-none transition-[background-color,border-color,box-shadow] duration-300 hover:border-yellow-300 hover:shadow-xl focus-visible:border-yellow-400 focus-visible:ring-4 focus-visible:ring-yellow-200/70 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-[0_16px_40px_rgba(0,0,0,.25)] dark:hover:border-amber-400/30 dark:hover:bg-slate-900 dark:focus-visible:border-amber-400 dark:focus-visible:ring-amber-400/20 sm:min-h-[405px] sm:rounded-3xl sm:p-4"
                  >
                    <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-300/10 opacity-0 blur-3xl transition-opacity duration-300 group-hover/card:opacity-100 dark:bg-amber-500/10" />

                    <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 blur-lg transition-all duration-700 group-hover/card:left-[130%] group-hover/card:opacity-100 dark:via-white/10" />

                    <div className="absolute left-2 top-2 z-20 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300 sm:left-3 sm:top-3 sm:text-[10px]">
                      <span
                        aria-hidden="true"
                        className="mr-1"
                      >
                        {getItemCategoryIcon(
                          item.CATEGORY,
                        )}
                      </span>

                      {getItemCategoryLabel(
                        item.CATEGORY,
                      )}
                    </div>

                    <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-yellow-50 via-white to-orange-100 shadow-inner dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 sm:h-32 sm:rounded-3xl">
                      <ItemImage
                        src={item.IMAGE}
                        name={item.NAME}
                        category={
                          item.CATEGORY
                        }
                      />
                    </div>

                    <h3 className="relative z-10 mt-3 line-clamp-2 min-h-[44px] w-full break-words text-center text-sm font-black leading-snug text-slate-900 dark:text-white sm:mt-5 sm:min-h-[56px] sm:text-lg">
                      {item.NAME}
                    </h3>

                    <p className="relative z-10 mt-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 sm:text-xs">
                      {VALUE_SOURCE_SHORT_LABELS[valueSource]} values
                    </p>

                    <div className="relative z-10 mt-2 w-full space-y-2 text-[10px] font-bold sm:mt-3 sm:text-xs">
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-yellow-100 px-2 py-2 text-yellow-800 dark:bg-amber-400/10 dark:text-amber-300 sm:rounded-xl sm:px-3">
                        <span>Regular</span>

                        <span className="min-w-0 truncate text-right font-black">
                          {formatTradeValue(
                            getItemValue(item, valueSource, "NORMAL"),
                          )}
                        </span>
                      </div>

                      {item.CATEGORY ===
                      "PET" ? (
                        <>
                          <div className="flex items-center justify-between gap-2 rounded-lg bg-cyan-100 px-2 py-2 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-300 sm:rounded-xl sm:px-3">
                            <span>Neon</span>

                            <span className="min-w-0 truncate text-right font-black">
                              {formatTradeValue(
                                getItemValue(item, valueSource, "NEON"),
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 rounded-lg bg-pink-100 px-2 py-2 text-pink-800 dark:bg-pink-400/10 dark:text-pink-300 sm:rounded-xl sm:px-3">
                            <span>Mega</span>

                            <span className="min-w-0 truncate text-right font-black">
                              {formatTradeValue(
                                getItemValue(item, valueSource, "MEGA"),
                              )}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-center text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500 sm:rounded-xl">
                          {getItemCategoryDetails(
                            item.CATEGORY,
                          ).label}{" "}
                          uses its regular value
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 mt-auto w-full pt-4">
                      <div className="rounded-xl bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 px-2 py-2.5 text-center text-xs font-black text-white shadow-md transition-transform duration-300 group-hover/card:scale-[1.02] sm:rounded-2xl sm:py-3 sm:text-base">
                        + Add Item
                      </div>
                    </div>
                  </motion.button>
                ),
              )}

              {hasMoreItems && (
                <div className="col-span-full flex flex-col items-center justify-center gap-3 py-4 sm:py-6">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 sm:text-sm">
                    Showing{" "}
                    {visibleItems.length} of{" "}
                    {filteredItems.length}{" "}
                    items
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount(
                        (
                          currentCount,
                        ) =>
                          currentCount +
                          ITEMS_PER_PAGE,
                      )
                    }
                    className="min-h-12 rounded-2xl bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 px-6 py-3 text-sm font-black text-white shadow-lg outline-none transition duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-yellow-300/50 dark:focus-visible:ring-amber-400/30 sm:text-base"
                  >
                    Load{" "}
                    {Math.min(
                      ITEMS_PER_PAGE,
                      filteredItems.length -
                        visibleItems.length,
                    )}{" "}
                    more items
                  </button>
                </div>
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