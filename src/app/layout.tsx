import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";

import GlobalNichAssistant from "../components/nich/GlobalNichAssistant";
import PerformanceProvider from "../components/PerformanceProvider";
import ThemeProvider from "../components/ThemeProvider";
import GameBoundary from "../components/GameBoundary";
import ThemeDecorations from "../components/theme/ThemeDecorations";
import BirthdayEventGateway from "../components/birthday/BirthdayEventGateway";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://csbthub.com"),

  title: {
    default: "CSBT HUB | POGI NI NICH",
    template: "%s | CSBT HUB",
  },

  description:
    "Explore Adopt Me GCash and Elve Shark values, compare trades, track your inventory, follow demand and value history, set alerts, vote W/F/L, and ask Nich on CSBT HUB.",

  keywords: [
    "Adopt Me",
    "Adopt Me Values",
    "CSBT",
    "CSBT HUB",
    "Trade Calculator",
    "Adopt Me Trade Calculator",
    "Roblox Adopt Me",
    "Pet Values",
    "Neon Values",
    "Mega Values",
  ],

  authors: [
    {
      name: "CSBT HUB",
    },
  ],

  creator: "CSBT HUB",
  publisher: "CSBT HUB",

  openGraph: {
    title: "CSBT HUB | POGI NI NICH",
    description:
      "Explore Adopt Me values, compare trades, track inventory, follow demand and value history, vote W/F/L, and ask Nich.",
    url: "https://csbthub.com",
    siteName: "CSBT HUB",
    locale: "en_US",
    type: "website",

    images: [
      {
        url: "/csbt-preview-v3.png",
        width: 1200,
        height: 630,
        alt: "CSBT HUB",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "CSBT HUB | POGI NI NICH",
    description:
      "Explore Adopt Me values, compare trades, track inventory, follow demand and value history, vote W/F/L, and ask Nich.",
    images: ["/csbt-preview-v3.png"],
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  robots: {
    index: true,
    follow: true,
  },
};


/**
 * Appearance and game boundary, both set before first paint.
 *
 * `data-theme` is the user's saved *preference*. `data-game` is which game the
 * current URL belongs to, and it is what decides whether that preference is
 * allowed to style anything: every Adopt Me appearance rule in globals.css is
 * gated on `:not([data-game="mm2"])`.
 *
 * Both are written by this inline script rather than by React, because a user
 * landing directly on /mm2 with "snoopy" saved would otherwise get one painted
 * frame of Adopt Me's cream palette before hydration corrected it.
 */
const themeInitScript = `
(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("csbt-theme");
    var theme = saved === "halloween" || saved === "light" || saved === "snoopy" || saved === "dark" ? saved : "dark";
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark" || theme === "halloween");
    root.style.colorScheme = theme === "light" || theme === "snoopy" ? "light" : "dark";
  } catch (_) {
    root.dataset.theme = "dark";
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
  try {
    var path = location.pathname;
    var isMM2 = path === "/mm2" || path.indexOf("/mm2/") === 0;
    root.dataset.game = isMM2 ? "mm2" : "adopt-me";
    // MM2 is a dark product whatever Adopt Me is set to. Two things follow from
    // that and neither can be expressed in gated CSS: color-scheme is an inline
    // style, and the .dark class is what Tailwind's dark: variants key off — the
    // shared Exchange, Lounge and Trade Opinions components render inside MM2
    // and would otherwise use their light values under a Snoopy preference.
    if (isMM2) {
      root.style.colorScheme = "dark";
      root.classList.add("dark");
    }
  } catch (_) {
    root.dataset.game = "adopt-me";
  }
})();
`;

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={plusJakartaSans.variable}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "CSBT HUB", url: "https://csbthub.com", description: "Adopt Me values, trading tools, demand, inventory, CSBT Exchange, and Nich assistant.", publisher: { "@type": "Organization", name: "CSBT HUB", url: "https://csbthub.com", logo: "https://csbthub.com/logo.png" } }) }} />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <GameBoundary />
          <PerformanceProvider>
            <ThemeDecorations />
            <BirthdayEventGateway />
            {children}
            <GlobalNichAssistant />
          </PerformanceProvider>
        </ThemeProvider>

        <GoogleAnalytics gaId="G-XZN26M5996" />
      </body>
    </html>
  );
}