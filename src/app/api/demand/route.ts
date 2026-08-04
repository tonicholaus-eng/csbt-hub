import { NextResponse } from "next/server";

import tradingItems from "../../../data/tradingItems.json";

type AmvggUpdate = {
  id?: string;
  itemName?: string;
  itemCategory?: string;
  previousRegularValue?: string;
  newRegularValue?: string;
  previousNeonValue?: string;
  newNeonValue?: string;
  previousMegaValue?: string;
  newMegaValue?: string;
  previousRegularDemand?: string;
  newRegularDemand?: string;
  previousNeonDemand?: string;
  newNeonDemand?: string;
  previousMegaDemand?: string;
  newMegaDemand?: string;
  updatedAt?: string;
};

type AmvggResponse = {
  success?: boolean;
  data?: AmvggUpdate[];
  pagination?: {
    hasMore?: boolean;
  };
};

type Trend = "rising" | "dropping" | "mixed" | "stable";

type TradingItemImage = {
  NAME?: string;
  IMAGE?: string;
  CATEGORY?: string;
};

const AMVGG_ENDPOINT =
  "https://amvgg.com/api/value-updates";

const PAGE_SIZE = 40;
const MAX_PAGES = 6;

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const imageByName = new Map(
  (tradingItems as TradingItemImage[])
    .filter(
      (item) =>
        item.CATEGORY === "PET" &&
        typeof item.NAME === "string" &&
        typeof item.IMAGE === "string" &&
        item.IMAGE.length > 0,
    )
    .map((item) => [
      normalizeName(item.NAME as string),
      item.IMAGE as string,
    ]),
);

function numericDirection(
  previousValue?: string,
  newValue?: string,
): -1 | 0 | 1 | null {
  if (
    previousValue === undefined ||
    newValue === undefined
  ) {
    return null;
  }

  const previous = Number(previousValue);
  const next = Number(newValue);

  if (
    !Number.isFinite(previous) ||
    !Number.isFinite(next)
  ) {
    return null;
  }

  if (next > previous) return 1;
  if (next < previous) return -1;
  return 0;
}

function demandScore(value?: string) {
  if (!value) return null;

  const normalized = value.toLowerCase();

  if (normalized.includes("low")) return 1;

  if (
    normalized.includes("medium") ||
    normalized.includes("decent")
  ) {
    return 2;
  }

  if (
    normalized.includes("high") ||
    normalized.includes("amazing")
  ) {
    return 3;
  }

  return null;
}

function demandDirection(
  previousDemand?: string,
  newDemand?: string,
): -1 | 0 | 1 | null {
  const previous = demandScore(previousDemand);
  const next = demandScore(newDemand);

  if (previous === null || next === null) {
    return null;
  }

  if (next > previous) return 1;
  if (next < previous) return -1;
  return 0;
}

function getTrend(update: AmvggUpdate): Trend {
  const directions = [
    numericDirection(
      update.previousRegularValue,
      update.newRegularValue,
    ),
    numericDirection(
      update.previousNeonValue,
      update.newNeonValue,
    ),
    numericDirection(
      update.previousMegaValue,
      update.newMegaValue,
    ),
    demandDirection(
      update.previousRegularDemand,
      update.newRegularDemand,
    ),
    demandDirection(
      update.previousNeonDemand,
      update.newNeonDemand,
    ),
    demandDirection(
      update.previousMegaDemand,
      update.newMegaDemand,
    ),
  ].filter(
    (direction): direction is -1 | 0 | 1 =>
      direction !== null && direction !== 0,
  );

  if (directions.length === 0) {
    return "stable";
  }

  const hasIncrease = directions.some(
    (direction) => direction > 0,
  );

  const hasDecrease = directions.some(
    (direction) => direction < 0,
  );

  if (hasIncrease && hasDecrease) {
    return "mixed";
  }

  return hasIncrease ? "rising" : "dropping";
}

function validDate(value?: string) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

async function fetchUpdatePage(offset: number) {
  const url = new URL(AMVGG_ENDPOINT);

  url.searchParams.set(
    "limit",
    PAGE_SIZE.toString(),
  );
  url.searchParams.set("offset", offset.toString());
  url.searchParams.set("category", "Pets");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 1800,
    },
  });

  if (!response.ok) {
    throw new Error(
      `AMVGG returned HTTP ${response.status}.`,
    );
  }

  const payload =
    (await response.json()) as AmvggResponse;

  if (
    payload.success !== true ||
    !Array.isArray(payload.data)
  ) {
    throw new Error(
      "AMVGG returned an unexpected response.",
    );
  }

  return payload;
}

export async function GET() {
  try {
    const updates: AmvggUpdate[] = [];
    let offset = 0;

    for (
      let page = 0;
      page < MAX_PAGES;
      page += 1
    ) {
      const payload = await fetchUpdatePage(offset);

      updates.push(...(payload.data ?? []));

      if (!payload.pagination?.hasMore) {
        break;
      }

      offset += PAGE_SIZE;
    }

    const latestByItem = new Map<
      string,
      AmvggUpdate
    >();

    for (const update of updates) {
      if (
        update.itemCategory !== "Pets" ||
        !update.itemName ||
        !validDate(update.updatedAt)
      ) {
        continue;
      }

      const key = normalizeName(update.itemName);
      const current = latestByItem.get(key);

      if (
        !current ||
        new Date(update.updatedAt as string).getTime() >
          new Date(
            current.updatedAt as string,
          ).getTime()
      ) {
        latestByItem.set(key, update);
      }
    }

    const items = Array.from(
      latestByItem.entries(),
    )
      .map(([key, update]) => ({
        id:
          update.id ??
          `${key}-${update.updatedAt}`,
        name: update.itemName as string,
        category: "Pet",
        trend: getTrend(update),
        updatedAt: update.updatedAt as string,
        image: imageByName.get(key) ?? null,
      }))
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );

    return NextResponse.json(
      {
        success: true,
        items,
        fetchedAt: new Date().toISOString(),
        source: "AMVGG public value updates",
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to load AMVGG demand trends:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        items: [],
        error:
          error instanceof Error
            ? error.message
            : "Unable to load demand trends.",
      },
      {
        status: 502,
      },
    );
  }
}
