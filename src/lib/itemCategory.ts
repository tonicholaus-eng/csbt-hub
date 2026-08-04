import type { ItemCategory } from "../components/trade/types";

type CategoryDetails = {
  label: string;
  uppercaseLabel: string;
  icon: string;
  description: string;
  regularOnly: boolean;
  elveOnly: boolean;
};

export const ITEM_CATEGORY_DETAILS: Record<ItemCategory, CategoryDetails> = {
  PET: {
    label: "Pet",
    uppercaseLabel: "PET",
    icon: "🐾",
    description: "Current Regular, Neon, and Mega trading values.",
    regularOnly: false,
    elveOnly: false,
  },
  PETWEAR: {
    label: "Pet Wear",
    uppercaseLabel: "PET WEAR",
    icon: "🎩",
    description: "Current pet wear regular trading value.",
    regularOnly: true,
    elveOnly: false,
  },
  EGG: {
    label: "Egg",
    uppercaseLabel: "EGG",
    icon: "🥚",
    description: "Current Elve Shark regular value for this egg.",
    regularOnly: true,
    elveOnly: true,
  },
  TOY: {
    label: "Toy",
    uppercaseLabel: "TOY",
    icon: "🪀",
    description: "Current Elve Shark regular value for this toy.",
    regularOnly: true,
    elveOnly: true,
  },
};

export function getItemCategoryDetails(category: ItemCategory) {
  return ITEM_CATEGORY_DETAILS[category];
}

export function getItemCategoryLabel(category: ItemCategory) {
  return ITEM_CATEGORY_DETAILS[category].label;
}

export function getItemCategoryIcon(category: ItemCategory) {
  return ITEM_CATEGORY_DETAILS[category].icon;
}
