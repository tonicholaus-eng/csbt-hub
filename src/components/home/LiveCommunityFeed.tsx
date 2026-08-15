"use client";

import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import {
  type Session,
  type User,
} from "@supabase/supabase-js";
import type {
  FormEvent,
} from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MAX_POST_LENGTH = 2000;
const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;
const MAX_VISIBLE_POSTS = 100;
const STORAGE_BUCKET =
  "community-images";
const AVATAR_BUCKET =
  "avatars";
const MAX_AVATAR_SOURCE_SIZE =
  5 * 1024 * 1024;
const MAX_AVATAR_UPLOAD_SIZE =
  750 * 1024;
const AVATAR_SIZE = 512;


type CommunityPostRow = {
  id: string;
  user_id: string;
  display_name: string;
  content: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
};

type CommunityPost = CommunityPostRow & {
  image_url: string | null;
};

type CommunityPostChangePayload = {
  new: Partial<CommunityPostRow>;
  old: Partial<CommunityPostRow>;
};

type CommunityProfileRow = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
};

type CommunityProfile =
  CommunityProfileRow & {
    avatar_url: string | null;
  };

type CommunityProfileChangePayload = {
  new: Partial<CommunityProfileRow>;
  old: Partial<CommunityProfileRow>;
};

type Notice = {
  type: "success" | "error" | "info";
  text: string;
};

type UserAccent = {
  avatar: string;
  ring: string;
  card: string;
  bar: string;
  dot: string;
  name: string;
};

type PostKind =
  | "giveaway"
  | "wfl"
  | "trade"
  | "value"
  | "question"
  | "media"
  | "update";

const USER_ACCENTS: readonly UserAccent[] = [
  {
    avatar:
      "from-violet-500 via-fuchsia-500 to-pink-500",
    ring:
      "ring-violet-300/70 dark:ring-violet-400/35",
    card:
      "border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white/85 to-fuchsia-50/70 dark:border-violet-400/20 dark:from-violet-500/[0.09] dark:via-slate-950/72 dark:to-fuchsia-500/[0.05]",
    bar:
      "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500",
    dot:
      "bg-violet-500",
    name:
      "text-violet-800 dark:text-violet-200",
  },
  {
    avatar:
      "from-cyan-500 via-sky-500 to-blue-600",
    ring:
      "ring-cyan-300/70 dark:ring-cyan-400/35",
    card:
      "border-cyan-200/80 bg-gradient-to-br from-cyan-50/90 via-white/85 to-blue-50/70 dark:border-cyan-400/20 dark:from-cyan-500/[0.09] dark:via-slate-950/72 dark:to-blue-500/[0.05]",
    bar:
      "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600",
    dot:
      "bg-cyan-500",
    name:
      "text-cyan-800 dark:text-cyan-200",
  },
  {
    avatar:
      "from-emerald-500 via-teal-500 to-cyan-600",
    ring:
      "ring-emerald-300/70 dark:ring-emerald-400/35",
    card:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white/85 to-teal-50/70 dark:border-emerald-400/20 dark:from-emerald-500/[0.09] dark:via-slate-950/72 dark:to-teal-500/[0.05]",
    bar:
      "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600",
    dot:
      "bg-emerald-500",
    name:
      "text-emerald-800 dark:text-emerald-200",
  },
  {
    avatar:
      "from-amber-400 via-orange-500 to-red-500",
    ring:
      "ring-amber-300/70 dark:ring-amber-400/35",
    card:
      "border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white/85 to-orange-50/70 dark:border-amber-400/20 dark:from-amber-500/[0.09] dark:via-slate-950/72 dark:to-orange-500/[0.05]",
    bar:
      "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500",
    dot:
      "bg-amber-500",
    name:
      "text-amber-800 dark:text-amber-200",
  },
  {
    avatar:
      "from-rose-500 via-pink-500 to-fuchsia-600",
    ring:
      "ring-rose-300/70 dark:ring-rose-400/35",
    card:
      "border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-white/85 to-pink-50/70 dark:border-rose-400/20 dark:from-rose-500/[0.09] dark:via-slate-950/72 dark:to-pink-500/[0.05]",
    bar:
      "bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600",
    dot:
      "bg-rose-500",
    name:
      "text-rose-800 dark:text-rose-200",
  },
  {
    avatar:
      "from-indigo-500 via-blue-500 to-cyan-500",
    ring:
      "ring-indigo-300/70 dark:ring-indigo-400/35",
    card:
      "border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white/85 to-sky-50/70 dark:border-indigo-400/20 dark:from-indigo-500/[0.09] dark:via-slate-950/72 dark:to-sky-500/[0.05]",
    bar:
      "bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500",
    dot:
      "bg-indigo-500",
    name:
      "text-indigo-800 dark:text-indigo-200",
  },
  {
    avatar:
      "from-lime-500 via-green-500 to-emerald-600",
    ring:
      "ring-lime-300/70 dark:ring-lime-400/35",
    card:
      "border-lime-200/80 bg-gradient-to-br from-lime-50/90 via-white/85 to-emerald-50/70 dark:border-lime-400/20 dark:from-lime-500/[0.09] dark:via-slate-950/72 dark:to-emerald-500/[0.05]",
    bar:
      "bg-gradient-to-r from-lime-500 via-green-500 to-emerald-600",
    dot:
      "bg-lime-500",
    name:
      "text-lime-800 dark:text-lime-200",
  },
  {
    avatar:
      "from-red-500 via-orange-500 to-amber-500",
    ring:
      "ring-red-300/70 dark:ring-red-400/35",
    card:
      "border-red-200/80 bg-gradient-to-br from-red-50/90 via-white/85 to-amber-50/70 dark:border-red-400/20 dark:from-red-500/[0.09] dark:via-slate-950/72 dark:to-amber-500/[0.05]",
    bar:
      "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500",
    dot:
      "bg-red-500",
    name:
      "text-red-800 dark:text-red-200",
  },
] as const;

const POST_KIND_STYLES: Record<
  PostKind,
  {
    label: string;
    icon: string;
    className: string;
  }
> = {
  giveaway: {
    label: "Giveaway",
    icon: "🎁",
    className:
      "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-400/20 dark:bg-pink-400/10 dark:text-pink-300",
  },
  wfl: {
    label: "W / F / L",
    icon: "⚖️",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
  },
  trade: {
    label: "Trade",
    icon: "⇄",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300",
  },
  value: {
    label: "Value update",
    icon: "◇",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300",
  },
  question: {
    label: "Question",
    icon: "?",
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300",
  },
  media: {
    label: "Screenshot",
    icon: "▧",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  update: {
    label: "Community update",
    icon: "✦",
    className:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
  },
};

function hashIdentity(value: string) {
  let hash = 0;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash =
      (hash * 31 +
        value.charCodeAt(index)) |
      0;
  }

  return Math.abs(hash);
}

function getUserAccent(
  userId: string,
  displayName: string,
): UserAccent {
  const identity =
    `${userId}:${displayName}`.toLowerCase();

  return USER_ACCENTS[
    hashIdentity(identity) %
      USER_ACCENTS.length
  ];
}

function detectPostKind(
  post: CommunityPost,
): PostKind {
  const content =
    post.content.toLowerCase();

  if (
    /\b(giveaway|give away|winner|prize|raffle)\b/i.test(
      content,
    )
  ) {
    return "giveaway";
  }

  if (
    /\b(w\s*\/\s*f\s*\/\s*l|win\s*,?\s*fair\s*,?\s*lose|win or lose|fair or lose)\b/i.test(
      content,
    )
  ) {
    return "wfl";
  }

  if (
    /\b(trade|trading|offer|offering|looking for|lf\b|downgrade|upgrade)\b/i.test(
      content,
    )
  ) {
    return "trade";
  }

  if (
    /\b(value|values|price|prices|updated value|value update)\b/i.test(
      content,
    )
  ) {
    return "value";
  }

  if (
    content.includes("?") ||
    /\b(what|which|should|can someone|does anyone|how much|is this)\b/i.test(
      content,
    )
  ) {
    return "question";
  }

  if (post.image_url) {
    return "media";
  }

  return "update";
}

function formatRelativeTime(
  isoDate: string,
  now: number,
) {
  const timestamp =
    new Date(isoDate).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Recently";
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (now - timestamp) / 1000,
    ),
  );

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year:
        new Date(isoDate).getFullYear() ===
        new Date(now).getFullYear()
          ? undefined
          : "numeric",
    },
  ).format(new Date(isoDate));
}

function getInitials(
  displayName: string,
) {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "C";
  }

  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getDefaultDisplayName(
  user: User,
) {
  const metadataName =
    typeof user.user_metadata
      ?.display_name === "string"
      ? user.user_metadata
          .display_name
          .trim()
      : "";

  if (metadataName) {
    return metadataName.slice(0, 32);
  }

  const emailName =
    user.email?.split("@")[0].trim();

  return (
    emailName?.slice(0, 32) ||
    "CSBT Member"
  );
}

function sanitizeFileExtension(
  file: File,
) {
  const fileNameExtension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  if (
    fileNameExtension &&
    fileNameExtension.length <= 5
  ) {
    return fileNameExtension;
  }

  switch (file.type) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "image/gif":
      return "gif";

    case "image/jpeg":
    default:
      return "jpg";
  }
}

async function compressAvatarImage(
  file: File,
): Promise<Blob> {
  const objectUrl =
    URL.createObjectURL(file);

  try {
    const image =
      await new Promise<HTMLImageElement>(
        (
          resolve,
          reject,
        ) => {
          const nextImage =
            new window.Image();

          nextImage.onload = () =>
            resolve(nextImage);

          nextImage.onerror = () =>
            reject(
              new Error(
                "Your profile picture could not be opened.",
              ),
            );

          nextImage.src = objectUrl;
        },
      );

    const sourceSize = Math.min(
      image.naturalWidth,
      image.naturalHeight,
    );

    const sourceX = Math.max(
      0,
      Math.floor(
        (image.naturalWidth -
          sourceSize) /
          2,
      ),
    );

    const sourceY = Math.max(
      0,
      Math.floor(
        (image.naturalHeight -
          sourceSize) /
          2,
      ),
    );

    const canvas =
      document.createElement("canvas");

    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Your browser could not prepare the profile picture.",
      );
    }

    context.imageSmoothingEnabled =
      true;
    context.imageSmoothingQuality =
      "high";

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );

    let compressedBlob:
      | Blob
      | null = null;

    for (
      const quality of [
        0.82,
        0.72,
        0.62,
        0.52,
      ]
    ) {
      compressedBlob =
        await new Promise<Blob | null>(
          (resolve) => {
            canvas.toBlob(
              resolve,
              "image/webp",
              quality,
            );
          },
        );

      if (
        compressedBlob &&
        compressedBlob.size <=
          MAX_AVATAR_UPLOAD_SIZE
      ) {
        break;
      }
    }

    if (!compressedBlob) {
      throw new Error(
        "Your profile picture could not be compressed.",
      );
    }

    if (
      compressedBlob.size >
      MAX_AVATAR_UPLOAD_SIZE
    ) {
      throw new Error(
        "Your profile picture is still too large after compression. Try a simpler image.",
      );
    }

    return compressedBlob;
  } finally {
    URL.revokeObjectURL(
      objectUrl,
    );
  }
}

function ImageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="8.5"
        cy="9"
        r="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m5 17 4.2-4.2a2 2 0 0 1 2.8 0l1.4 1.4 1.1-1.1a2 2 0 0 1 2.8 0L20 15.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="m21 3-7.2 18-3.1-7.7L3 10.2 21 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <path
        d="m10.7 13.3 4.8-4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M10 11v5m4-5v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
    >
      <path
        d="M20 6v5h-5M4 18v-5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M18.2 10A7 7 0 0 0 6.4 7.4L4 11m1.8 3A7 7 0 0 0 17.6 16.6L20 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
    >
      <path
        d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileAvatar({
  displayName,
  avatarUrl,
  accent,
  size = "md",
}: {
  displayName: string;
  avatarUrl?: string | null;
  accent: UserAccent;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-10 w-10 rounded-2xl text-xs"
      : size === "lg"
        ? "h-20 w-20 rounded-[24px] text-lg"
        : "h-11 w-11 rounded-2xl text-xs sm:h-12 sm:w-12";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br font-black text-white shadow-md ring-2 ring-offset-2 ring-offset-white/70 dark:ring-offset-slate-950/70 ${sizeClass} ${accent.avatar} ${accent.ring}`}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`${displayName}'s profile picture`}
          fill
          unoptimized
          sizes={size === "lg" ? "80px" : size === "sm" ? "40px" : "48px"}
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        getInitials(displayName)
      )}
    </div>
  );
}

function SetupRequiredPanel() {
  return (
    <div className="flex min-h-[520px] items-center justify-center px-5 py-10">
      <div className="max-w-xl rounded-[26px] border border-amber-200 bg-amber-50/90 p-6 text-center shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10 sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl dark:bg-amber-400/10">
          ⚙️
        </div>

        <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
          Connect Supabase to activate the feed
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Add your public Supabase project URL and anonymous or publishable key to
          <code className="mx-1 rounded bg-white/80 px-1.5 py-0.5 font-bold dark:bg-white/10">
            .env.local
          </code>
          , then restart the development server.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/80 p-4 text-left font-mono text-xs leading-6 text-slate-700 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-300">
          NEXT_PUBLIC_SUPABASE_URL=...
          <br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY=...
        </div>
      </div>
    </div>
  );
}

function AuthPanel({
  onAuthenticated,
}: {
  onAuthenticated: (
    session: Session | null,
  ) => void;
}) {
  const supabase = useMemo(
    () => getSupabaseBrowserClient(),
    [],
  );

  const [mode, setMode] =
    useState<"signin" | "signup">(
      "signin",
    );

  const [displayName, setDisplayName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    const cleanEmail =
      email.trim().toLowerCase();

    if (
      !cleanEmail ||
      password.length < 6
    ) {
      setNotice({
        type: "error",
        text: "Enter a valid email and a password with at least 6 characters.",
      });
      return;
    }

    if (
      mode === "signup" &&
      displayName.trim().length < 2
    ) {
      setNotice({
        type: "error",
        text: "Choose a display name with at least 2 characters.",
      });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      if (mode === "signup") {
        const {
          data,
          error,
        } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name:
                displayName
                  .trim()
                  .slice(0, 32),
            },
          },
        });

        if (error) {
          throw error;
        }

        onAuthenticated(
          data.session,
        );

        setNotice({
          type: "success",
          text: data.session
            ? "Account created. You can post now."
            : "Account created. Check your email to confirm your account, then sign in.",
        });
      } else {
        const {
          data,
          error,
        } =
          await supabase.auth
            .signInWithPassword({
              email: cleanEmail,
              password,
            });

        if (error) {
          throw error;
        }

        onAuthenticated(data.session);

        setNotice({
          type: "success",
          text: "Signed in successfully.",
        });
      }
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Authentication failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-slate-200/90 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-950/60">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setNotice(null);
            }}
            className={`rounded-lg px-3 py-2 text-xs font-black transition ${
              mode === value
                ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-3"
      >
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-slate-300">
              Display name
            </span>

            <input
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value,
                )
              }
              maxLength={32}
              autoComplete="nickname"
              placeholder="Your CSBT name"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-slate-300">
            Email
          </span>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-slate-300">
            Password
          </span>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            minLength={6}
            autoComplete={
              mode === "signup"
                ? "new-password"
                : "current-password"
            }
            placeholder="At least 6 characters"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          />
        </label>

        {notice && (
          <p
            className={`rounded-xl px-3 py-2.5 text-xs font-bold ${
              notice.type === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300"
                : notice.type ===
                    "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
            }`}
          >
            {notice.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function PostCard({
  post,
  profile,
  currentUserId,
  now,
  shouldReduceMotion,
  onDelete,
}: {
  post: CommunityPost;
  profile?: CommunityProfile;
  currentUserId?: string;
  now: number;
  shouldReduceMotion: boolean | null;
  onDelete: (
    post: CommunityPost,
  ) => void;
}) {
  const isOwner =
    currentUserId === post.user_id;

  const edited =
    Math.abs(
      new Date(
        post.updated_at,
      ).getTime() -
        new Date(
          post.created_at,
        ).getTime(),
    ) > 1000;

  const displayName =
    profile?.display_name?.trim() ||
    post.display_name;

  const avatarUrl =
    profile?.avatar_url ?? null;

  const accent = getUserAccent(
    post.user_id,
    displayName,
  );

  const postKind =
    detectPostKind(post);

  const kindStyle =
    POST_KIND_STYLES[postKind];

  return (
    <motion.article
      layout
      initial={{
        opacity: 0,
        y: shouldReduceMotion
          ? 0
          : 18,
        scale: shouldReduceMotion
          ? 1
          : 0.985,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        height: 0,
        marginBottom: 0,
      }}
      transition={{
        duration:
          shouldReduceMotion
            ? 0
            : 0.35,
      }}
      className={`group relative mb-3 overflow-hidden rounded-[24px] border p-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-4 ${accent.card} ${
        isOwner
          ? "ring-1 ring-violet-400/20"
          : ""
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`}
      />

      <div className="flex min-w-0 gap-3 sm:gap-4">
        <div className="relative shrink-0 pt-0.5">
          <ProfileAvatar
            displayName={displayName}
            avatarUrl={avatarUrl}
            accent={accent}
          />

          <span
            aria-hidden="true"
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm dark:border-slate-950 ${accent.dot}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
            <p
              className={`min-w-0 truncate text-sm font-black sm:text-[15px] ${accent.name}`}
            >
              {displayName}
            </p>

            {isOwner && (
              <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300">
                You
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${kindStyle.className}`}
            >
              <span aria-hidden="true">
                {kindStyle.icon}
              </span>
              {kindStyle.label}
            </span>

            <span className="ml-auto shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {formatRelativeTime(
                post.created_at,
                now,
              )}
              {edited
                ? " · edited"
                : ""}
            </span>

            {isOwner && (
              <button
                type="button"
                onClick={() =>
                  onDelete(post)
                }
                aria-label="Delete your post"
                className="ml-0 rounded-lg p-1.5 text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10 dark:hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <TrashIcon />
              </button>
            )}
          </div>

          {post.image_url ? (
            <div className="mt-3">
              {post.content && (
                <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200 sm:text-[15px]">
                  {post.content}
                </p>
              )}

              <a
                href={post.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/image relative block max-w-3xl overflow-hidden rounded-[20px] border border-white/80 bg-slate-100 shadow-sm transition duration-300 hover:shadow-xl dark:border-white/10 dark:bg-slate-950"
              >
                <Image
                  src={post.image_url}
                  alt={`Image posted by ${displayName}`}
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-h-[560px] h-auto w-full object-contain transition duration-500 group-hover/image:scale-[1.01]"
                />

                <span className="pointer-events-none absolute bottom-3 right-3 translate-y-1 rounded-full bg-slate-950/75 px-3 py-1.5 text-[10px] font-black text-white opacity-0 shadow-lg backdrop-blur transition duration-200 group-hover/image:translate-y-0 group-hover/image:opacity-100">
                  Open image ↗
                </span>
              </a>
            </div>
          ) : (
            post.content && (
              <div className="mt-3 rounded-2xl border border-white/75 bg-white/60 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-black/10">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200 sm:text-[15px]">
                  {post.content}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </motion.article>
  );
}


export default function LiveCommunityFeed() {
  const shouldReduceMotion =
    useReducedMotion();

  const supabase = useMemo(
    () => getSupabaseBrowserClient(),
    [],
  );

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const avatarInputRef =
    useRef<HTMLInputElement>(null);

  const feedRef =
    useRef<HTMLDivElement>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  const [posts, setPosts] =
    useState<CommunityPost[]>([]);

  const [profiles, setProfiles] =
    useState<Record<string, CommunityProfile>>({});

  const [isFeedLoading, setIsFeedLoading] =
    useState(true);

  const [isPosting, setIsPosting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [displayName, setDisplayName] =
    useState("");

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [imagePreviewUrl, setImagePreviewUrl] =
    useState<string | null>(null);

  const [selectedAvatar, setSelectedAvatar] =
    useState<File | null>(null);

  const [avatarPreviewUrl, setAvatarPreviewUrl] =
    useState<string | null>(null);

  const [isSavingAvatar, setIsSavingAvatar] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [now, setNow] =
    useState(() => Date.now());

  const user = session?.user;

  const currentProfile =
    user
      ? profiles[user.id]
      : undefined;

  const composerAvatarUrl =
    avatarPreviewUrl ??
    currentProfile?.avatar_url ??
    null;

  const composerAccent = useMemo(
    () =>
      user
        ? getUserAccent(
            user.id,
            displayName ||
              getDefaultDisplayName(
                user,
              ),
          )
        : USER_ACCENTS[0],
    [
      displayName,
      user,
    ],
  );

  const createImageUrl = useCallback(
    (
      imagePath:
        | string
        | null,
    ) => {
      if (
        !supabase ||
        !imagePath
      ) {
        return null;
      }

      return supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(
          imagePath,
        ).data.publicUrl;
    },
    [supabase],
  );

  const toCommunityPost =
    useCallback(
      (
        row: CommunityPostRow,
      ): CommunityPost => ({
        ...row,
        image_url:
          createImageUrl(
            row.image_path,
          ),
      }),
      [createImageUrl],
    );

  const toCommunityProfile =
    useCallback(
      (
        row: CommunityProfileRow,
      ): CommunityProfile => {
        if (
          !supabase ||
          !row.avatar_path
        ) {
          return {
            ...row,
            avatar_url: null,
          };
        }

        const publicUrl =
          supabase.storage
            .from(AVATAR_BUCKET)
            .getPublicUrl(
              row.avatar_path,
            ).data.publicUrl;

        return {
          ...row,
          avatar_url:
            `${publicUrl}?v=${encodeURIComponent(
              row.updated_at,
            )}`,
        };
      },
      [supabase],
    );

  const mergeProfile = useCallback(
    (
      profile: CommunityProfile,
    ) => {
      setProfiles((currentProfiles) => ({
        ...currentProfiles,
        [profile.user_id]:
          profile,
      }));
    },
    [],
  );

  const loadProfiles = useCallback(
    async (
      userIds: string[],
    ) => {
      if (!supabase) {
        return;
      }

      const uniqueUserIds = [
        ...new Set(
          userIds.filter(Boolean),
        ),
      ];

      if (
        uniqueUserIds.length === 0
      ) {
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "user_id,display_name,avatar_path,created_at,updated_at",
        )
        .in(
          "user_id",
          uniqueUserIds,
        );

      if (error) {
        console.error(
          "Could not load community profiles:",
          error.message,
        );
        return;
      }

      const nextProfiles =
        (
          data as CommunityProfileRow[]
        ).map(
          toCommunityProfile,
        );

      setProfiles(
        (currentProfiles) => {
          const mergedProfiles = {
            ...currentProfiles,
          };

          for (
            const profile of nextProfiles
          ) {
            mergedProfiles[
              profile.user_id
            ] = profile;
          }

          return mergedProfiles;
        },
      );
    },
    [
      supabase,
      toCommunityProfile,
    ],
  );

  const mergePost = useCallback(
    (
      newPost: CommunityPost,
    ) => {
      setPosts((currentPosts: CommunityPost[]) => {
        const nextPosts = [
          newPost,
          ...currentPosts.filter(
            (post: CommunityPost) =>
              post.id !==
              newPost.id,
          ),
        ].sort(
          (firstPost: CommunityPost, secondPost: CommunityPost) =>
            new Date(
              secondPost.created_at,
            ).getTime() -
            new Date(
              firstPost.created_at,
            ).getTime(),
        );

        return nextPosts.slice(
          0,
          MAX_VISIBLE_POSTS,
        );
      });
    },
    [],
  );

  const loadPosts = useCallback(
    async () => {
      if (!supabase) {
        setIsFeedLoading(false);
        return;
      }

      setIsFeedLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("community_posts")
        .select(
          "id,user_id,display_name,content,image_path,created_at,updated_at",
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(
          MAX_VISIBLE_POSTS,
        );

      if (error) {
        setNotice({
          type: "error",
          text: error.message,
        });
      } else {
        const postRows =
          data as CommunityPostRow[];

        setPosts(
          postRows.map(
            toCommunityPost,
          ),
        );

        void loadProfiles(
          postRows.map(
            (post) =>
              post.user_id,
          ),
        );
      }

      setIsFeedLoading(false);
    },
    [
      loadProfiles,
      supabase,
      toCommunityPost,
    ],
  );

  useEffect(() => {
    const interval =
      window.setInterval(
        () => setNow(Date.now()),
        30000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, []);

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setIsAuthLoading(false));
      return;
    }

    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({
        data,
      }: {
        data: {
          session: Session | null;
        };
      }) => {
        if (!isMounted) {
          return;
        }

        setSession(data.session);
        setIsAuthLoading(false);
      });

    const {
      data: authListener,
    } =
      supabase.auth
        .onAuthStateChange(
          (
            _event: string,
            nextSession: Session | null,
          ) => {
            setSession(nextSession);
            setIsAuthLoading(false);
          },
        );

    return () => {
      isMounted = false;
      authListener.subscription
        .unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setDisplayName(""));
      queueMicrotask(() => setSelectedAvatar(null));
      return;
    }

    const savedName =
      window.localStorage.getItem(
        "csbt-community-display-name",
      );

    queueMicrotask(() => setDisplayName(
      savedName?.trim() ||
        getDefaultDisplayName(
          user,
        ),
    ));
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void queueMicrotask(() => loadProfiles([
      user.id,
    ]));
  }, [
    loadProfiles,
    user,
  ]);

  useEffect(() => {
    void queueMicrotask(() => loadPosts());
  }, [loadPosts]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(
        "csbt-community-posts",
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "community_posts",
        },
        (payload: CommunityPostChangePayload) => {
          const newPost =
            toCommunityPost(
              payload.new as CommunityPostRow,
            );

          mergePost(newPost);
          void loadProfiles([
            newPost.user_id,
          ]);
          setNow(Date.now());
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table:
            "community_posts",
        },
        (payload: CommunityPostChangePayload) => {
          const updatedPost =
            toCommunityPost(
              payload.new as CommunityPostRow,
            );

          mergePost(updatedPost);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table:
            "community_posts",
        },
        (payload: CommunityPostChangePayload) => {
          const deletedId =
            (
              payload.old as {
                id?: string;
              }
            ).id;

          if (!deletedId) {
            return;
          }

          setPosts(
            (currentPosts: CommunityPost[]) =>
              currentPosts.filter(
                (post: CommunityPost) =>
                  post.id !==
                  deletedId,
              ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase
        .removeChannel(channel);
    };
  }, [
    loadProfiles,
    mergePost,
    supabase,
    toCommunityPost,
  ]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const profileChannel =
      supabase
        .channel(
          "csbt-community-profiles",
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "profiles",
          },
          (
            payload: CommunityProfileChangePayload,
          ) => {
            mergeProfile(
              toCommunityProfile(
                payload.new as CommunityProfileRow,
              ),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
          },
          (
            payload: CommunityProfileChangePayload,
          ) => {
            mergeProfile(
              toCommunityProfile(
                payload.new as CommunityProfileRow,
              ),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "profiles",
          },
          (
            payload: CommunityProfileChangePayload,
          ) => {
            const deletedUserId =
              (
                payload.old as {
                  user_id?: string;
                }
              ).user_id;

            if (!deletedUserId) {
              return;
            }

            setProfiles(
              (currentProfiles) => {
                const nextProfiles = {
                  ...currentProfiles,
                };

                delete nextProfiles[
                  deletedUserId
                ];

                return nextProfiles;
              },
            );
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        profileChannel,
      );
    };
  }, [
    mergeProfile,
    supabase,
    toCommunityProfile,
  ]);

  useEffect(() => {
    if (!selectedImage) {
      queueMicrotask(() => setImagePreviewUrl(null));
      return;
    }

    const objectUrl =
      URL.createObjectURL(
        selectedImage,
      );

    queueMicrotask(() => setImagePreviewUrl(objectUrl));

    return () =>
      URL.revokeObjectURL(
        objectUrl,
      );
  }, [selectedImage]);

  useEffect(() => {
    if (!selectedAvatar) {
      queueMicrotask(() => setAvatarPreviewUrl(null));
      return;
    }

    const objectUrl =
      URL.createObjectURL(
        selectedAvatar,
      );

    queueMicrotask(() => setAvatarPreviewUrl(objectUrl));

    return () =>
      URL.revokeObjectURL(
        objectUrl,
      );
  }, [selectedAvatar]);

  const handleImageSelection = (
    file?: File,
  ) => {
    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/",
      )
    ) {
      setNotice({
        type: "error",
        text: "Select an image file.",
      });
      return;
    }

    if (
      file.size > MAX_IMAGE_SIZE
    ) {
      setNotice({
        type: "error",
        text: "Images must be 5 MB or smaller.",
      });
      return;
    }

    setSelectedImage(file);
    setNotice(null);
  };

  const handleAvatarSelection = (
    file?: File,
  ) => {
    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setNotice({
        type: "error",
        text: "Profile pictures must be JPG, PNG, or WebP.",
      });
      return;
    }

    if (
      file.size >
      MAX_AVATAR_SOURCE_SIZE
    ) {
      setNotice({
        type: "error",
        text: "Profile pictures must be 5 MB or smaller.",
      });
      return;
    }

    setSelectedAvatar(file);
    setNotice(null);
  };

  const handleSaveAvatar =
    async () => {
      if (
        !supabase ||
        !user ||
        !selectedAvatar
      ) {
        return;
      }

      const cleanDisplayName =
        (
          displayName.trim() ||
          getDefaultDisplayName(user)
        ).slice(0, 32);

      setIsSavingAvatar(true);
      setNotice(null);

      try {
        const compressedAvatar =
          await compressAvatarImage(
            selectedAvatar,
          );

        const avatarPath =
          `${user.id}/avatar.webp`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(
            avatarPath,
            compressedAvatar,
            {
              cacheControl: "3600",
              upsert: true,
              contentType:
                "image/webp",
            },
          );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .upsert(
            {
              user_id: user.id,
              display_name:
                cleanDisplayName,
              avatar_path:
                avatarPath,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "user_id",
            },
          )
          .select(
            "user_id,display_name,avatar_path,created_at,updated_at",
          )
          .single();

        if (error) {
          throw error;
        }

        mergeProfile(
          toCommunityProfile(
            data as CommunityProfileRow,
          ),
        );

        setSelectedAvatar(null);
        setNotice({
          type: "success",
          text: "Your profile picture was updated.",
        });
      } catch (error) {
        setNotice({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Your profile picture could not be updated.",
        });
      } finally {
        setIsSavingAvatar(false);

        if (
          avatarInputRef.current
        ) {
          avatarInputRef.current.value =
            "";
        }
      }
    };

  const handleRemoveAvatar =
    async () => {
      if (
        !supabase ||
        !user ||
        !currentProfile?.avatar_path
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Remove your profile picture?",
        );

      if (!confirmed) {
        return;
      }

      setIsSavingAvatar(true);
      setNotice(null);

      try {
        const {
          error: removeError,
        } = await supabase.storage
          .from(AVATAR_BUCKET)
          .remove([
            currentProfile.avatar_path,
          ]);

        if (removeError) {
          throw removeError;
        }

        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .upsert(
            {
              user_id: user.id,
              display_name:
                (
                  displayName.trim() ||
                  getDefaultDisplayName(
                    user,
                  )
                ).slice(0, 32),
              avatar_path: null,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "user_id",
            },
          )
          .select(
            "user_id,display_name,avatar_path,created_at,updated_at",
          )
          .single();

        if (error) {
          throw error;
        }

        mergeProfile(
          toCommunityProfile(
            data as CommunityProfileRow,
          ),
        );

        setSelectedAvatar(null);
        setNotice({
          type: "success",
          text: "Your profile picture was removed.",
        });
      } catch (error) {
        setNotice({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Your profile picture could not be removed.",
        });
      } finally {
        setIsSavingAvatar(false);
      }
    };

  const handleCreatePost = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !supabase ||
      !user
    ) {
      setNotice({
        type: "error",
        text: "Sign in before posting.",
      });
      return;
    }

    const cleanMessage =
      message.trim();

    const cleanDisplayName =
      displayName
        .trim()
        .slice(0, 32);

    if (
      cleanDisplayName.length < 2
    ) {
      setNotice({
        type: "error",
        text: "Enter a display name with at least 2 characters.",
      });
      return;
    }

    if (
      !cleanMessage &&
      !selectedImage
    ) {
      setNotice({
        type: "error",
        text: "Write a message or attach an image.",
      });
      return;
    }

    if (
      cleanMessage.length >
      MAX_POST_LENGTH
    ) {
      setNotice({
        type: "error",
        text: `Messages can contain up to ${MAX_POST_LENGTH} characters.`,
      });
      return;
    }

    setIsPosting(true);
    setNotice(null);

    let uploadedImagePath:
      | string
      | null = null;

    try {
      if (selectedImage) {
        const extension =
          sanitizeFileExtension(
            selectedImage,
          );

        uploadedImagePath =
          `${user.id}/` +
          `${crypto.randomUUID()}.${extension}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(
            uploadedImagePath,
            selectedImage,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                selectedImage.type,
            },
          );

        if (uploadError) {
          throw uploadError;
        }
      }

      const {
        data,
        error,
      } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          display_name:
            cleanDisplayName,
          content: cleanMessage,
          image_path:
            uploadedImagePath,
        })
        .select(
          "id,user_id,display_name,content,image_path,created_at,updated_at",
        )
        .single();

      if (error) {
        throw error;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            display_name:
              cleanDisplayName,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id",
            defaultToNull:
              false,
          },
        )
        .select(
          "user_id,display_name,avatar_path,created_at,updated_at",
        )
        .single();

      if (
        profileError
      ) {
        console.error(
          "Could not update the community profile:",
          profileError.message,
        );
      } else if (
        profileData
      ) {
        mergeProfile(
          toCommunityProfile(
            profileData as CommunityProfileRow,
          ),
        );
      }

      window.localStorage.setItem(
        "csbt-community-display-name",
        cleanDisplayName,
      );

      mergePost(
        toCommunityPost(
          data as CommunityPostRow,
        ),
      );

      setMessage("");
      setSelectedImage(null);
      setNotice({
        type: "success",
        text: "Your post is now live.",
      });

      feedRef.current
        ?.scrollTo({
          top: 0,
          behavior:
            shouldReduceMotion
              ? "auto"
              : "smooth",
        });
    } catch (error) {
      if (uploadedImagePath) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([
            uploadedImagePath,
          ]);
      }

      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Your post could not be published.",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (
    post: CommunityPost,
  ) => {
    if (
      !supabase ||
      !user ||
      post.user_id !== user.id
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this post?",
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", post.id);

    if (error) {
      setNotice({
        type: "error",
        text: error.message,
      });
      return;
    }

    if (post.image_path) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([
          post.image_path,
        ]);
    }

    setPosts(
      (currentPosts: CommunityPost[]) =>
        currentPosts.filter(
          (currentPost: CommunityPost) =>
            currentPost.id !==
            post.id,
        ),
    );
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setNotice({
      type: "info",
      text: "You are signed out.",
    });
  };

  const remainingCharacters =
    MAX_POST_LENGTH -
    message.length;

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: shouldReduceMotion
          ? 0
          : 28,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.08,
      }}
      transition={{
        duration:
          shouldReduceMotion
            ? 0
            : 0.65,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
      aria-labelledby="csbt-community-feed-title"
      className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/72 shadow-[0_26px_80px_rgba(15,23,42,.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_32px_95px_rgba(0,0,0,.42)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.15),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.13),transparent_42%)]" />

      <motion.div
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-500/10"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: [
                  1,
                  1.14,
                  1,
                ],
                opacity: [
                  0.4,
                  0.75,
                  0.4,
                ],
              }
        }
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="relative">
        <header className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 dark:border-white/10 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <motion.div
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 1.08,
                      rotate: -4,
                    }
              }
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-blue-600 text-white shadow-lg shadow-violet-500/20"
            >
              <MessageIcon />
            </motion.div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="csbt-community-feed-title"
                  className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl"
                >
                  CSBT Live Community
                </h2>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-green-700 dark:border-green-400/20 dark:bg-green-400/10 dark:text-green-300">
                  <span className="relative flex h-2 w-2">
                    {!shouldReduceMotion && (
                      <motion.span
                        className="absolute inline-flex h-full w-full rounded-full bg-green-400"
                        animate={{
                          scale: [
                            1,
                            2.1,
                          ],
                          opacity: [
                            0.8,
                            0,
                          ],
                        }}
                        transition={{
                          duration: 1.7,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                      />
                    )}

                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>

                  Live
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                A Discord-style feed for text updates and trade screenshots.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void loadPosts()
              }
              disabled={
                isFeedLoading ||
                !supabase
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-3.5 py-2.5 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <RefreshIcon />
              Refresh
            </button>

            {user && (
              <button
                type="button"
                onClick={() =>
                  void handleSignOut()
                }
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
              >
                Sign out
              </button>
            )}
          </div>
        </header>

        {!supabase ? (
          <SetupRequiredPanel />
        ) : (
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
            <div className="min-w-0 border-b border-slate-200/80 dark:border-white/10 lg:border-b-0 lg:border-r">
              <div
                ref={feedRef}
                className="h-[560px] overflow-y-auto overscroll-contain px-3 py-4 sm:h-[650px] sm:px-5"
                style={{
                  scrollbarGutter:
                    "stable",
                }}
              >
                {isFeedLoading ? (
                  <div className="space-y-4 p-3">
                    {[
                      1,
                      2,
                      3,
                      4,
                    ].map(
                      (item) => (
                        <div
                          key={item}
                          className="flex animate-pulse gap-4 rounded-2xl p-3"
                        >
                          <div className="h-11 w-11 shrink-0 rounded-full bg-slate-200 dark:bg-white/10" />

                          <div className="flex-1">
                            <div className="h-3 w-36 rounded bg-slate-200 dark:bg-white/10" />
                            <div className="mt-3 h-3 w-full rounded bg-slate-200 dark:bg-white/10" />
                            <div className="mt-2 h-3 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : posts.length > 0 ? (
                  <AnimatePresence
                    initial={false}
                  >
                    {posts.map(
                      (post: CommunityPost) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          profile={
                            profiles[
                              post.user_id
                            ]
                          }
                          currentUserId={
                            user?.id
                          }
                          now={now}
                          shouldReduceMotion={
                            shouldReduceMotion
                          }
                          onDelete={
                            handleDeletePost
                          }
                        />
                      ),
                    )}
                  </AnimatePresence>
                ) : (
                  <div className="flex min-h-[500px] items-center justify-center px-5 text-center">
                    <div className="max-w-md">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-3xl dark:bg-violet-400/10">
                        💬
                      </div>

                      <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                        Start the conversation
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        There are no community posts yet. Sign in and share the first text update or screenshot.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="min-w-0 p-5 sm:p-6">
              {isAuthLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-11 rounded-xl bg-slate-200 dark:bg-white/10" />
                  <div className="h-11 rounded-xl bg-slate-200 dark:bg-white/10" />
                  <div className="h-28 rounded-xl bg-slate-200 dark:bg-white/10" />
                </div>
              ) : !user ? (
                <>
                  <div className="mb-5 rounded-[22px] border border-blue-200 bg-blue-50/80 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                    <p className="font-black text-blue-800 dark:text-blue-300">
                      Everyone can read
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      Sign in only when you want to post text or an image.
                    </p>
                  </div>

                  <AuthPanel
                    onAuthenticated={
                      setSession
                    }
                  />
                </>
              ) : (
                <form
                  onSubmit={
                    handleCreatePost
                  }
                  className="space-y-4"
                >
                  <div className="rounded-[22px] border border-slate-200/85 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        handleAvatarSelection(
                          event.target
                            .files?.[0],
                        )
                      }
                    />

                    <div className="flex items-start gap-4">
                      <ProfileAvatar
                        displayName={
                          displayName ||
                          getDefaultDisplayName(
                            user,
                          )
                        }
                        avatarUrl={
                          composerAvatarUrl
                        }
                        accent={
                          composerAccent
                        }
                        size="lg"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                              Your community profile
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                              {user.email}
                            </p>
                          </div>

                          {currentProfile
                            ?.avatar_path &&
                            !selectedAvatar && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRemoveAvatar()
                                }
                                disabled={
                                  isSavingAvatar
                                }
                                className="rounded-lg px-2 py-1 text-[10px] font-black text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-400/10"
                              >
                                Remove
                              </button>
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              avatarInputRef
                                .current
                                ?.click()
                            }
                            disabled={
                              isSavingAvatar
                            }
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                          >
                            {currentProfile
                              ?.avatar_path
                              ? "Change photo"
                              : "Add photo"}
                          </button>

                          {selectedAvatar && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleSaveAvatar()
                                }
                                disabled={
                                  isSavingAvatar
                                }
                                className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isSavingAvatar
                                  ? "Saving…"
                                  : "Save photo"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAvatar(
                                    null,
                                  );

                                  if (
                                    avatarInputRef
                                      .current
                                  ) {
                                    avatarInputRef.current.value =
                                      "";
                                  }
                                }}
                                disabled={
                                  isSavingAvatar
                                }
                                className="rounded-xl px-3 py-2 text-[11px] font-black text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/5"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>

                        <p className="mt-2 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                          JPG, PNG, or WebP. Your photo is cropped and compressed to WebP before upload.
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black text-slate-700 dark:text-slate-300">
                      Display name
                    </span>

                    <input
                      value={displayName}
                      onChange={(event) =>
                        setDisplayName(
                          event
                            .target
                            .value,
                        )
                      }
                      maxLength={32}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Message
                      </span>

                      <span
                        className={`text-[10px] font-bold ${
                          remainingCharacters <
                          100
                            ? "text-orange-600 dark:text-orange-300"
                            : "text-slate-400"
                        }`}
                      >
                        {
                          remainingCharacters
                        }{" "}
                        left
                      </span>
                    </div>

                    <textarea
                      value={message}
                      onChange={(event) =>
                        setMessage(
                          event
                            .target
                            .value,
                        )
                      }
                      maxLength={
                        MAX_POST_LENGTH
                      }
                      rows={6}
                      placeholder="Share a trade, update, question, or screenshot…"
                      className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                    />
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) =>
                      handleImageSelection(
                        event.target
                          .files?.[0],
                      )
                    }
                  />

                  {imagePreviewUrl && (
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-950">
                      <Image
                        src={imagePreviewUrl}
                        alt="Selected image preview"
                        width={1200}
                        height={800}
                        unoptimized
                        className="max-h-64 h-auto w-full object-contain"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImage(
                            null,
                          )
                        }
                        className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef
                        .current
                        ?.click()
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/75 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    <ImageIcon />
                    {selectedImage
                      ? "Change image"
                      : "Attach an image"}
                  </button>

                  {notice && (
                    <p
                      className={`rounded-xl px-3 py-2.5 text-xs font-bold ${
                        notice.type ===
                        "error"
                          ? "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300"
                          : notice.type ===
                              "success"
                            ? "bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
                      }`}
                    >
                      {notice.text}
                    </p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={
                      isPosting ||
                      (!message.trim() &&
                        !selectedImage)
                    }
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            y: -2,
                            scale: 1.01,
                          }
                    }
                    whileTap={{
                      scale:
                        shouldReduceMotion
                          ? 1
                          : 0.98,
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <SendIcon />
                    {isPosting
                      ? "Publishing…"
                      : "Post to live feed"}
                  </motion.button>

                  <p className="text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
                    Images can be JPG, PNG, WebP, or GIF up to 5 MB.
                  </p>
                </form>
              )}
            </aside>
          </div>
        )}
      </div>
    </motion.section>
  );
}