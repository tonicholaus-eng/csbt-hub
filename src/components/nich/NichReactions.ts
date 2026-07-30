export type NichPose =
  | "idle"
  | "wave"
  | "point"
  | "celebrate"
  | "walk";

export type NichReaction = {
  message: string;
  eyebrow?: string;
  pose: NichPose;
  duration?: number;
};

export const NichReactions = {
  idle: {
    message: "Need help?",
    eyebrow: undefined,
    pose: "idle",
    duration: 0,
  },

  welcome: {
    message: "Hi! 👋",
    eyebrow: "WELCOME",
    pose: "wave",
    duration: 3000,
  },

  wave: {
    message: "Hello!",
    eyebrow: "HEY",
    pose: "wave",
    duration: 2500,
  },

  goodbye: {
    message: "See you!",
    eyebrow: "BYE",
    pose: "wave",
    duration: 2500,
  },

  search: {
    message: "Searching...",
    eyebrow: "SEARCH",
    pose: "walk",
    duration: 1800,
  },

  searchFound: {
    message: "Found it!",
    eyebrow: "RESULT",
    pose: "celebrate",
    duration: 2800,
  },

  searchEmpty: {
    message: "Nothing found.",
    eyebrow: "OOPS",
    pose: "point",
    duration: 2500,
  },

  calculator: {
    message: "Let's calculate.",
    eyebrow: "TOOLS",
    pose: "point",
    duration: 2800,
  },

  celebrate: {
    message: "Awesome!",
    eyebrow: "NICE",
    pose: "celebrate",
    duration: 3000,
  },
} satisfies Record<string, NichReaction>;

export type NichReactionKey = keyof typeof NichReactions;

export default NichReactions;