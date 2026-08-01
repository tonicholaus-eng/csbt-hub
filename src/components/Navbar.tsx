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
    description: "Homepage",
    icon: "home",
  },
  {
    label: "Values",
    href: "/values",
    description: "Pet and Pet Wear values",
    icon: "values",
  },
  {
    label: "Calculator",
    href: "/calculator",
    description: "Compare both offers",
    icon: "calculator",
  },
  {
    label: "Community",
    href: "/community",
    description: "Live posts and screenshots",
    icon: "community",
  },
  {
    label: "Ask Nich",
    href: "/nich",
    description: "CSBT trading assistant",
    icon: "nich",
  },
  {
    label: "About",
    href: "/about",
    description: "Learn about CSBT HUB",
    icon: "about",
  },
] as const;

type NavigationIconName =
  (typeof navigationLinks)[number]["icon"];

export default function Navbar() {
  const pathname = usePathname();

  const [open, setOpen] =
    useState(false);

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

    document.body.style.overflow =
      "hidden";

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
      pathname.startsWith(
        `${href}/`,
      )
    );
  };

  return (
    <>
      {/* Desktop left sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-50 hidden w-72 p-4 lg:block"
        aria-label="CSBT HUB sidebar"
      >
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/55 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/82 dark:shadow-[0_28px_90px_rgba(0,0,0,.42)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.14),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,.11),transparent_42%)]" />

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="border-b border-slate-200/75 px-5 py-5 dark:border-white/10">
              <Link
                href="/"
                className="group flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                aria-label="Go to CSBT HUB home"
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={54}
                  height={54}
                  priority
                  className="h-[54px] w-[54px] shrink-0 rounded-full object-cover shadow-md transition duration-300 group-hover:rotate-6 group-hover:scale-105"
                />

                <div className="min-w-0">
                  <span className="block truncate text-xl font-black tracking-tight text-amber-900 dark:text-amber-300">
                    CSBT HUB
                  </span>

                  <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    Adopt Me Values
                  </span>
                </div>
              </Link>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
              <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Navigation
              </p>

              <nav
                className="mt-3 space-y-1.5"
                aria-label="Main navigation"
              >
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
                        aria-current={
                          active
                            ? "page"
                            : undefined
                        }
                        className={`group relative flex items-center gap-3 rounded-2xl px-3 py-3.5 outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-amber-500 ${
                          active
                            ? "bg-gradient-to-r from-amber-100 to-orange-50 text-amber-900 shadow-sm dark:from-amber-400/15 dark:to-orange-400/5 dark:text-amber-200"
                            : "text-slate-700 hover:bg-amber-50/80 hover:text-amber-800 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-amber-300"
                        }`}
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500"
                          />
                        )}

                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                            active
                              ? "bg-white/80 text-amber-600 shadow-sm dark:bg-white/10 dark:text-amber-300"
                              : "bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:text-amber-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:bg-white/10 dark:group-hover:text-amber-300"
                          }`}
                        >
                          <NavigationIcon
                            name={link.icon}
                          />
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black">
                            {link.label}
                          </span>

                          <span
                            className={`mt-0.5 block truncate text-[11px] font-medium ${
                              active
                                ? "text-amber-700/75 dark:text-amber-200/65"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {
                              link.description
                            }
                          </span>
                        </span>

                        <span
                          aria-hidden="true"
                          className={`ml-auto text-base transition duration-200 ${
                            active
                              ? "translate-x-0 text-amber-500"
                              : "-translate-x-1 text-slate-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 dark:text-slate-600"
                          }`}
                        >
                          ›
                        </span>
                      </Link>
                    );
                  },
                )}
              </nav>
            </div>

            <div className="relative border-t border-slate-200/75 p-4 dark:border-white/10">
              <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-2.5">
                <ThemeButton
                  mounted={mounted}
                  resolvedTheme={
                    resolvedTheme
                  }
                  onClick={toggleTheme}
                />

                <a
                  href="https://www.facebook.com/groups/5352107604807631"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 outline-none transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                >
                  <span className="truncate">
                    Join CSBT
                  </span>

                  <span aria-hidden="true">
                    →
                  </span>
                </a>
              </div>

              <p className="mt-3 text-center text-[10px] font-medium text-slate-400 dark:text-slate-600">
                More pages can be added to the navigation list.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile and tablet top navigation */}
      <header
        className={`sticky top-0 z-50 px-3 transition-[padding] duration-300 lg:hidden ${
          scrolled
            ? "py-2"
            : "py-3 sm:py-4"
        }`}
      >
        <div
          className={`mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/50 bg-white/80 backdrop-blur-2xl transition-[background-color,border-color,box-shadow] duration-300 dark:border-white/10 dark:bg-slate-950/80 ${
            scrolled
              ? "shadow-lg shadow-slate-900/10 dark:shadow-black/30"
              : "shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          }`}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
            <Link
              href="/"
              onClick={closeMenu}
              className="group flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              aria-label="Go to CSBT HUB home"
            >
              <Image
                src="/logo.png"
                alt=""
                width={48}
                height={48}
                priority
                className="h-11 w-11 shrink-0 rounded-full object-cover transition duration-300 group-hover:rotate-6 group-hover:scale-105 sm:h-12 sm:w-12"
              />

              <div className="min-w-0">
                <span className="block truncate text-lg font-extrabold tracking-tight text-amber-900 dark:text-amber-300 sm:text-xl">
                  CSBT HUB
                </span>

                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  Adopt Me Values
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeButton
                mounted={mounted}
                resolvedTheme={
                  resolvedTheme
                }
                onClick={toggleTheme}
                compact
              />

              <button
                type="button"
                onClick={() => {
                  setOpen(
                    (current) =>
                      !current,
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

          <div
            id="mobile-navigation"
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
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
                          onClick={
                            closeMenu
                          }
                          aria-current={
                            active
                              ? "page"
                              : undefined
                          }
                          className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-amber-500 ${
                            active
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300"
                              : "text-slate-700 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-amber-300"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm dark:bg-white/5">
                            <NavigationIcon
                              name={
                                link.icon
                              }
                            />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate">
                              {link.label}
                            </span>

                            <span className="block truncate text-[10px] font-medium opacity-60">
                              {
                                link.description
                              }
                            </span>
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
    </>
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
          : "h-12 w-12 rounded-2xl shadow-sm"
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

function NavigationIcon({
  name,
}: {
  name: NavigationIconName;
}) {
  switch (name) {
    case "home":
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
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );

    case "values":
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
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h10" />
          <path d="m17 16 2 2 3-4" />
        </svg>
      );

    case "calculator":
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
          <rect
            x="5"
            y="2"
            width="14"
            height="20"
            rx="2"
          />
          <path d="M8 6h8" />
          <path d="M8 10h.01" />
          <path d="M12 10h.01" />
          <path d="M16 10h.01" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h4" />
        </svg>
      );

    case "community":
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
          <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M8 10h8" />
          <path d="M8 13h5" />
        </svg>
      );

    case "nich":
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
          <path d="M8 10h8" />
          <path d="M9 14h6" />
          <path d="M12 2v3" />
          <rect
            x="4"
            y="5"
            width="16"
            height="15"
            rx="4"
          />
          <circle
            cx="9"
            cy="10"
            r=".5"
            fill="currentColor"
          />
          <circle
            cx="15"
            cy="10"
            r=".5"
            fill="currentColor"
          />
        </svg>
      );

    case "about":
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
            r="9"
          />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      );
  }
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