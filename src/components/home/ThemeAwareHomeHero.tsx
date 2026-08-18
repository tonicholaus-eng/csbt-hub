"use client";

import Hero from "../Hero";
import { useCSBTTheme } from "../ThemeProvider";
import SnoopyHomeHero from "./SnoopyHomeHero";
import RobloxHomeHero from "./RobloxHomeHero";
import HalloweenHomeHero from "./HalloweenHomeHero";

type Props = {
  totalItems: number;
  categoryCount: number;
  generatedAt: string;
};

export default function ThemeAwareHomeHero(props: Props) {
  const { theme } = useCSBTTheme();

  return (
    <div className="home-hero-theme-slot" data-rendered-theme={theme}>
      {theme === "snoopy" ? <SnoopyHomeHero {...props} /> : theme === "light" ? <RobloxHomeHero {...props} /> : theme === "halloween" ? <HalloweenHomeHero {...props} /> : <Hero {...props} />}
    </div>
  );
}
