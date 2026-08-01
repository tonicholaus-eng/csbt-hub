"use client";

import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type {
  FormEvent,
} from "react";
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

let browserClient:
  | SupabaseClient
  | null = null;

function getSupabaseBrowserClient():
  | SupabaseClient
  | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseBrowserKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !supabaseUrl ||
    !supabaseBrowserKey
  ) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(
      supabaseUrl,
      supabaseBrowserKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }

  return browserClient;
}

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

type Notice = {
  type: "success" | "error" | "info";
  text: string;
};

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
  currentUserId,
  now,
  shouldReduceMotion,
  onDelete,
}: {
  post: CommunityPost;
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
      className="group flex gap-3 rounded-2xl px-3 py-4 transition-colors hover:bg-slate-100/75 dark:hover:bg-white/[0.035] sm:gap-4 sm:px-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-blue-600 text-xs font-black text-white shadow-md sm:h-11 sm:w-11">
        {getInitials(
          post.display_name,
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-black text-slate-900 dark:text-white">
            {post.display_name}
          </p>

          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {formatRelativeTime(
              post.created_at,
              now,
            )}
            {edited ? " · edited" : ""}
          </span>

          {isOwner && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
              You
            </span>
          )}
        </div>

        {post.content && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300 sm:text-[15px]">
            {post.content}
          </p>
        )}

        {post.image_url && (
          <a
            href={post.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-950"
          >
            <img
              src={post.image_url}
              alt={`Image posted by ${post.display_name}`}
              loading="lazy"
              className="max-h-[520px] w-full object-contain"
            />
          </a>
        )}
      </div>

      {isOwner && (
        <button
          type="button"
          onClick={() =>
            onDelete(post)
          }
          aria-label="Delete your post"
          className="self-start rounded-xl p-2 text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10 dark:hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <TrashIcon />
        </button>
      )}
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

  const feedRef =
    useRef<HTMLDivElement>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  const [posts, setPosts] =
    useState<CommunityPost[]>([]);

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

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [now, setNow] =
    useState(() => Date.now());

  const user = session?.user;

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
        setPosts(
          (
            data as CommunityPostRow[]
          ).map(toCommunityPost),
        );
      }

      setIsFeedLoading(false);
    },
    [
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
      setIsAuthLoading(false);
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
      setDisplayName("");
      return;
    }

    const savedName =
      window.localStorage.getItem(
        "csbt-community-display-name",
      );

    setDisplayName(
      savedName?.trim() ||
        getDefaultDisplayName(
          user,
        ),
    );
  }, [user]);

  useEffect(() => {
    void loadPosts();
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
    mergePost,
    supabase,
    toCommunityPost,
  ]);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }

    const objectUrl =
      URL.createObjectURL(
        selectedImage,
      );

    setImagePreviewUrl(objectUrl);

    return () =>
      URL.revokeObjectURL(
        objectUrl,
      );
  }, [selectedImage]);

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
                className="h-[560px] overflow-y-auto overscroll-contain px-2 py-3 sm:h-[650px] sm:px-4"
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
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-blue-600 text-xs font-black text-white">
                      {getInitials(
                        displayName ||
                          getDefaultDisplayName(
                            user,
                          ),
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                        Posting as a member
                      </p>

                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
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
                      <img
                        src={
                          imagePreviewUrl
                        }
                        alt="Selected image preview"
                        className="max-h-64 w-full object-contain"
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