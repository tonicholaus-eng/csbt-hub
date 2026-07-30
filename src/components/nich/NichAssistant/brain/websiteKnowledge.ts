import type {
  NichNavigationAction,
  NichNavigationPath,
  NichResponse,
  NichSuggestion,
} from "./types";

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(
  message: string,
  phrases: string[],
) {
  return phrases.some((phrase) =>
    message.includes(phrase),
  );
}

function createSuggestion(
  id: string,
  label: string,
  message: string,
): NichSuggestion {
  return {
    id,
    label,
    message,
  };
}

function createNavigation(
  href: NichNavigationPath,
  label: string,
): NichNavigationAction {
  return {
    href,
    label,
    delay: 700,
  };
}

function isNavigationCommand(
  message: string,
) {
  return includesAny(message, [
    "open ",
    "go to ",
    "take me ",
    "send me ",
    "bring me ",
    "navigate to ",
    "visit ",
    "show me the ",
    "go home",
    "take me home",
  ]);
}

function createWebsiteOverviewResponse(): NichResponse {
  return {
    text: [
      "CSBT HUB currently has these main pages:",
      "",
      "🏠 Home — quick actions, popular pets, Nich, and website stats",
      "🐾 Values — browse and search Adopt Me pet values",
      "🧮 Calculator — compare both sides of a trade",
      "💬 Ask Nich — open the full Nich assistant page",
      "ℹ️ About — learn more about CSBT HUB",
      "",
      "Tell me to open any page and I can take you there.",
    ].join("\n"),
    intent: "navigation",
    reaction: "wave",
    typingDuration: 650,
    suggestions: [
      createSuggestion(
        "website-open-values",
        "Open Values",
        "Open the Values page",
      ),
      createSuggestion(
        "website-open-calculator",
        "Open Calculator",
        "Open the Calculator",
      ),
      createSuggestion(
        "website-open-about",
        "Open About",
        "Open the About page",
      ),
    ],
    context: {
      lastIntent: "navigation",
    },
  };
}

function createValuesPageResponse(
  shouldNavigate: boolean,
): NichResponse {
  if (shouldNavigate) {
    return {
      text: "Opening the Values page for you. 🐾",
      intent: "navigation",
      reaction: "searchFound",
      typingDuration: 350,
      navigation: createNavigation(
        "/values",
        "Open Values",
      ),
      context: {
        lastIntent: "navigation",
      },
    };
  }

  return {
    text: [
      "The Values page is where you can browse and search the CSBT Adopt Me pet database. 🐾",
      "",
      "You can open Values from the navigation menu, or tell me “Open the Values page.”",
      "",
      "You can also ask me for a pet directly, such as “What is Frost Dragon worth?”",
    ].join("\n"),
    intent: "navigation",
    reaction: "searchFound",
    typingDuration: 600,
    suggestions: [
      createSuggestion(
        "values-open-page",
        "Open Values",
        "Open the Values page",
      ),
      createSuggestion(
        "values-check-frost",
        "Check Frost Dragon",
        "What is Frost Dragon worth?",
      ),
      createSuggestion(
        "values-check-several",
        "Check several pets",
        "How much are Owl, Crow, and Parrot?",
      ),
    ],
    context: {
      lastIntent: "navigation",
    },
  };
}

function createCalculatorPageResponse(
  shouldNavigate: boolean,
): NichResponse {
  if (shouldNavigate) {
    return {
      text: "Opening the Trade Calculator for you. 🧮",
      intent: "navigation",
      reaction: "calculator",
      typingDuration: 350,
      navigation: createNavigation(
        "/calculator",
        "Open Calculator",
      ),
      context: {
        lastIntent: "navigation",
      },
    };
  }

  return {
    text: [
      "The Trade Calculator is on the Calculator page. 🧮",
      "",
      "There you can add pets to Your Offer and Their Offer, choose Normal, Neon, or Mega, and check the Win, Fair, or Lose result.",
      "",
      "Tell me “Open the Calculator” and I can take you there.",
    ].join("\n"),
    intent: "navigation",
    reaction: "calculator",
    typingDuration: 650,
    suggestions: [
      createSuggestion(
        "calculator-open-page",
        "Open Calculator",
        "Open the Calculator",
      ),
      createSuggestion(
        "calculator-how-to",
        "How to use it",
        "How do I use the calculator?",
      ),
      createSuggestion(
        "calculator-example",
        "Compare a trade",
        "Frost Dragon for Owl",
      ),
    ],
    context: {
      lastIntent: "navigation",
    },
  };
}

function createNichPageResponse(
  shouldNavigate: boolean,
): NichResponse {
  if (shouldNavigate) {
    return {
      text: "Opening the full Ask Nich page. 💬",
      intent: "navigation",
      reaction: "wave",
      typingDuration: 350,
      navigation: createNavigation(
        "/nich",
        "Open Ask Nich",
      ),
      context: {
        lastIntent: "navigation",
      },
    };
  }

  return {
    text: [
      "The Ask Nich page opens the full-size version of this assistant. 💬",
      "",
      "The floating and full-page versions use the same CSBT pet database and local brain.",
      "",
      "Tell me “Open Ask Nich” and I can take you there.",
    ].join("\n"),
    intent: "navigation",
    reaction: "wave",
    typingDuration: 550,
    suggestions: [
      createSuggestion(
        "nich-open-page",
        "Open Ask Nich",
        "Open Ask Nich",
      ),
      createSuggestion(
        "nich-capabilities",
        "What can you do?",
        "What can you do?",
      ),
      createSuggestion(
        "nich-values",
        "Check a pet",
        "What is Owl worth?",
      ),
    ],
    context: {
      lastIntent: "navigation",
    },
  };
}

function createAboutPageResponse(
  shouldNavigate: boolean,
): NichResponse {
  if (shouldNavigate) {
    return {
      text: "Opening the About page for you. ℹ️",
      intent: "navigation",
      reaction: "wave",
      typingDuration: 350,
      navigation: createNavigation(
        "/about",
        "Open About",
      ),
      context: {
        lastIntent: "navigation",
      },
    };
  }

  return {
    text: [
      "The About page contains information about CSBT HUB and the purpose of the website. ℹ️",
      "",
      "Tell me “Open the About page” and I can take you there.",
    ].join("\n"),
    intent: "navigation",
    reaction: "wave",
    typingDuration: 500,
    suggestions: [
      createSuggestion(
        "about-open-page",
        "Open About",
        "Open the About page",
      ),
      createSuggestion(
        "about-pages",
        "Website pages",
        "What pages are on this website?",
      ),
      createSuggestion(
        "about-nich",
        "About Nich",
        "Who are you?",
      ),
    ],
    context: {
      lastIntent: "navigation",
    },
  };
}

function createHomePageResponse(
  shouldNavigate: boolean,
): NichResponse {
  if (shouldNavigate) {
    return {
      text: "Taking you to the CSBT HUB Home page. 🏠",
      intent: "navigation",
      reaction: "welcome",
      typingDuration: 350,
      navigation: createNavigation(
        "/",
        "Open Home",
      ),
      context: {
        lastIntent: "navigation",
      },
    };
  }

  return {
    text: [
      "The Home page is the main CSBT HUB page. 🏠",
      "",
      "It includes quick actions, popular pets, the Meet Nich section, and website statistics.",
      "",
      "Tell me “Go Home” and I can take you there.",
    ].join("\n"),
    intent: "navigation",
    reaction: "welcome",
    typingDuration: 550,
    suggestions: [
      createSuggestion(
        "home-open-page",
        "Go Home",
        "Go Home",
      ),
      createSuggestion(
        "home-values",
        "Open Values",
        "Open the Values page",
      ),
      createSuggestion(
        "home-calculator",
        "Open Calculator",
        "Open the Calculator",
      ),
    ],
    context: {
      lastIntent: "navigation",
    },
  };
}

export function createWebsiteKnowledgeResponse(
  message: string,
): NichResponse | null {
  const normalizedMessage =
    normalizeText(message);

  if (!normalizedMessage) {
    return null;
  }

  if (
    includesAny(normalizedMessage, [
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

  const shouldNavigate =
    isNavigationCommand(normalizedMessage);

  if (
    includesAny(normalizedMessage, [
      "where is the calculator",
      "where is calculator",
      "where is the trade calculator",
      "open calculator",
      "open the calculator",
      "open trade calculator",
      "open the trade calculator",
      "go to calculator",
      "go to the calculator",
      "go to trade calculator",
      "take me to calculator",
      "take me to the calculator",
      "send me to calculator",
      "navigate to calculator",
      "calculator page",
      "trade calculator page",
      "find the calculator",
    ])
  ) {
    return createCalculatorPageResponse(
      shouldNavigate,
    );
  }

  if (
    includesAny(normalizedMessage, [
      "where is the values page",
      "where is values",
      "where can i check pet values",
      "how do i check pet values",
      "how can i check pet values",
      "open values",
      "open the values page",
      "go to values",
      "go to the values page",
      "take me to values",
      "take me to the values page",
      "send me to values",
      "navigate to values",
      "values page",
      "pet values page",
      "browse pet values",
      "search pet values",
    ])
  ) {
    return createValuesPageResponse(
      shouldNavigate,
    );
  }

  if (
    includesAny(normalizedMessage, [
      "where is ask nich",
      "where is the nich page",
      "where is nich page",
      "open ask nich",
      "open nich page",
      "open the nich page",
      "go to ask nich",
      "go to nich page",
      "take me to nich",
      "send me to nich",
      "navigate to nich",
      "ask nich page",
      "nich page",
    ])
  ) {
    return createNichPageResponse(
      shouldNavigate,
    );
  }

  if (
    includesAny(normalizedMessage, [
      "where is the about page",
      "where is about",
      "open about",
      "open the about page",
      "go to about",
      "go to the about page",
      "take me to about",
      "send me to about",
      "navigate to about",
      "about page",
      "what is on the about page",
      "what does the about page say",
    ])
  ) {
    return createAboutPageResponse(
      shouldNavigate,
    );
  }

  if (
    includesAny(normalizedMessage, [
      "where is the home page",
      "where is home",
      "open home",
      "open the home page",
      "go home",
      "go to home",
      "go to the home page",
      "take me home",
      "send me home",
      "navigate to home",
      "home page",
      "homepage",
      "main page",
    ])
  ) {
    return createHomePageResponse(
      shouldNavigate,
    );
  }

  return null;
}

export default createWebsiteKnowledgeResponse;