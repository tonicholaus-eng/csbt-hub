"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type Platform =
  | "discord"
  | "facebook"
  | "roblox";

type ResourceLink = {
  name: string;
  url: string;
  note: string;
};

type ResourceSection = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  platform: Platform;
  links: ResourceLink[];
};

const resourceSections: ResourceSection[] = [
  {
    id: "discord",
    title: "Discord Adopt Me Trading Servers",
    eyebrow: "Discord communities",
    description:
      "Open an invite to join Adopt Me trading, value-checking, and community servers.",
    platform: "discord",
    links: [
      {
        name: "AMTV",
        url: "https://discord.gg/amtv",
        note: "Discord invite",
      },
      {
        name: "Cross Trade",
        url: "https://discord.gg/crosstrade",
        note: "Discord invite",
      },
      {
        name: "Adopt Me Society Trading Values",
        url: "https://discord.gg/adopt-me-society-trading-values-1078386834016579645",
        note: "Discord invite",
      },
      {
        name: "Adopt Me",
        url: "https://discord.gg/adopt-me",
        note: "Discord invite",
      },
      {
        name: "Adopt Me Haven",
        url: "https://discord.gg/adoptmehaven",
        note: "Discord invite",
      },
    ],
  },
  {
    id: "facebook-trading",
    title: "Facebook Trading Groups",
    eyebrow: "Facebook communities",
    description:
      "Browse active community groups where members share offers, value checks, and trade posts.",
    platform: "facebook",
    links: [
      {
        name: "Facebook Trading Group 1",
        url: "https://www.facebook.com/share/g/1FnZpSuG8W/",
        note: "Community group",
      },
      {
        name: "Facebook Trading Group 2",
        url: "https://www.facebook.com/share/g/1GPFRcpNTE/",
        note: "Community group",
      },
      {
        name: "Facebook Trading Group 3",
        url: "https://www.facebook.com/share/g/1BdY9KxkE5/",
        note: "Community group",
      },
      {
        name: "Facebook Trading Group 4",
        url: "https://www.facebook.com/share/g/1LiN9jX3ht/",
        note: "Community group",
      },
      {
        name: "Facebook Trading Group 5",
        url: "https://www.facebook.com/share/g/1LPA4Zkb7J/",
        note: "Community group",
      },
    ],
  },
  {
    id: "roblox",
    title: "Roblox Trading Servers",
    eyebrow: "Roblox server links",
    description:
      "Launch an Adopt Me server link and continue through Roblox to join the available server.",
    platform: "roblox",
    links: [
      {
        name: "Roblox Trading Server 1",
        url: "https://www.roblox.com/share?code=950d1f68587d0b48a91d86368a44d61b&type=Server",
        note: "Shared server link",
      },
      {
        name: "Roblox Trading Server 2",
        url: "https://www.roblox.com/share?code=4f021c049cdd5c498ad8a034dc82ab21&type=Server",
        note: "Shared server link",
      },
      {
        name: "Roblox Trading Server 3",
        url: "https://www.roblox.com/share?code=bb17f8d1511f464e938bd151703dd7bc&type=Server",
        note: "Shared server link",
      },
      {
        name: "Roblox Trading Server 4",
        url: "https://www.roblox.com/share?code=f4d7809e39150d49999de54dfb4c8558&type=Server",
        note: "Shared server link",
      },
      {
        name: "Roblox Trading Server 5",
        url: "https://www.roblox.com/share?code=29e52ab7d8018549b816a69227c6847a&type=Server",
        note: "Shared server link",
      },
      {
        name: "Roblox Trading Server 6",
        url: "https://www.roblox.com/share?code=cfae7dbf50a53f4690ee0e9d1e9c6341&type=Server",
        note: "Shared server link",
      },
      {
        name: "Roblox Trading Server 7",
        url: "https://www.roblox.com/share?code=aba9aad8f16f914f8f5351964f3c8792&type=Server",
        note: "Shared server link",
      },
      {
        name: "Roblox Private Server 8",
        url: "https://www.roblox.com/games/920587237?privateServerLinkCode=64466865815622831329692512490332",
        note: "Private server link",
      },
      {
        name: "Roblox Private Server 9",
        url: "https://www.roblox.com/games/920587237?privateServerLinkCode=87112831421042745742578857754860",
        note: "Private server link",
      },
      {
        name: "Roblox Private Server 10",
        url: "https://www.roblox.com/games/920587237?privateServerLinkCode=64729388862024819046124584640165",
        note: "Private server link",
      },
    ],
  },
  {
    id: "facebook-buy-sell",
    title: "Facebook Buy and Sell Groups",
    eyebrow: "Community marketplaces",
    description:
      "Open the listed Facebook communities and review each group’s rules before posting or transacting.",
    platform: "facebook",
    links: [
      {
        name: "RTBNS",
        url: "https://www.facebook.com/share/g/1dLwtEGdw8/",
        note: "Buy and sell group",
      },
      {
        name: "CSBT",
        url: "https://www.facebook.com/share/g/1SftWjdr6h/",
        note: "Buy and sell group",
      },
      {
        name: "CC.ABST",
        url: "https://www.facebook.com/share/g/1BVvzV4YYw/",
        note: "Buy and sell group",
      },
    ],
  },
];

const platformStyles: Record<
  Platform,
  {
    label: string;
    icon: string;
    badge: string;
    iconBox: string;
    card: string;
    button: string;
  }
> = {
  discord: {
    label: "Discord",
    icon: "D",
    badge:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300",
    iconBox:
      "from-indigo-500 via-violet-500 to-fuchsia-500 shadow-indigo-500/20",
    card:
      "border-indigo-200/75 from-indigo-50/90 via-white/80 to-violet-50/70 dark:border-indigo-400/20 dark:from-indigo-500/[0.09] dark:via-slate-950/70 dark:to-violet-500/[0.05]",
    button:
      "from-indigo-600 via-violet-600 to-fuchsia-600 shadow-indigo-500/20",
  },
  facebook: {
    label: "Facebook",
    icon: "f",
    badge:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300",
    iconBox:
      "from-blue-600 via-blue-500 to-cyan-500 shadow-blue-500/20",
    card:
      "border-blue-200/75 from-blue-50/90 via-white/80 to-cyan-50/70 dark:border-blue-400/20 dark:from-blue-500/[0.09] dark:via-slate-950/70 dark:to-cyan-500/[0.05]",
    button:
      "from-blue-600 via-blue-500 to-cyan-500 shadow-blue-500/20",
  },
  roblox: {
    label: "Roblox",
    icon: "R",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
    iconBox:
      "from-rose-500 via-red-500 to-orange-500 shadow-rose-500/20",
    card:
      "border-rose-200/75 from-rose-50/90 via-white/80 to-orange-50/70 dark:border-rose-400/20 dark:from-rose-500/[0.09] dark:via-slate-950/70 dark:to-orange-500/[0.05]",
    button:
      "from-rose-600 via-red-500 to-orange-500 shadow-rose-500/20",
  },
};

const totalLinks = resourceSections.reduce(
  (total, section) =>
    total + section.links.length,
  0,
);

export default function TradingServersDirectory() {
  const [copiedUrl, setCopiedUrl] =
    useState<string | null>(null);

  const copyTimeoutRef =
    useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(
          copyTimeoutRef.current,
        );
      }
    };
  }, []);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const temporaryInput =
        document.createElement("textarea");

      temporaryInput.value = url;
      temporaryInput.style.position = "fixed";
      temporaryInput.style.opacity = "0";

      document.body.appendChild(
        temporaryInput,
      );

      temporaryInput.select();
      document.execCommand("copy");
      temporaryInput.remove();
    }

    setCopiedUrl(url);

    if (copyTimeoutRef.current) {
      window.clearTimeout(
        copyTimeoutRef.current,
      );
    }

    copyTimeoutRef.current =
      window.setTimeout(() => {
        setCopiedUrl(null);
      }, 1800);
  };

  return (
    <div className="space-y-7 sm:space-y-9">
      <section className="grid gap-3 rounded-[26px] border border-amber-200/80 bg-amber-50/80 p-4 shadow-sm backdrop-blur dark:border-amber-400/20 dark:bg-amber-400/[0.07] sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-4 sm:p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl shadow-lg shadow-amber-500/20">
          🛡️
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-black text-amber-950 dark:text-amber-200">
              Trade safely
            </h2>

            <span className="rounded-full border border-amber-300/70 bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-300">
              {totalLinks} external links
            </span>
          </div>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-900/75 dark:text-amber-100/65">
            CSBT HUB does not control most of these third-party communities. Never share your password, verification code, browser cookies, recovery codes, or account access. Review every group’s rules and verify the person you are dealing with before continuing.
          </p>
        </div>
      </section>

      <nav
        aria-label="Trading server categories"
        className="flex flex-wrap gap-2"
      >
        {resourceSections.map((section) => {
          const style =
            platformStyles[section.platform];

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black transition hover:-translate-y-0.5 hover:shadow-sm ${style.badge}`}
            >
              <span
                aria-hidden="true"
                className="text-sm"
              >
                {style.icon}
              </span>
              {section.title}
            </a>
          );
        })}
      </nav>

      {resourceSections.map((section) => {
        const style =
          platformStyles[section.platform];

        return (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-28"
            aria-labelledby={`${section.id}-title`}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${style.badge}`}
                  >
                    {style.label}
                  </span>

                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    {section.links.length}{" "}
                    {section.links.length === 1
                      ? "link"
                      : "links"}
                  </span>
                </div>

                <h2
                  id={`${section.id}-title`}
                  className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl"
                >
                  {section.title}
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {section.description}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.links.map(
                (resource, index) => (
                  <article
                    key={resource.url}
                    className={`group relative overflow-hidden rounded-[24px] border bg-gradient-to-br p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-5 ${style.card}`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-black text-white shadow-lg ${style.iconBox}`}
                        aria-hidden="true"
                      >
                        {style.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          {section.eyebrow} · {index + 1}
                        </p>

                        <h3 className="mt-1 truncate text-base font-black text-slate-950 dark:text-white">
                          {resource.name}
                        </h3>

                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {resource.note}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-3 text-xs font-black text-white shadow-lg outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${style.button}`}
                        aria-label={`Open ${resource.name}`}
                      >
                        Open link
                        <ExternalLinkIcon />
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          void copyLink(resource.url)
                        }
                        className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-3 text-slate-600 shadow-sm outline-none transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={`Copy ${resource.name} link`}
                        title={
                          copiedUrl === resource.url
                            ? "Copied"
                            : "Copy link"
                        }
                      >
                        {copiedUrl === resource.url ? (
                          <CheckIcon />
                        ) : (
                          <CopyIcon />
                        )}
                      </button>
                    </div>

                    <p
                      className="mt-3 truncate rounded-lg bg-white/45 px-2.5 py-2 font-mono text-[10px] text-slate-400 dark:bg-black/10 dark:text-slate-500"
                      title={resource.url}
                    >
                      {resource.url}
                    </p>
                  </article>
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 5h5v5" />
      <path d="m10 14 9-9" />
      <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
      />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-green-600 dark:text-green-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}