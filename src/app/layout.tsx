import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import GlobalNichAssistant from "../components/nich/GlobalNichAssistant";
import ThemeProvider from "../components/ThemeProvider";

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
  metadataBase: new URL(
    "https://csbt-hub.vercel.app",
  ),

  title: {
    default:
      "CSBT HUB | Adopt Me Value Checker",
    template: "%s | CSBT HUB",
  },

  description:
    "Check the latest Adopt Me pet values with CSBT HUB. Search every pet, compare Normal, Neon and Mega values, and use the free Trade Calculator before accepting trades.",

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
    title:
      "CSBT HUB | Adopt Me Value Checker",
    description:
      "Search the latest CSBT Adopt Me values and compare trades instantly.",
    url: "https://csbt-hub.vercel.app",
    siteName: "CSBT HUB",
    locale: "en_US",
    type: "website",

    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "CSBT HUB Logo",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title:
      "CSBT HUB | Adopt Me Value Checker",
    description:
      "Search Adopt Me values and compare trades instantly.",
    images: ["/logo.png"],
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  robots: {
    index: true,
    follow: true,
  },
};

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
      <body className="min-h-screen overflow-x-hidden bg-[#fff8e9] font-sans text-slate-800 antialiased transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100">
        <ThemeProvider>
          {children}

          <GlobalNichAssistant />
        </ThemeProvider>
      </body>
    </html>
  );
}