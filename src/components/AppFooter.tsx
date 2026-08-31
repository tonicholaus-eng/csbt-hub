import Link from "next/link";

const links = [
  { href: "/values", label: "Values" },
  { href: "/exchange", label: "CSBT Exchange" },
  { href: "/trade-feed", label: "Trade Opinions" },
  { href: "/nich", label: "Ask NICH" },
  { href: "/community-guidelines", label: "Guidelines" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export default function AppFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_72%,transparent)]">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-2 px-4 py-4 text-[10px] font-semibold text-[var(--foreground-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <p>© {new Date().getFullYear()} CSBT HUB · Independent community project.</p>
        <nav aria-label="App footer navigation" className="flex flex-wrap gap-x-4 gap-y-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-[var(--foreground)]">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
