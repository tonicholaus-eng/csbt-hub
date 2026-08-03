import type {
  NichNavigationAction,
  NichNavigationPath,
  NichResponse,
  NichSuggestion,
} from "./types";
import {
  includesAnyWholePhrase,
  normalizeText,
  startsWithAnyPhrase,
} from "./language";

function createSuggestion(
  id: string,
  label: string,
  message: string,
): NichSuggestion {
  return { id, label, message };
}

function createNavigation(
  href: NichNavigationPath,
  label: string,
): NichNavigationAction {
  return { href, label, delay: 500 };
}

function isNavigationCommand(message: string): boolean {
  return startsWithAnyPhrase(message, [
    "open",
    "go to",
    "take me to",
    "send me to",
    "bring me to",
    "navigate to",
    "visit",
    "go home",
    "take me home",
  ]);
}

type PageDefinition = {
  href: NichNavigationPath;
  label: string;
  emoji: string;
  description: string;
  aliases: readonly string[];
  openText: string;
  reaction: NichResponse["reaction"];
};

const PAGES: readonly PageDefinition[] = [
  {
    href: "/",
    label: "Home",
    emoji: "🏠",
    description: "quick actions, popular pets, Nich, and website highlights",
    aliases: ["home", "home page", "homepage", "main page"],
    openText: "Taking you to the CSBT HUB Home page. 🏠",
    reaction: "welcome",
  },
  {
    href: "/values",
    label: "Values",
    emoji: "🐾",
    description: "browse and search Adopt Me pet and Pet Wear values",
    aliases: ["values", "values page", "pet values", "pet values page", "browse values"],
    openText: "Opening the Values page. 🐾",
    reaction: "searchFound",
  },
  {
    href: "/calculator",
    label: "Calculator",
    emoji: "🧮",
    description: "compare both sides of a trade and view W/F/L",
    aliases: ["calculator", "trade calculator", "calculator page"],
    openText: "Opening the Trade Calculator. 🧮",
    reaction: "calculator",
  },
  {
    href: "/nich",
    label: "Ask Nich",
    emoji: "💬",
    description: "open the full-size assistant",
    aliases: ["ask nich", "nich page", "ask nich page"],
    openText: "Opening the full Ask Nich page. 💬",
    reaction: "wave",
  },
  {
    href: "/community",
    label: "Community",
    emoji: "👥",
    description: "view community-related content and updates",
    aliases: ["community", "community page"],
    openText: "Opening the Community page. 👥",
    reaction: "wave",
  },
  {
    href: "/trading-servers",
    label: "Trading Servers",
    emoji: "🌐",
    description: "find trading-server resources",
    aliases: ["trading servers", "trading server", "servers", "server directory"],
    openText: "Opening Trading Servers. 🌐",
    reaction: "searchFound",
  },
  {
    href: "/seminar",
    label: "Seminar",
    emoji: "🎓",
    description: "open CSBT learning and seminar content",
    aliases: ["seminar", "seminar page", "academy", "learning page"],
    openText: "Opening the Seminar page. 🎓",
    reaction: "wave",
  },
  {
    href: "/about",
    label: "About",
    emoji: "ℹ️",
    description: "learn about CSBT HUB and its purpose",
    aliases: ["about", "about page", "about csbt"],
    openText: "Opening the About page. ℹ️",
    reaction: "wave",
  },
] as const;

function createWebsiteOverviewResponse(): NichResponse {
  return {
    text: [
      "CSBT HUB has these main pages:",
      "",
      ...PAGES.map((page) => `${page.emoji} ${page.label} — ${page.description}`),
      "",
      "Tell me to open any page and I can navigate there.",
    ].join("\n"),
    intent: "navigation",
    reaction: "wave",
    typingDuration: 500,
    suggestions: [
      createSuggestion("website-open-values", "Open Values", "Open the Values page"),
      createSuggestion("website-open-calculator", "Open Calculator", "Open the Calculator"),
      createSuggestion("website-open-servers", "Trading Servers", "Open Trading Servers"),
    ],
    context: { lastIntent: "navigation" },
  };
}

function createPageResponse(
  page: PageDefinition,
  shouldNavigate: boolean,
): NichResponse {
  if (shouldNavigate) {
    return {
      text: page.openText,
      intent: "navigation",
      reaction: page.reaction,
      typingDuration: 250,
      navigation: createNavigation(page.href, `Open ${page.label}`),
      context: { lastIntent: "navigation" },
    };
  }

  return {
    text: [
      `${page.emoji} The ${page.label} page lets you ${page.description}.`,
      "",
      `Say “Open ${page.label}” and I can take you there.`,
    ].join("\n"),
    intent: "navigation",
    reaction: page.reaction,
    typingDuration: 400,
    suggestions: [
      createSuggestion(
        `page-open-${page.href.replace(/\W+/g, "-") || "home"}`,
        `Open ${page.label}`,
        `Open ${page.label}`,
      ),
      createSuggestion("page-overview", "All pages", "What pages are on this website?"),
    ],
    context: { lastIntent: "navigation" },
  };
}

function mentionsPage(message: string, page: PageDefinition): boolean {
  return page.aliases.some((alias) => {
    const normalizedAlias = normalizeText(alias);
    return (
      message === normalizedAlias ||
      includesAnyWholePhrase(message, [
        `where is ${normalizedAlias}`,
        `where is the ${normalizedAlias}`,
        `open ${normalizedAlias}`,
        `open the ${normalizedAlias}`,
        `go to ${normalizedAlias}`,
        `go to the ${normalizedAlias}`,
        `take me to ${normalizedAlias}`,
        `send me to ${normalizedAlias}`,
        `navigate to ${normalizedAlias}`,
        `find ${normalizedAlias}`,
        `what is on the ${normalizedAlias}`,
        `what does the ${normalizedAlias} have`,
      ])
    );
  });
}

export function createWebsiteKnowledgeResponse(message: string): NichResponse | null {
  const normalized = normalizeText(message);
  if (!normalized) return null;

  if (
    includesAnyWholePhrase(normalized, [
      "what pages are on this website",
      "what pages are on the website",
      "what pages does this website have",
      "website pages",
      "site pages",
      "what can i do on this website",
      "what can i do on csbt",
      "what features does the website have",
      "what features does csbt have",
      "show me the website pages",
    ])
  ) {
    return createWebsiteOverviewResponse();
  }

  const shouldNavigate = isNavigationCommand(normalized);
  const page = PAGES.find((candidate) => mentionsPage(normalized, candidate));
  return page ? createPageResponse(page, shouldNavigate) : null;
}

export default createWebsiteKnowledgeResponse;
