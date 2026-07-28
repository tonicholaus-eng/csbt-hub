export type NichReaction = {
  id: string;
  pose: "idle" | "walk" | "wave" | "point" | "celebrate";
  eyebrow?: string;
  message: string;
  duration?: number;
};

export const NichReactions = {
  idle: {
    id: "idle",
    pose: "idle",
    message: "Need help?",
    duration: 3000,
  },

  welcome: {
    id: "welcome",
    pose: "wave",
    eyebrow: "Welcome",
    message: "Hi! I'm Nich 👋",
    duration: 3500,
  },

  search: {
    id: "search",
    pose: "point",
    eyebrow: "Searching",
    message: "Let's find that pet!",
    duration: 2500,
  },

  searchFound: {
    id: "searchFound",
    pose: "celebrate",
    eyebrow: "Found it!",
    message: "Here's what I found!",
    duration: 3000,
  },

  searchEmpty: {
    id: "searchEmpty",
    pose: "idle",
    eyebrow: "Hmm...",
    message: "I couldn't find that pet.",
    duration: 3000,
  },

  calculator: {
    id: "calculator",
    pose: "wave",
    eyebrow: "Trade Calculator",
    message: "Let's see if this trade is fair!",
    duration: 3000,
  },

  fairTrade: {
    id: "fairTrade",
    pose: "celebrate",
    eyebrow: "Looks good!",
    message: "That trade looks fair! 🎉",
    duration: 3500,
  },

  loseTrade: {
    id: "loseTrade",
    pose: "idle",
    eyebrow: "Careful!",
    message: "You might be overpaying.",
    duration: 3500,
  },

  winTrade: {
    id: "winTrade",
    pose: "celebrate",
    eyebrow: "Nice!",
    message: "Looks like a win for you! 😎",
    duration: 3500,
  },

  loading: {
    id: "loading",
    pose: "idle",
    message: "Thinking...",
    duration: 2000,
  },

  goodbye: {
    id: "goodbye",
    pose: "wave",
    message: "See you later!",
    duration: 3000,
  },
} as const;

export type NichReactionKey = keyof typeof NichReactions;