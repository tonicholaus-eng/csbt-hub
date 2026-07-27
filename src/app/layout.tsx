import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CSBT Market",
  description: "CSBT Market Price Checker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}