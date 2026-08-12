import type { ItemCategory } from "../components/trade/types";

type CategoryDetails = {
  label: string;
  pluralLabel: string;
  uppercaseLabel: string;
  icon: string;
  description: string;
  regularOnly: boolean;
  elveOnly: boolean;
};

export const ITEM_CATEGORY_ORDER: ItemCategory[] = [
  "PET",
  "PETWEAR",
  "EGG",
  "VEHICLE",
  "FOOD",
  "GIFT",
  "STROLLER",
  "TOY",
  "STICKER",
  "OTHER",
];

export const ITEM_CATEGORY_DETAILS: Record<ItemCategory, CategoryDetails> = {
  PET: {
    label: "Pet",
    pluralLabel: "Pets",
    uppercaseLabel: "PET",
    icon: "🐾",
    description: "Current Regular, Neon, and Mega trading values.",
    regularOnly: false,
    elveOnly: false,
  },
  PETWEAR: {
    label: "Pet Wear",
    pluralLabel: "Pet Wear",
    uppercaseLabel: "PET WEAR",
    icon: "🎩",
    description: "Current pet wear regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  EGG: {
    label: "Egg",
    pluralLabel: "Eggs",
    uppercaseLabel: "EGG",
    icon: "🥚",
    description: "Current egg regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  VEHICLE: {
    label: "Vehicle",
    pluralLabel: "Vehicles",
    uppercaseLabel: "VEHICLE",
    icon: "🚗",
    description: "Current vehicle regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  FOOD: {
    label: "Food",
    pluralLabel: "Food",
    uppercaseLabel: "FOOD",
    icon: "🍎",
    description: "Current food regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  GIFT: {
    label: "Gift",
    pluralLabel: "Gifts",
    uppercaseLabel: "GIFT",
    icon: "🎁",
    description: "Current gift regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  STROLLER: {
    label: "Stroller",
    pluralLabel: "Strollers",
    uppercaseLabel: "STROLLER",
    icon: "🛒",
    description: "Current stroller regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  TOY: {
    label: "Toy",
    pluralLabel: "Toys",
    uppercaseLabel: "TOY",
    icon: "🪀",
    description: "Current toy regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  STICKER: {
    label: "Sticker",
    pluralLabel: "Stickers",
    uppercaseLabel: "STICKER",
    icon: "🏷️",
    description: "Current sticker regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  OTHER: {
    label: "Other",
    pluralLabel: "Other",
    uppercaseLabel: "OTHER",
    icon: "📦",
    description: "Current regular trading value for miscellaneous Adopt Me items.",
    regularOnly: true,
    elveOnly: false,
  },
};

const ITEM_CATEGORY_ALIASES: Record<string, ItemCategory> = {
  PET: "PET",
  PETS: "PET",
  PETWEAR: "PETWEAR",
  PETWEARS: "PETWEAR",
  EGG: "EGG",
  EGGS: "EGG",
  VEHICLE: "VEHICLE",
  VEHICLES: "VEHICLE",
  FOOD: "FOOD",
  FOODS: "FOOD",
  GIFT: "GIFT",
  GIFTS: "GIFT",
  STROLLER: "STROLLER",
  STROLLERS: "STROLLER",
  TOY: "TOY",
  TOYS: "TOY",
  STICKER: "STICKER",
  STICKERS: "STICKER",
  OTHER: "OTHER",
  OTHERS: "OTHER",
};

export function normalizeItemCategory(category: unknown): ItemCategory {
  const normalized = String(category ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return ITEM_CATEGORY_ALIASES[normalized] ?? "OTHER";
}

export function getItemCategoryDetails(category: unknown): CategoryDetails {
  return ITEM_CATEGORY_DETAILS[normalizeItemCategory(category)];
}

export function getItemCategoryLabel(category: unknown) {
  return getItemCategoryDetails(category).label;
}

export function getItemCategoryIcon(category: unknown) {
  return getItemCategoryDetails(category).icon;
}
