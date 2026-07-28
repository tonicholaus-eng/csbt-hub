import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://csbt-hub.vercel.app"), // Change after deploying

  title: {
    default: "CSBT HUB | Adopt Me Value Checker",
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
    title: "CSBT HUB | Adopt Me Value Checker",
    description:
      "Search the latest CSBT Adopt Me values and compare trades instantly.",
    url: "https://your-domain.com",
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
    title: "CSBT HUB | Adopt Me Value Checker",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}