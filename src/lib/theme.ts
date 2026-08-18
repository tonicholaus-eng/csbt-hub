export const CSBT_THEME_STORAGE_KEY = "csbt-theme";

export const CSBT_THEMES = {
  dark: {
    id: "dark",
    label: "CSBT Dark",
    description: "Original CSBT Experience",
    icon: "🌙",
    swatches: ["#06111F", "#0C1728", "#FFC928"],
  },
  halloween: {
    id: "halloween",
    label: "CSBT Halloween",
    description: "Haunted Trading Carnival",
    icon: "🎃",
    swatches: ["#09070D", "#FF7A00", "#8B5CF6"],
  },
  light: {
    id: "light",
    label: "CSBT Roblox",
    description: "Playable Trading World",
    icon: "🎮",
    swatches: ["#E32620", "#67B9EE", "#55A63F"],
  },
  snoopy: {
    id: "snoopy",
    label: "Snoopy",
    description: "Peanuts-Inspired Classic",
    icon: "🐶",
    swatches: ["#B51D1A", "#F4E4BD", "#E3B437"],
  },
} as const;

export type CSBTTheme = keyof typeof CSBT_THEMES;

export const CSBT_THEME_IDS = Object.keys(CSBT_THEMES) as CSBTTheme[];

export function isCSBTTheme(value: unknown): value is CSBTTheme {
  return typeof value === "string" && CSBT_THEME_IDS.includes(value as CSBTTheme);
}
