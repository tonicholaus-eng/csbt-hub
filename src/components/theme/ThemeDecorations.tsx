"use client";

import { usePathname } from "next/navigation";

type Motif = "sparkle" | "diamond" | "trade" | "paw" | "coin" | "bubble" | "chart" | "box" | "moon" | "bat" | "ghost" | "pumpkin" | "web" | "cloud" | "heart" | "game" | "search" | "calculator";

type Deco = { motif: Motif; x: number; y: number; size: number; rotate: number; mobile?: boolean; large?: boolean };

const common: Deco[] = [
  { motif: "sparkle", x: 7, y: 16, size: 34, rotate: -8, mobile: true },
  { motif: "trade", x: 88, y: 12, size: 58, rotate: 8 },
  { motif: "diamond", x: 82, y: 47, size: 42, rotate: 10, mobile: true },
  { motif: "paw", x: 12, y: 69, size: 56, rotate: -12 },
  { motif: "bubble", x: 92, y: 79, size: 46, rotate: 6 },
  { motif: "coin", x: 31, y: 91, size: 34, rotate: -5 },
];

const halloween: Deco[] = [
  { motif: "moon", x: 92, y: 8, size: 112, rotate: -8 },
  { motif: "bat", x: 77, y: 23, size: 40, rotate: 12, mobile: true },
  { motif: "ghost", x: 9, y: 34, size: 52, rotate: -6 },
  { motif: "pumpkin", x: 91, y: 66, size: 98, rotate: 10 },
  { motif: "web", x: 5, y: 88, size: 112, rotate: 0 },
  { motif: "sparkle", x: 24, y: 12, size: 28, rotate: 9, mobile: true },
];

const light: Deco[] = [
  { motif: "cloud", x: 8, y: 13, size: 92, rotate: -4 },
  { motif: "heart", x: 91, y: 18, size: 38, rotate: 10, mobile: true },
  { motif: "game", x: 84, y: 64, size: 76, rotate: -7 },
  { motif: "diamond", x: 13, y: 74, size: 48, rotate: 8, mobile: true },
  { motif: "sparkle", x: 69, y: 88, size: 31, rotate: -10 },
  { motif: "trade", x: 31, y: 9, size: 48, rotate: 3 },
];

const pageMotifs: Record<string, Motif[]> = {
  values: ["search", "coin", "diamond"],
  inventory: ["box", "paw", "diamond"],
  exchange: ["trade", "bubble", "diamond"],
  demand: ["chart", "sparkle", "coin"],
  calculator: ["calculator", "trade", "diamond"],
  community: ["bubble", "heart", "sparkle"],
  nich: ["sparkle", "bubble", "diamond"],
};

function pageKey(pathname: string) {
  if (pathname.startsWith("/values")) return "values";
  if (pathname.startsWith("/inventory")) return "inventory";
  if (pathname.startsWith("/exchange")) return "exchange";
  if (pathname.startsWith("/demand")) return "demand";
  if (pathname.startsWith("/calculator")) return "calculator";
  if (pathname.startsWith("/community") || pathname.startsWith("/trade-feed")) return "community";
  if (pathname.startsWith("/nich")) return "nich";
  return "home";
}

function MotifIcon({ motif }: { motif: Motif }) {
  const commonProps = { viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (motif) {
    case "sparkle": return <svg {...commonProps}><path d="M32 6c2 14 8 22 24 26-16 4-22 12-24 26-2-14-8-22-24-26C24 28 30 20 32 6Z"/><path d="M50 7v10M45 12h10"/></svg>;
    case "diamond": return <svg {...commonProps}><path d="m12 24 10-12h20l10 12-20 28L12 24Z"/><path d="m22 12 10 40 10-40M12 24h40"/></svg>;
    case "trade": return <svg {...commonProps}><path d="M10 21h36l-9-9m9 9-9 9M54 43H18l9 9m-9-9 9-9"/></svg>;
    case "paw": return <svg {...commonProps}><ellipse cx="32" cy="39" rx="15" ry="12"/><circle cx="16" cy="25" r="6"/><circle cx="28" cy="17" r="6"/><circle cx="42" cy="18" r="6"/><circle cx="50" cy="29" r="6"/></svg>;
    case "coin": return <svg {...commonProps}><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="15"/><path d="M25 35c2 4 12 5 14 0 2-5-12-4-10-10 2-4 10-3 12 0M33 17v30"/></svg>;
    case "bubble": return <svg {...commonProps}><path d="M10 13h44v31H28L15 53v-9h-5V13Z"/><path d="M20 25h24M20 33h16"/></svg>;
    case "chart": return <svg {...commonProps}><path d="M10 50V12M10 50h44M17 41l10-11 8 6 13-17"/><path d="M43 19h5v5"/></svg>;
    case "box": return <svg {...commonProps}><path d="m12 22 20-10 20 10-20 10-20-10Z"/><path d="M12 22v25l20 9 20-9V22M32 32v24"/></svg>;
    case "moon": return <svg {...commonProps}><path d="M45 49A24 24 0 0 1 30 7a20 20 0 1 0 15 42Z"/></svg>;
    case "bat": return <svg {...commonProps}><path d="M32 29c-6-10-14-12-23-6 6 3 8 8 7 14 5-4 10-4 16 4 6-8 11-8 16-4-1-6 1-11 7-14-9-6-17-4-23 6Z"/><path d="m28 23 4 6 4-6"/></svg>;
    case "ghost": return <svg {...commonProps}><path d="M16 54V29a16 16 0 0 1 32 0v25l-8-6-8 6-8-6-8 6Z"/><circle cx="26" cy="30" r="2" fill="currentColor"/><circle cx="38" cy="30" r="2" fill="currentColor"/></svg>;
    case "pumpkin": return <svg {...commonProps}><path d="M32 17c-17-8-27 5-23 22 3 14 15 18 23 10 8 8 20 4 23-10 4-17-6-30-23-22Z"/><path d="M32 17c-8 4-10 28 0 32M32 17c8 4 10 28 0 32M31 15c0-5 4-8 8-8"/></svg>;
    case "web": return <svg {...commonProps}><path d="M4 4h56M4 4v56M4 4l42 42M4 20c11 0 20-5 20-16M4 36c21 0 36-11 36-32M20 4c0 11-5 20-16 20M36 4c0 21-11 36-32 36"/></svg>;
    case "cloud": return <svg {...commonProps}><path d="M14 45h35a10 10 0 0 0 1-20 16 16 0 0 0-30-3 12 12 0 0 0-6 23Z"/></svg>;
    case "heart": return <svg {...commonProps}><path d="M32 53 10 33C-2 20 16 5 32 22 48 5 66 20 54 33L32 53Z"/></svg>;
    case "game": return <svg {...commonProps}><path d="M17 21h30c8 0 13 20 10 27-3 7-11 4-17-4H24c-6 8-14 11-17 4-3-7 2-27 10-27Z"/><path d="M19 32h12M25 26v12"/><circle cx="44" cy="31" r="2" fill="currentColor"/><circle cx="50" cy="37" r="2" fill="currentColor"/></svg>;
    case "search": return <svg {...commonProps}><circle cx="28" cy="28" r="17"/><path d="m41 41 13 13"/></svg>;
    case "calculator": return <svg {...commonProps}><rect x="15" y="7" width="34" height="50" rx="6"/><path d="M22 16h20v10H22zM22 35h4m8 0h4m-16 9h4m8 0h4"/></svg>;
  }
}

function ThemeLayer({ kind, items }: { kind: "dark" | "halloween" | "light"; items: Deco[] }) {
  return <div className={`theme-decoration-layer theme-decoration-layer--${kind}`} aria-hidden="true">{items.map((item, index) => <span key={`${item.motif}-${index}`} className={`theme-sticker ${item.mobile ? "theme-sticker--mobile" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: item.size, height: item.size, transform: `translate(-50%,-50%) rotate(${item.rotate}deg)` }}><MotifIcon motif={item.motif} /></span>)}</div>;
}

export default function ThemeDecorations() {
  const pathname = usePathname();
  const key = pageKey(pathname);
  const contextual = pageMotifs[key] ?? [];
  const contextItems: Deco[] = contextual.map((motif, index) => ({ motif, x: [20, 58, 74][index] ?? 50, y: [31, 58, 82][index] ?? 50, size: [50, 42, 58][index] ?? 48, rotate: [-8, 7, -4][index] ?? 0, mobile: index === 0 }));

  return (
    <div className="theme-decorations" data-page={key} aria-hidden="true">
      <ThemeLayer kind="dark" items={[...common, ...contextItems]} />
      <ThemeLayer kind="halloween" items={[...halloween, ...contextItems]} />
      <ThemeLayer kind="light" items={[...light, ...contextItems]} />
    </div>
  );
}
