/**
 * Slot-crop geometry for NICH screenshot recognition.
 *
 * A pet icon inside a full 1600px trade screenshot is only ~40-60px wide, which
 * is the single largest source of recognition errors. These helpers plan tight,
 * padded crops per occupied slot and lay them out on one enlarged contact sheet
 * so the artwork occupies as much of the vision input as practical.
 *
 * Pure geometry only — no DOM — so it is shared by the browser (which owns the
 * original bitmap and does the actual drawing) and by tests.
 */

export type NormalizedBox = { x: number; y: number; width: number; height: number };

export type VisionSlotRef = {
  side: "YOU" | "THEM" | "NONE";
  slot: number;
  box: NormalizedBox;
  /** Badge/variant hints carried over from the layout pass, for the manifest. */
  variantHint?: string;
  potionHint?: string;
  /** Catalog category the layout pass believed the slot holds. */
  categoryHint?: string;
  /** Low-trust identity hypotheses from the whole-image pass. */
  identityHints?: string[];
};

export type VisionSlotTile = {
  /** Stable label drawn on the sheet and echoed by the model, e.g. "Y1". */
  tile: string;
  side: "YOU" | "THEM" | "NONE";
  slot: number;
  /** Padded source rectangle in normalized (0..1) screenshot coordinates. */
  source: NormalizedBox;
  /** Destination rectangle in sheet pixels. */
  destX: number;
  destY: number;
  destWidth: number;
  destHeight: number;
  /** Baseline for the tile label, in sheet pixels. */
  labelX: number;
  labelY: number;
};

export type VisionSlotSheetPlan = {
  width: number;
  height: number;
  tileSize: number;
  labelHeight: number;
  tiles: VisionSlotTile[];
};

export const VISION_SLOT_SHEET_MAX_TILES = 12;
const MAX_SHEET_EDGE = 1600;
const MIN_TILE_SIZE = 200;
const MAX_TILE_SIZE = 360;
const LABEL_HEIGHT = 26;
const GUTTER = 10;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function slotTileLabel(side: VisionSlotRef["side"], slot: number) {
  const prefix = side === "YOU" ? "Y" : side === "THEM" ? "T" : "X";
  return `${prefix}${Math.max(1, Math.floor(slot))}`;
}

export function parseSlotTileLabel(label: string): { side: "YOU" | "THEM" | "NONE"; slot: number } | null {
  const match = /^([YTX])(\d{1,2})$/i.exec(String(label ?? "").trim());
  if (!match) return null;
  const letter = match[1].toUpperCase();
  return {
    side: letter === "Y" ? "YOU" : letter === "T" ? "THEM" : "NONE",
    slot: Math.max(1, Math.min(18, Number(match[2]))),
  };
}

/**
 * Grow a detected slot box so the crop keeps the N/M/F/R badges and the slot
 * border, which is where variant metadata actually lives. The pad is relative to
 * the box so tiny boxes get proportionally more context.
 */
export function padSlotBox(box: NormalizedBox, pad = 0.18): NormalizedBox {
  const width = Math.max(0.01, clamp01(box.width));
  const height = Math.max(0.01, clamp01(box.height));
  const padX = width * pad;
  const padY = height * pad;
  const x = clamp01(box.x - padX);
  const y = clamp01(box.y - padY);
  return {
    x,
    y,
    width: Math.min(1 - x, width + padX * 2),
    height: Math.min(1 - y, height + padY * 2),
  };
}

/**
 * Plan a labelled contact sheet of enlarged slot crops.
 *
 * One sheet (rather than one request per slot) keeps the extra vision cost to a
 * single call while still giving every pet several hundred pixels instead of a
 * few dozen. Tiles keep their aspect ratio; deterministic resizing only.
 */
export function planSlotSheet(
  slots: VisionSlotRef[],
  options?: { pad?: number; maxTiles?: number },
): VisionSlotSheetPlan | null {
  const usable = slots
    .filter((entry) => entry.box && entry.box.width > 0 && entry.box.height > 0)
    .slice(0, Math.max(1, Math.min(VISION_SLOT_SHEET_MAX_TILES, options?.maxTiles ?? VISION_SLOT_SHEET_MAX_TILES)));
  if (!usable.length) return null;

  const columns = Math.min(4, Math.ceil(Math.sqrt(usable.length)));
  const rows = Math.ceil(usable.length / columns);

  // Pick the largest tile that keeps the sheet inside the model's comfortable
  // input size. Never upscale beyond MAX_TILE_SIZE: this is plain interpolation,
  // not generative detail.
  const widthBudget = Math.floor((MAX_SHEET_EDGE - GUTTER * (columns + 1)) / columns);
  const heightBudget = Math.floor((MAX_SHEET_EDGE - GUTTER * (rows + 1)) / rows) - LABEL_HEIGHT;
  const tileSize = Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, Math.min(widthBudget, heightBudget)));

  const width = columns * tileSize + GUTTER * (columns + 1);
  const height = rows * (tileSize + LABEL_HEIGHT) + GUTTER * (rows + 1);

  const tiles: VisionSlotTile[] = usable.map((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellX = GUTTER + column * (tileSize + GUTTER);
    const cellY = GUTTER + row * (tileSize + LABEL_HEIGHT + GUTTER);
    const source = padSlotBox(entry.box, options?.pad);
    return {
      tile: slotTileLabel(entry.side, entry.slot),
      side: entry.side,
      slot: entry.slot,
      source,
      destX: cellX,
      destY: cellY + LABEL_HEIGHT,
      destWidth: tileSize,
      destHeight: tileSize,
      labelX: cellX + 2,
      labelY: cellY + LABEL_HEIGHT - 8,
    };
  });

  return { width, height, tileSize, labelHeight: LABEL_HEIGHT, tiles };
}

export type VisionSlotManifestEntry = {
  tile: string;
  side: "YOU" | "THEM" | "NONE";
  slot: number;
  variantHint?: string;
  potionHint?: string;
  categoryHint?: string;
  identityHints?: string[];
};

export type VisionSlotManifest = {
  /** Image classification decided by the layout pass. */
  imageType: "TRADE" | "INVENTORY" | "ITEM" | "OTHER";
  /** Grid-geometry confidence from the layout pass, 0..1. */
  layoutConfidence: number;
  youOccupiedSlots?: number;
  themOccupiedSlots?: number;
  tiles: VisionSlotManifestEntry[];
};

/**
 * Compact manifest sent alongside the crop sheet so the server can map each
 * tile back to its side/slot without trusting the model to repeat geometry.
 */
export function buildSlotManifest(
  plan: VisionSlotSheetPlan,
  slots: VisionSlotRef[],
  layout: Omit<VisionSlotManifest, "tiles">,
): VisionSlotManifest {
  const bySlot = new Map(slots.map((entry) => [slotTileLabel(entry.side, entry.slot), entry]));
  return {
    ...layout,
    tiles: plan.tiles.map((tile) => {
      const source = bySlot.get(tile.tile);
      return {
        tile: tile.tile,
        side: tile.side,
        slot: tile.slot,
        ...(source?.variantHint ? { variantHint: source.variantHint } : {}),
        ...(source?.potionHint ? { potionHint: source.potionHint } : {}),
        ...(source?.categoryHint ? { categoryHint: source.categoryHint } : {}),
        ...(source?.identityHints?.length ? { identityHints: source.identityHints.slice(0, 5) } : {}),
      };
    }),
  };
}

function toBase64(json: string) {
  if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(json)));
  return Buffer.from(json, "utf8").toString("base64");
}

function fromBase64(value: string) {
  if (typeof atob === "function") return decodeURIComponent(escape(atob(value)));
  return Buffer.from(value, "base64").toString("utf8");
}

export function encodeSlotManifest(manifest: VisionSlotManifest) {
  return toBase64(JSON.stringify(manifest));
}

export function decodeSlotManifest(value: string | null): VisionSlotManifest | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(fromBase64(value)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const rawTiles = Array.isArray(record.tiles) ? record.tiles : [];
    const tiles: VisionSlotManifestEntry[] = rawTiles.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const tileRecord = entry as Record<string, unknown>;
      const parsedLabel = parseSlotTileLabel(String(tileRecord.tile ?? ""));
      if (!parsedLabel) return [];
      const side = tileRecord.side === "YOU" || tileRecord.side === "THEM" || tileRecord.side === "NONE"
        ? tileRecord.side
        : parsedLabel.side;
      const slot = Number.isFinite(Number(tileRecord.slot))
        ? Math.max(1, Math.min(18, Math.floor(Number(tileRecord.slot))))
        : parsedLabel.slot;
      return [{
        tile: String(tileRecord.tile).toUpperCase(),
        side,
        slot,
        ...(typeof tileRecord.variantHint === "string" ? { variantHint: tileRecord.variantHint.slice(0, 12) } : {}),
        ...(typeof tileRecord.potionHint === "string" ? { potionHint: tileRecord.potionHint.slice(0, 12) } : {}),
        ...(typeof tileRecord.categoryHint === "string" ? { categoryHint: tileRecord.categoryHint.slice(0, 16) } : {}),
        ...(Array.isArray(tileRecord.identityHints)
          ? { identityHints: tileRecord.identityHints.filter((value): value is string => typeof value === "string").map((value) => value.slice(0, 120)).filter(Boolean).slice(0, 5) }
          : {}),
      }];
    }).slice(0, VISION_SLOT_SHEET_MAX_TILES);
    if (!tiles.length) return null;

    const imageType = record.imageType === "TRADE" || record.imageType === "INVENTORY" || record.imageType === "ITEM"
      ? record.imageType
      : "OTHER";
    const layoutConfidence = Number.isFinite(Number(record.layoutConfidence))
      ? Math.max(0, Math.min(1, Number(record.layoutConfidence)))
      : 0;
    const youOccupiedSlots = Number(record.youOccupiedSlots);
    const themOccupiedSlots = Number(record.themOccupiedSlots);
    return {
      imageType,
      layoutConfidence,
      ...(Number.isFinite(youOccupiedSlots) ? { youOccupiedSlots: Math.max(0, Math.min(18, Math.floor(youOccupiedSlots))) } : {}),
      ...(Number.isFinite(themOccupiedSlots) ? { themOccupiedSlots: Math.max(0, Math.min(18, Math.floor(themOccupiedSlots))) } : {}),
      tiles,
    };
  } catch {
    return null;
  }
}
