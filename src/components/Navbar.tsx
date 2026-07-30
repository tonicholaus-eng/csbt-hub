"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useEffect,
  useState,
} from "react";

const navigationLinks = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Values",
    href: "/values",
  },
  {
    label: "Calculator",
    href: "/calculator",
  },
  {
    label: "Ask Nich",
    href: "/nich",
  },
  {
    label: "About",
    href: "/about",
  },
] as const;

export default function Navbar() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] =
    useState(false);
  const [mounted, setMounted] =
    useState(false);

  const {
    resolvedTheme,
    setTheme,
  } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  const toggleTheme = () => {
    setTheme(
      resolvedTheme === "dark"
        ? "light"
        : "dark",
    );
  };

  const closeMenu = () => {
    setOpen(false);
  };

  const isLinkActive = (
    href: string,
  ) => {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 px-3 transition-[padding] duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div
        className={`mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/50 bg-white/75 backdrop-blur-2xl transition-[background-color,border-color,box-shadow] duration-300 dark:border-white/10 dark:bg-slate-950/75 ${
          scrolled
            ? "shadow-lg shadow-slate-900/10 dark:shadow-black/30"
            : "shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          {/* Logo */}

          <Link
            href="/"
            onClick={closeMenu}
            className="group flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            aria-label="Go to CSBT HUB home"
          >
            <Image
              src="/logo.png"
              alt=""
              width={50}
              height={50}
              priority
              className="h-11 w-11 shrink-0 rounded-full object-cover transition duration-300 group-hover:rotate-6 group-hover:scale-105 sm:h-[50px] sm:w-[50px]"
            />

            <div className="min-w-0">
              <span className="block truncate text-lg font-extrabold tracking-tight text-amber-900 transition-colors dark:text-amber-300 sm:text-xl">
                CSBT HUB
              </span>

              <span className="block truncate text-xs text-slate-500 transition-colors dark:text-slate-400">
                Adopt Me Values
              </span>
            </div>
          </Link>

          {/* Desktop navigation */}

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Main navigation"
          >
            {navigationLinks.map(
              (link) => {
                const active =
                  isLinkActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                    className={`relative rounded-xl px-3 py-2 text-sm font-semibold outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-amber-500 xl:px-4 ${
                      active
                        ? "bg-amber-100 text-amber-800 shadow-sm dark:bg-amber-400/10 dark:text-amber-300"
                        : "text-slate-700 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-amber-300"
                    }`}
                  >
                    {link.label}

                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      />
                    )}
                  </Link>
                );
              },
            )}
          </nav>

          {/* Desktop actions */}

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeButton
              mounted={mounted}
              resolvedTheme={resolvedTheme}
              onClick={toggleTheme}
            />

            <a
              href="https://www.facebook.com/groups/5352107604807631"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 outline-none transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 xl:px-6"
            >
              Join CSBT
              <span aria-hidden="true">
                {" "}
                →
              </span>
            </a>
          </div>

          {/* Mobile actions */}

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeButton
              mounted={mounted}
              resolvedTheme={resolvedTheme}
              onClick={toggleTheme}
              compact
            />

            <button
              type="button"
              onClick={() => {
                setOpen(
                  (current) => !current,
                );
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-slate-200 dark:hover:bg-white/10"
              aria-label={
                open
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              {open ? (
                <CloseIcon />
              ) : (
                <MenuIcon />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}

        <div
          id="mobile-navigation"
          className={`grid transition-[grid-template-rows] duration-300 ease-out lg:hidden ${
            open
              ? "grid-rows-[1fr]"
              : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <nav
              className="border-t border-slate-200/70 px-4 py-4 dark:border-white/10 sm:px-6"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col gap-2">
                {navigationLinks.map(
                  (link) => {
                    const active =
                      isLinkActive(
                        link.href,
                      );

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeMenu}
                        aria-current={
                          active
                            ? "page"
                            : undefined
                        }
                        className={`flex items-center justify-between rounded-xl px-4 py-3 font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-amber-500 ${
                          active
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"
                            : "text-slate-700 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-amber-300"
                        }`}
                      >
                        <span>
                          {link.label}
                        </span>

                        {active && (
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full bg-amber-500"
                          />
                        )}
                      </Link>
                    );
                  },
                )}

                <a
                  href="https://www.facebook.com/groups/5352107604807631"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="mt-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-center font-bold text-white shadow-lg shadow-blue-500/20 outline-none transition hover:shadow-xl focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Join CSBT
                  <span aria-hidden="true">
                    {" "}
                    →
                  </span>
                </a>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

type ThemeButtonProps = {
  mounted: boolean;
  resolvedTheme:
    | string
    | undefined;
  onClick: () => void;
  compact?: boolean;
};

function ThemeButton({
  mounted,
  resolvedTheme,
  onClick,
  compact = false,
}: ThemeButtonProps) {
  const isDark =
    mounted &&
    resolvedTheme === "dark";

  const label = isDark
    ? "Switch to light mode"
    : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!mounted}
      className={`inline-flex items-center justify-center border border-slate-200/80 bg-white/70 text-slate-700 outline-none transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 ${
        compact
          ? "h-10 w-10 rounded-xl"
          : "h-11 w-11 rounded-2xl shadow-sm"
      }`}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
      />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.42 1.42" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.9 15.5A9 9 0 0 1 8.5 3.1 9 9 0 1 0 20.9 15.5Z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}