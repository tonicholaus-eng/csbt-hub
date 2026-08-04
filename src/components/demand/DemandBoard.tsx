"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Trend =
  | "rising"
  | "dropping"
  | "mixed"
  | "stable";

type DemandItem = {
  id: string;
  name: string;
  category: string;
  trend: Trend;
  updatedAt: string;
  image: string | null;
};

type DemandResponse = {
  success: boolean;
  items: DemandItem[];
  fetchedAt?: string;
  error?: string;
};

const trendDetails: Record<
  Trend,
  {
    label: string;
    emoji: string;
    badge: string;
    border: string;
  }
> = {
  rising: {
    label: "Rising",
    emoji: "📈",
    badge:
      "border-emerald-300/70 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
    border:
      "border-emerald-200/70 dark:border-emerald-400/15",
  },
  dropping: {
    label: "Dropping",
    emoji: "📉",
    badge:
      "border-rose-300/70 bg-rose-100 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
    border:
      "border-rose-200/70 dark:border-rose-400/15",
  },
  mixed: {
    label: "Mixed",
    emoji: "↕️",
    badge:
      "border-violet-300/70 bg-violet-100 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300",
    border:
      "border-violet-200/70 dark:border-violet-400/15",
  },
  stable: {
    label: "Stable",
    emoji: "➖",
    badge:
      "border-slate-300/70 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
    border:
      "border-slate-200/80 dark:border-white/10",
  },
};

const filterOptions: Array<{
  value: "all" | Trend;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "rising", label: "Rising" },
  { value: "dropping", label: "Dropping" },
  { value: "mixed", label: "Mixed" },
  { value: "stable", label: "Stable" },
];

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Update time unavailable";
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );

  if (seconds < 60) return "Updated just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `Updated ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Updated ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

function PetImage({
  item,
}: {
  item: DemandItem;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.image]);

  if (!item.image || failed) {
    return (
      <div className="flex h-24 w-24 items-center justify-center text-5xl">
        🐾
        <span className="sr-only">
          Image unavailable for {item.name}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={item.image}
      alt={item.name}
      width={112}
      height={112}
      unoptimized
      onError={() => setFailed(true)}
      className="h-24 w-24 object-contain transition duration-300 group-hover:scale-110 sm:h-28 sm:w-28"
    />
  );
}

export default function DemandBoard() {
  const [items, setItems] = useState<
    DemandItem[]
  >([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | Trend
  >("all");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState<
    string | null
  >(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDemand() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/demand",
          {
            signal: controller.signal,
          },
        );

        const payload =
          (await response.json()) as DemandResponse;

        if (
          !response.ok ||
          payload.success !== true
        ) {
          throw new Error(
            payload.error ??
              "Unable to load demand trends.",
          );
        }

        setItems(payload.items);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load demand trends.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDemand();

    return () => controller.abort();
  }, []);

  const filteredItems = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query);

      const matchesFilter =
        filter === "all" ||
        item.trend === filter;

      return matchesSearch && matchesFilter;
    });
  }, [filter, items, search]);

  return (
    <section
      aria-labelledby="demand-board-heading"
      className="mt-10 sm:mt-14"
    >
      <div className="rounded-[28px] border border-white/65 bg-white/75 p-4 shadow-[0_28px_90px_rgba(15,23,42,.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65 dark:shadow-[0_28px_90px_rgba(0,0,0,.35)] sm:rounded-[36px] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
              Recent market movement
            </p>

            <h2
              id="demand-board-heading"
              className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl"
            >
              Pet Demand Trends
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Rising and dropping labels come from
              each pet&apos;s latest recorded update.
              Prices are intentionally hidden.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:min-w-[540px]">
            <label className="relative block">
              <span className="sr-only">
                Search demand trends
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                🔎
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search pets..."
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-11 pr-4 font-semibold text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-300/20 dark:border-white/10 dark:bg-slate-900/85 dark:text-white dark:placeholder:text-slate-500"
              />
            </label>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as
                    | "all"
                    | Trend,
                )
              }
              aria-label="Filter demand trend"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 font-black text-slate-700 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-white/10 dark:bg-slate-900/85 dark:text-white dark:[color-scheme:dark]"
            >
              {filterOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/10" />

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white/65 dark:border-white/10 dark:bg-white/[0.03]"
                />
              ),
            )}
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-400/15 dark:bg-rose-400/5"
          >
            <p className="font-black text-rose-700 dark:text-rose-300">
              Demand trends could not be loaded.
            </p>

            <p className="mt-2 text-sm text-rose-600/80 dark:text-rose-300/70">
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          filteredItems.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-white/10">
              <p className="text-4xl" aria-hidden="true">
                🔍
              </p>

              <p className="mt-3 font-black text-slate-700 dark:text-white">
                No matching pets found
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          filteredItems.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-slate-400">
                <span>
                  {filteredItems.length} recent pet
                  {filteredItems.length === 1
                    ? ""
                    : "s"}
                </span>

                <span>
                  Trend source: AMVGG updates
                </span>
              </div>

              <div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                aria-live="polite"
              >
                {filteredItems.map((item) => {
                  const details =
                    trendDetails[item.trend];

                  return (
                    <article
                      key={item.id}
                      className={`group relative overflow-hidden rounded-3xl border bg-white/85 p-4 shadow-md backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/80 ${details.border}`}
                    >
                      <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-100 bg-gradient-to-br from-cyan-50 via-white to-amber-50 dark:border-white/10 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
                        <PetImage item={item} />
                      </div>

                      <div className="mt-4">
                        <h3 className="truncate text-lg font-black text-slate-900 dark:text-white">
                          {item.name}
                        </h3>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${details.badge}`}
                          >
                            <span aria-hidden="true">
                              {details.emoji}
                            </span>

                            {details.label}
                          </span>

                          <time
                            dateTime={item.updatedAt}
                            className="text-xs font-semibold text-slate-400 dark:text-slate-500"
                          >
                            {formatRelativeTime(
                              item.updatedAt,
                            )}
                          </time>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
      </div>
    </section>
  );
}
