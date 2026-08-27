"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Session, User } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useId,
  useState,
} from "react";

import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import GameScopePicker from "../games/GameScopePicker";
import { getGameAdapter, parseGameScope } from "../../games/registry";
import type { CSBTGameId, CSBTGameScope } from "../../games/types";
import { isLegacyGameSchemaError } from "../../lib/supabase/multigameCompat";

const STORAGE_BUCKET = "community-images";
const AVATAR_BUCKET = "avatars";
const MAX_POST_LENGTH = 2000;
const MAX_REPLY_LENGTH = 1000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const CHANNEL_PAGE_SIZE = 40;
const REACTIONS = ["👍", "😂", "🔥", "😭", "🤝", "W", "F", "L"] as const;

type ChannelSlug =
  | "general"
  | "announcements"
  | "trade-chat"
  | "looking-for-offers"
  | "trade-help"
  | "wins-and-trades"
  | "value-discussion"
  | "demand-talk"
  | "screenshots"
  | "memes"
  | "inventory-flex";

type ChannelDefinition = {
  slug: ChannelSlug;
  label: string;
  description: string;
  icon: string;
  accent: string;
};

type ChannelGroup = {
  title: string;
  channels: ChannelDefinition[];
};

const CHANNEL_GROUPS: ChannelGroup[] = [
  {
    title: "Welcome",
    channels: [
      { slug: "general", label: "general", description: "Hang out with the CSBT community", icon: "#", accent: "from-violet-500 to-blue-500" },
      { slug: "announcements", label: "announcements", description: "Official CSBT news and notices", icon: "📢", accent: "from-amber-400 to-orange-500" },
    ],
  },
  {
    title: "Trading",
    channels: [
      { slug: "trade-chat", label: "trade-chat", description: "Talk about active trades", icon: "⇄", accent: "from-cyan-400 to-blue-500" },
      { slug: "looking-for-offers", label: "looking-for-offers", description: "Share what you are looking for", icon: "🔎", accent: "from-emerald-400 to-cyan-500" },
      { slug: "trade-help", label: "trade-help", description: "Ask for trading advice", icon: "?", accent: "from-indigo-400 to-violet-500" },
      { slug: "wins-and-trades", label: "wins-and-trades", description: "Show your completed wins", icon: "🏆", accent: "from-amber-400 to-rose-500" },
    ],
  },
  {
    title: "Value talk",
    channels: [
      { slug: "value-discussion", label: "value-discussion", description: "Discuss values and changes", icon: "◇", accent: "from-blue-400 to-indigo-500" },
      { slug: "demand-talk", label: "demand-talk", description: "Talk demand and market movement", icon: "↗", accent: "from-lime-400 to-emerald-500" },
    ],
  },
  {
    title: "Media",
    channels: [
      { slug: "screenshots", label: "screenshots", description: "Share screenshots and moments", icon: "▧", accent: "from-fuchsia-400 to-violet-500" },
      { slug: "memes", label: "memes", description: "Memes and community fun", icon: "😂", accent: "from-pink-400 to-orange-400" },
      { slug: "inventory-flex", label: "inventory-flex", description: "Show off your inventory", icon: "🎒", accent: "from-rose-400 to-pink-500" },
    ],
  },
];

const CHANNELS = CHANNEL_GROUPS.flatMap((group) => group.channels);
const CHANNEL_MAP = new Map(CHANNELS.map((channel) => [channel.slug, channel]));

type CommunityPostRow = {
  id: string;
  game_id?: CSBTGameId;
  user_id: string;
  display_name: string;
  content: string;
  image_path: string | null;
  channel_slug: ChannelSlug;
  created_at: string;
  updated_at: string;
};

type CommunityPost = Omit<CommunityPostRow, "game_id"> & { game_id: CSBTGameId; image_url: string | null };

type CommunityProfileRow = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
};

type CommunityProfile = CommunityProfileRow & { avatar_url: string | null };

type ReactionRow = {
  id: number;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

type ReplyRow = {
  id: string;
  post_id: string;
  user_id: string;
  display_name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type PresenceMember = {
  key: string;
  userId: string | null;
  displayName: string;
  channel: ChannelSlug;
  game: CSBTGameScope;
};

type Notice = { type: "success" | "error" | "info"; text: string };

function formatRelativeTime(value: string, now = Date.now()) {
  const milliseconds = now - new Date(value).getTime();
  if (milliseconds < 60_000) return "now";
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function fallbackName(user: User) {
  const metadataName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
  if (metadataName) return metadataName.slice(0, 32);
  const emailPrefix = user.email?.split("@")[0]?.trim();
  return (emailPrefix || "CSBT Member").slice(0, 32);
}

function avatarPublicUrl(client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>, profile: CommunityProfileRow) {
  if (!profile.avatar_path) return null;
  const url = client.storage.from(AVATAR_BUCKET).getPublicUrl(profile.avatar_path).data.publicUrl;
  return `${url}?v=${encodeURIComponent(profile.updated_at)}`;
}

function sanitizeExtension(file: File) {
  const subtype = file.type.split("/")[1]?.toLowerCase();
  if (subtype === "jpeg") return "jpg";
  if (["jpg", "png", "webp", "gif"].includes(subtype ?? "")) return subtype!;
  return "webp";
}

function isChannelSlug(value: unknown): value is ChannelSlug {
  return typeof value === "string" && CHANNEL_MAP.has(value as ChannelSlug);
}

function ProfileAvatar({ profile, displayName, size = "md" }: { profile?: CommunityProfile; displayName: string; size?: "sm" | "md" | "lg" }) {
  const classes = size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-blue-500 font-black text-white shadow-md ${classes}`}>
      {profile?.avatar_url ? (
        <Image src={profile.avatar_url} alt="" fill unoptimized className="object-cover" sizes={size === "lg" ? "48px" : "40px"} />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{getInitials(displayName)}</span>
      )}
    </div>
  );
}

function AuthMiniPanel({ onSession }: { onSession: (session: Session | null) => void }) {
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const { data, error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        onSession(data.session);
      } else {
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        onSession(data.session);
        if (!data.session) setError("Account created. Check your email if confirmation is enabled, then sign in.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not authenticate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-black text-white">Join the conversation</p>
      <p className="mt-1 text-xs leading-5 text-white/45">Everyone can read. Sign in to post, react and reply.</p>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1 text-xs font-black">
        <button type="button" onClick={() => setMode("signin")} className={`rounded-lg px-3 py-2 ${mode === "signin" ? "bg-white text-slate-950" : "text-white/55"}`}>Sign in</button>
        <button type="button" onClick={() => setMode("signup")} className={`rounded-lg px-3 py-2 ${mode === "signup" ? "bg-white text-slate-950" : "text-white/55"}`}>Create account</button>
      </div>
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="Email" className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 text-xs font-semibold text-white outline-none placeholder:text-white/30 focus:border-violet-400" />
      <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} placeholder="Password" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5 text-xs font-semibold text-white outline-none placeholder:text-white/30 focus:border-violet-400" />
      {error && <p className="mt-2 text-[11px] font-semibold leading-5 text-rose-300">{error}</p>}
      <button disabled={busy} className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-3 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy ? "Please wait…" : mode === "signin" ? "Enter CSBT Lounge" : "Create account"}</button>
    </form>
  );
}

export default function CSBTLounge({
  fixedGameId,
  routeBasePath = "/lounge",
  exchangeBasePath = "/exchange",
  tradeOpinionsBasePath = "/trade-opinions",
}: {
  fixedGameId?: CSBTGameId;
  routeBasePath?: string;
  exchangeBasePath?: string;
  tradeOpinionsBasePath?: string;
} = {}) {
  const shouldReduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const scope: CSBTGameScope = fixedGameId ?? parseGameScope(searchParams.get("game"), "all");
  const requestedChannel = searchParams.get("channel");
  const initialChannel = isChannelSlug(requestedChannel) ? requestedChannel : "general";
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const feedRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postIdsRef = useRef<string[]>([]);
  const guestId = useId();
  const guestKeyRef = useRef(`guest-${guestId.replace(/:/g, "")}`);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [profiles, setProfiles] = useState<Record<string, CommunityProfile>>({});
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [presenceMembers, setPresenceMembers] = useState<PresenceMember[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChannelSlug>(initialChannel);
  const [postGame, setPostGame] = useState<CSBTGameId>(scope === "mm2" ? "mm2" : "adopt-me");
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [channelCountRows, setChannelCountRows] = useState<Array<{ channel_slug: ChannelSlug; post_count: number }>>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [threadPostId, setThreadPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [channelDrawerOpen, setChannelDrawerOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const user = session?.user ?? null;

  useEffect(() => {
    if (isChannelSlug(requestedChannel) && requestedChannel !== activeChannel) {
      queueMicrotask(() => setActiveChannel(requestedChannel));
    }
    if (scope !== "all" && postGame !== scope) {
      queueMicrotask(() => setPostGame(scope));
    }
  }, [activeChannel, postGame, requestedChannel, scope]);

  const currentProfile = user ? profiles[user.id] : undefined;
  const currentDisplayName = currentProfile?.display_name?.trim() || (user ? fallbackName(user) : "Guest");
  const currentChannel = CHANNEL_MAP.get(activeChannel) ?? CHANNELS[0];

  const createImageUrl = useCallback((path: string | null) => {
    if (!supabase || !path) return null;
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }, [supabase]);

  const toPost = useCallback((row: CommunityPostRow): CommunityPost => ({
    ...row,
    game_id: row.game_id ?? "adopt-me",
    channel_slug: isChannelSlug(row.channel_slug) ? row.channel_slug : "general",
    image_url: createImageUrl(row.image_path),
  } as CommunityPost), [createImageUrl]);

  const loadProfiles = useCallback(async (ids: string[]) => {
    const client = supabase;
    if (!client) return;
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return;
    const { data, error } = await client.from("public_profiles").select("user_id,display_name,avatar_path,created_at,updated_at").in("user_id", unique);
    if (error) return;
    setProfiles((current) => {
      const next = { ...current };
      for (const row of (data ?? []) as CommunityProfileRow[]) {
        next[row.user_id] = { ...row, avatar_url: avatarPublicUrl(client, row) };
      }
      return next;
    });
  }, [supabase]);

  const loadReactions = useCallback(async (postIds: string[]) => {
    const client = supabase;
    if (!client || !postIds.length) { setReactions([]); return; }
    const { data, error } = await client.from("community_reactions").select("id,post_id,user_id,emoji,created_at").in("post_id", postIds);
    if (!error) setReactions((data ?? []) as ReactionRow[]);
  }, [supabase]);

  const loadReplies = useCallback(async (postIds: string[]) => {
    const client = supabase;
    if (!client || !postIds.length) { setReplies([]); return; }
    const { data, error } = await client.from("community_replies").select("id,post_id,user_id,display_name,content,created_at,updated_at").in("post_id", postIds).order("created_at", { ascending: true });
    if (!error) setReplies((data ?? []) as ReplyRow[]);
  }, [supabase]);

  const loadChannelCounts = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const { data, error } = await client.rpc("community_channel_counts_by_game", {
      p_game_id: scope === "all" ? null : scope,
    });
    if (!error) {
      setChannelCountRows(((data ?? []) as Array<{ channel_slug: ChannelSlug; post_count: number }>).filter((row) => isChannelSlug(row.channel_slug)));
      return;
    }
    if ((scope === "adopt-me" || scope === "all") && isLegacyGameSchemaError(error)) {
      const legacy = await client.from("community_posts").select("channel_slug").limit(5000);
      if (!legacy.error) {
        const counts = new Map<ChannelSlug, number>();
        for (const row of legacy.data ?? []) {
          if (isChannelSlug(row.channel_slug)) counts.set(row.channel_slug, (counts.get(row.channel_slug) ?? 0) + 1);
        }
        setChannelCountRows(Array.from(counts, ([channel_slug, post_count]) => ({ channel_slug, post_count })));
      }
    }
  }, [scope, supabase]);

  const loadPosts = useCallback(async () => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    setLoading(true);
    let request = client.from("community_posts")
      .select("id,game_id,user_id,display_name,content,image_path,channel_slug,created_at,updated_at")
      .eq("channel_slug", activeChannel)
      .order("created_at", { ascending: false })
      .limit(CHANNEL_PAGE_SIZE + 1);
    if (scope !== "all") request = request.eq("game_id", scope);
    let result = await request;
    if (result.error && (scope === "adopt-me" || scope === "all") && isLegacyGameSchemaError(result.error)) {
      result = await client.from("community_posts")
        .select("id,user_id,display_name,content,image_path,channel_slug,created_at,updated_at")
        .eq("channel_slug", activeChannel)
        .order("created_at", { ascending: false })
        .limit(CHANNEL_PAGE_SIZE + 1) as typeof result;
    }
    if (result.error) {
      setNotice({ type: "error", text: scope === "mm2" && isLegacyGameSchemaError(result.error)
        ? "MM2 Lounge needs the included multi-game Supabase migration before MM2 messages can load."
        : result.error.message.includes("channel_slug") ? "CSBT Lounge is temporarily unavailable. Please try again later." : result.error.message });
      setLoading(false);
      return;
    }
    const rows = (result.data ?? []) as CommunityPostRow[];
    setHasOlder(rows.length > CHANNEL_PAGE_SIZE);
    const next = rows.slice(0, CHANNEL_PAGE_SIZE).map(toPost);
    setPosts(next);
    postIdsRef.current = next.map((post) => post.id);
    void loadProfiles(next.map((post) => post.user_id));
    void loadReactions(postIdsRef.current);
    void loadReplies(postIdsRef.current);
    void loadChannelCounts();
    setLoading(false);
  }, [activeChannel, loadChannelCounts, loadProfiles, loadReactions, loadReplies, scope, supabase, toPost]);

  const loadOlderPosts = useCallback(async () => {
    const client = supabase;
    const oldest = posts[posts.length - 1];
    if (!client || !oldest || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    let request = client.from("community_posts")
      .select("id,game_id,user_id,display_name,content,image_path,channel_slug,created_at,updated_at")
      .eq("channel_slug", activeChannel)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(CHANNEL_PAGE_SIZE + 1);
    if (scope !== "all") request = request.eq("game_id", scope);
    let result = await request;
    if (result.error && (scope === "adopt-me" || scope === "all") && isLegacyGameSchemaError(result.error)) {
      result = await client.from("community_posts")
        .select("id,user_id,display_name,content,image_path,channel_slug,created_at,updated_at")
        .eq("channel_slug", activeChannel)
        .lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false })
        .limit(CHANNEL_PAGE_SIZE + 1) as typeof result;
    }
    if (!result.error) {
      const rows = (result.data ?? []) as CommunityPostRow[];
      setHasOlder(rows.length > CHANNEL_PAGE_SIZE);
      const additions = rows.slice(0, CHANNEL_PAGE_SIZE).map(toPost);
      setPosts((current) => [...current, ...additions.filter((post) => !current.some((existing) => existing.id === post.id))]);
      const ids = [...postIdsRef.current, ...additions.map((post) => post.id)];
      postIdsRef.current = [...new Set(ids)];
      void loadProfiles(additions.map((post) => post.user_id));
      void loadReactions(postIdsRef.current);
      void loadReplies(postIdsRef.current);
    } else {
      setNotice({ type: "error", text: "Older Lounge messages could not be loaded." });
    }
    setLoadingOlder(false);
  }, [activeChannel, hasOlder, loadProfiles, loadReactions, loadReplies, loadingOlder, posts, scope, supabase, toPost]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase) { queueMicrotask(() => setAuthLoading(false)); return; }
    const client = supabase;
    let mounted = true;
    void client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => { void queueMicrotask(() => loadPosts()); }, [loadPosts]);

  useEffect(() => {
    if (!user) { queueMicrotask(() => setIsStaff(false)); return; }
    const client = supabase;
    if (!client) return;
    void client.from("exchange_staff").select("user_id").eq("user_id", user.id).maybeSingle().then(({ data }) => setIsStaff(Boolean(data)));
    void queueMicrotask(() => loadProfiles([user.id]));
  }, [loadProfiles, supabase, user]);

  useEffect(() => {
    if (!selectedImage) { queueMicrotask(() => setImagePreview(null)); return; }
    const url = URL.createObjectURL(selectedImage);
    queueMicrotask(() => setImagePreview(url));
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const filter = `channel_slug=eq.${activeChannel}`;
    const channel = client.channel(`csbt-lounge-${scope}-${activeChannel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts", filter }, (payload) => {
        const row = payload.new as CommunityPostRow;
        if (!row?.id || row.channel_slug !== activeChannel || (scope !== "all" && row.game_id !== scope)) return;
        const next = toPost(row);
        setPosts((current) => [next, ...current.filter((post) => post.id !== next.id)]);
        postIdsRef.current = [next.id, ...postIdsRef.current.filter((id) => id !== next.id)];
        void loadProfiles([next.user_id]);
        void loadChannelCounts();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts", filter }, (payload) => {
        const row = payload.new as CommunityPostRow;
        if (!row?.id || (scope !== "all" && row.game_id !== scope)) return;
        const next = toPost(row);
        setPosts((current) => current.map((post) => post.id === next.id ? next : post));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_posts" }, (payload) => {
        const oldRow = payload.old as Partial<CommunityPostRow>;
        if (!oldRow?.id) return;
        setPosts((current) => current.filter((post) => post.id !== oldRow.id));
        postIdsRef.current = postIdsRef.current.filter((id) => id !== oldRow.id);
        void loadChannelCounts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_reactions" }, () => void loadReactions(postIdsRef.current))
      .on("postgres_changes", { event: "*", schema: "public", table: "community_replies" }, () => void loadReplies(postIdsRef.current))
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [activeChannel, loadChannelCounts, loadProfiles, loadReactions, loadReplies, scope, supabase, toPost]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const key = user?.id ?? guestKeyRef.current;
    const presence = client.channel("csbt-lounge-presence", { config: { presence: { key } } });

    const syncPresence = () => {
      const state = presence.presenceState() as Record<string, Array<Record<string, unknown>>>;
      const next: PresenceMember[] = [];
      for (const [presenceKey, values] of Object.entries(state)) {
        const latest = values[values.length - 1];
        if (!latest) continue;
        const rawChannel = latest.channel;
        next.push({
          key: presenceKey,
          userId: typeof latest.user_id === "string" ? latest.user_id : null,
          displayName: typeof latest.display_name === "string" ? latest.display_name : "Guest",
          channel: isChannelSlug(rawChannel) ? rawChannel : "general",
          game: latest.game === "mm2" ? "mm2" : latest.game === "adopt-me" ? "adopt-me" : "all",
        });
      }
      setPresenceMembers(next);
    };

    presence.on("presence", { event: "sync" }, syncPresence).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presence.track({ user_id: user?.id ?? null, display_name: currentDisplayName, channel: activeChannel, game: scope, online_at: new Date().toISOString() });
      }
    });

    return () => { void client.removeChannel(presence); };
  }, [activeChannel, currentDisplayName, scope, supabase, user?.id]);

  const visiblePosts = useMemo(() => posts.slice().reverse(), [posts]);
  const threadPost = threadPostId ? posts.find((post) => post.id === threadPostId) ?? null : null;
  const threadReplies = useMemo(() => replies.filter((reply) => reply.post_id === threadPostId), [replies, threadPostId]);

  const channelCounts = useMemo(() => {
    const counts = new Map<ChannelSlug, number>();
    for (const row of channelCountRows) counts.set(row.channel_slug, Number(row.post_count) || 0);
    return counts;
  }, [channelCountRows]);

  const scopedPresenceMembers = useMemo(
    () => scope === "all" ? presenceMembers : presenceMembers.filter((member) => member.game === scope || member.game === "all"),
    [presenceMembers, scope],
  );
  const activeMembers = useMemo(() => scopedPresenceMembers.filter((member) => member.channel === activeChannel), [activeChannel, scopedPresenceMembers]);
  const trendingChannels = useMemo(() => [...CHANNELS].sort((a, b) => (channelCounts.get(b.slug) ?? 0) - (channelCounts.get(a.slug) ?? 0)).slice(0, 3), [channelCounts]);

  useEffect(() => {
    if (!loading) window.setTimeout(() => feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: shouldReduceMotion ? "auto" : "smooth" }), 50);
  }, [activeChannel, loading, shouldReduceMotion]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !user) { setNotice({ type: "error", text: "Sign in before posting." }); return; }
    if (activeChannel === "announcements" && !isStaff) { setNotice({ type: "error", text: "Only CSBT staff can post announcements." }); return; }
    const clean = message.trim();
    if (!clean && !selectedImage) return;
    if (clean.length > MAX_POST_LENGTH) return;
    setPosting(true);
    setNotice(null);
    let uploadedPath: string | null = null;
    try {
      if (selectedImage) {
        if (!selectedImage.type.startsWith("image/") || selectedImage.size > MAX_IMAGE_SIZE) throw new Error("Images must be JPG, PNG, WebP, or GIF and 5 MB or smaller.");
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${sanitizeExtension(selectedImage)}`;
        const { error: uploadError } = await client.storage.from(STORAGE_BUCKET).upload(uploadedPath, selectedImage, { cacheControl: "3600", upsert: false, contentType: selectedImage.type });
        if (uploadError) throw uploadError;
      }
      const postingGame = scope === "all" ? postGame : scope;
      const payload = {
        user_id: user.id,
        display_name: currentDisplayName,
        content: clean,
        image_path: uploadedPath,
        channel_slug: activeChannel,
      };
      let result = await client.from("community_posts").insert({ ...payload, game_id: postingGame }).select("id,game_id,user_id,display_name,content,image_path,channel_slug,created_at,updated_at").single();
      if (result.error && postingGame === "adopt-me" && isLegacyGameSchemaError(result.error)) {
        result = await client.from("community_posts").insert(payload).select("id,user_id,display_name,content,image_path,channel_slug,created_at,updated_at").single() as typeof result;
      }
      if (result.error) throw new Error(postingGame === "mm2" && isLegacyGameSchemaError(result.error)
        ? "MM2 Lounge needs the included multi-game Supabase migration before posting."
        : result.error.message);
      const next = toPost(result.data as CommunityPostRow);
      setPosts((current) => [next, ...current.filter((post) => post.id !== next.id)]);
      setMessage("");
      setSelectedImage(null);
      setNotice({ type: "success", text: `Posted in #${currentChannel.label}.` });
    } catch (caught) {
      if (uploadedPath) await client.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      setNotice({ type: "error", text: caught instanceof Error ? caught.message : "Could not post to the Lounge." });
    } finally {
      setPosting(false);
    }
  }

  async function deletePost(post: CommunityPost) {
    const client = supabase;
    if (!client || !user || post.user_id !== user.id) return;
    if (!window.confirm("Delete this Lounge post?")) return;
    const { error } = await client.from("community_posts").delete().eq("id", post.id);
    if (error) { setNotice({ type: "error", text: error.message }); return; }
    if (post.image_path) await client.storage.from(STORAGE_BUCKET).remove([post.image_path]);
    setPosts((current) => current.filter((item) => item.id !== post.id));
  }

  async function toggleReaction(postId: string, emoji: string) {
    const client = supabase;
    if (!client || !user) { setNotice({ type: "info", text: "Sign in to react." }); return; }
    const existing = reactions.find((reaction) => reaction.post_id === postId && reaction.user_id === user.id && reaction.emoji === emoji);
    if (existing) {
      const { error } = await client.from("community_reactions").delete().eq("id", existing.id);
      if (error) setNotice({ type: "error", text: error.message });
    } else {
      const { error } = await client.from("community_reactions").insert({ post_id: postId, user_id: user.id, emoji });
      if (error) setNotice({ type: "error", text: error.message });
    }
    void loadReactions(postIdsRef.current);
  }

  async function createReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !user || !threadPost) return;
    const clean = replyText.trim();
    if (!clean || clean.length > MAX_REPLY_LENGTH) return;
    setReplying(true);
    const { error } = await client.from("community_replies").insert({ post_id: threadPost.id, user_id: user.id, display_name: currentDisplayName, content: clean });
    setReplying(false);
    if (error) { setNotice({ type: "error", text: error.message }); return; }
    setReplyText("");
    void loadReplies(postIdsRef.current);
  }

  async function signOut() {
    const client = supabase;
    if (!client) return;
    await client.auth.signOut();
  }

  if (!supabase) {
    return <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"><h2 className="text-xl font-black">Supabase setup required</h2><p className="mt-2 text-sm">The CSBT Lounge needs your Supabase environment variables.</p></div>;
  }

  return (
    <section className="csbt-lounge relative overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground)] shadow-[var(--shadow-lg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,.16),transparent_42%),radial-gradient(circle_at_90%_25%,rgba(34,211,238,.08),transparent_32%)]" />

      <header className="relative flex min-h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${currentChannel.accent} font-black shadow-lg`}>{currentChannel.icon}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><h2 className="truncate text-base font-black sm:text-lg"># {currentChannel.label}</h2><span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live</span></div>
            <p className="truncate text-[11px] font-semibold text-white/40 sm:text-xs">{currentChannel.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!fixedGameId && <div className="hidden 2xl:block"><GameScopePicker scope={scope} baseHref={routeBasePath} compact /></div>}
          <div className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-white/55 sm:block">{activeMembers.length} here · {scopedPresenceMembers.length} online</div>
          <button type="button" onClick={() => setChannelDrawerOpen(true)} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black xl:hidden">Channels</button>
          {user && <button type="button" onClick={() => void signOut()} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-white/70 hover:bg-white/10">Sign out</button>}
        </div>
      </header>

      {!fixedGameId && (
        <div className="relative border-b border-white/[0.06] px-3 py-2 2xl:hidden">
          <GameScopePicker scope={scope} baseHref={routeBasePath} compact />
        </div>
      )}

      <div className="relative grid min-h-[720px] xl:min-h-[820px] xl:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="csbt-lounge-channel-rail hidden min-h-0 border-r border-[var(--border)] p-3 xl:block xl:p-4">
          <ChannelList activeChannel={activeChannel} counts={channelCounts} members={presenceMembers} onSelect={setActiveChannel} />
        </aside>

        <main className="csbt-lounge-feed relative flex min-h-0 min-w-0 flex-col">
          <div className="border-b border-white/[0.06] px-4 py-2 xl:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CHANNELS.slice(0, 6).map((channel) => <button key={channel.slug} onClick={() => setActiveChannel(channel.slug)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black ${activeChannel === channel.slug ? "bg-white text-slate-950" : "bg-white/[0.05] text-white/50"}`}># {channel.label}</button>)}
            </div>
          </div>

          <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-4 sm:px-4 xl:px-6 xl:py-6" style={{ scrollbarGutter: "stable" }}>
            {loading ? (
              <div className="space-y-3 p-3">{[1,2,3,4,5].map((item) => <div key={item} className="flex animate-pulse gap-3 rounded-xl p-3"><div className="h-10 w-10 rounded-full bg-white/10"/><div className="flex-1"><div className="h-3 w-36 rounded bg-white/10"/><div className="mt-3 h-3 w-4/5 rounded bg-white/5"/></div></div>)}</div>
            ) : visiblePosts.length ? (
              <>
                {hasOlder && (
                  <div className="mb-3 flex justify-center">
                    <button type="button" onClick={() => void loadOlderPosts()} disabled={loadingOlder} className="min-h-10 rounded-full border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-white/70 transition hover:bg-white/10 disabled:opacity-50">
                      {loadingOlder ? "Loading…" : "Load older messages"}
                    </button>
                  </div>
                )}
                <AnimatePresence initial={false}>
                {visiblePosts.map((post) => (
                  <LoungeMessage
                    key={post.id}
                    post={post}
                    profile={profiles[post.user_id]}
                    currentUserId={user?.id}
                    reactions={reactions.filter((reaction) => reaction.post_id === post.id)}
                    replyCount={replies.filter((reply) => reply.post_id === post.id).length}
                    now={now}
                    onReact={(emoji) => void toggleReaction(post.id, emoji)}
                    onThread={() => setThreadPostId(post.id)}
                    onDelete={() => void deletePost(post)}
                  />
                ))}
                </AnimatePresence>
              </>
            ) : (
              <div className="flex min-h-[480px] items-center justify-center px-6 text-center"><div className="max-w-sm"><div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${currentChannel.accent} text-2xl shadow-xl`}>{currentChannel.icon}</div><h3 className="mt-5 text-xl font-black">Welcome to #{currentChannel.label}</h3><p className="mt-2 text-sm leading-6 text-white/40">{currentChannel.description}. {activeChannel === "announcements" ? "Official updates will appear here." : "Start the conversation and make this channel yours."}</p></div></div>
            )}
          </div>

          <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_82%,var(--surface-2))] p-3 sm:p-4 xl:p-5">
            {notice && <div className={`mb-2 rounded-xl px-3 py-2 text-[11px] font-bold ${notice.type === "error" ? "bg-rose-500/10 text-rose-300" : notice.type === "success" ? "bg-emerald-400/10 text-emerald-300" : "bg-blue-400/10 text-blue-300"}`}>{notice.text}</div>}
            {authLoading ? <div className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" /> : !user ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="font-black">You’re viewing #{currentChannel.label}</p><p className="mt-1 text-xs leading-5 text-white/45">Sign in to join the live conversation, react to messages and open threads.</p></div><AuthMiniPanel onSession={setSession} /></div>
            ) : activeChannel === "announcements" && !isStaff ? (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] p-4"><span className="text-xl">📢</span><div><p className="text-sm font-black text-amber-200">Announcements are read-only</p><p className="mt-1 text-xs text-white/40">Only approved CSBT staff can publish in this channel.</p></div></div>
            ) : (
              <form onSubmit={createPost} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2.5 shadow-inner">
                {scope === "all" && (
                  <div className="mb-2 flex items-center gap-2 border-b border-white/[0.06] pb-2">
                    <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/30">Post to</span>
                    {(["adopt-me", "mm2"] as const).map((game) => {
                      const gameAdapter = getGameAdapter(game);
                      return <button key={game} type="button" onClick={() => setPostGame(game)} className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${postGame === game ? "bg-white text-slate-950" : "bg-white/[0.04] text-white/45"}`}>{gameAdapter.icon} {gameAdapter.shortName}</button>;
                    })}
                  </div>
                )}
                {imagePreview && <div className="relative mb-2 w-fit max-w-full overflow-hidden rounded-xl border border-white/10 bg-black/20"><Image src={imagePreview} alt="Upload preview" width={720} height={480} unoptimized className="max-h-44 h-auto max-w-full w-auto object-contain"/><button type="button" onClick={() => setSelectedImage(null)} className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black">Remove</button></div>}
                <div className="flex items-end gap-2">
                  <ProfileAvatar profile={currentProfile} displayName={currentDisplayName} size="sm" />
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} maxLength={MAX_POST_LENGTH} placeholder={`Message #${currentChannel.label}`} className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm font-medium leading-6 text-white outline-none placeholder:text-white/25" />
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > MAX_IMAGE_SIZE) { setNotice({ type: "error", text: "Images must be 5 MB or smaller." }); return; } setSelectedImage(file); }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg text-white/65 transition hover:bg-white/10 hover:text-white" aria-label="Attach image">＋</button>
                  <button disabled={posting || (!message.trim() && !selectedImage)} className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 text-xs font-black shadow-lg disabled:opacity-35">{posting ? "…" : "Send"}</button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-2 text-[10px] font-black text-white/40">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 hover:bg-white/[0.08]">📷 Image</button>
                  <Link href={fixedGameId ? exchangeBasePath : `${exchangeBasePath}?game=${scope === "all" ? postGame : scope}`} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 hover:bg-white/[0.08]">⇄ Share Listing</Link>
                  <Link href={getGameAdapter(scope === "all" ? postGame : scope).calculatorHref} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 hover:bg-white/[0.08]">⚖️ Share Trade</Link>
                  <Link href={getGameAdapter(scope === "all" ? postGame : scope).valuesHref} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5 hover:bg-white/[0.08]">◇ Share Value</Link>
                  <span className="ml-auto hidden sm:inline">{MAX_POST_LENGTH - message.length} left</span>
                </div>
              </form>
            )}
          </div>
        </main>

        <aside className="csbt-lounge-activity hidden min-h-0 border-l border-[var(--border)] p-4 2xl:block 2xl:p-5">
          <RightActivityPanel scope={scope} user={user} profile={currentProfile} displayName={currentDisplayName} presence={scopedPresenceMembers} activeMembers={activeMembers} trendingChannels={trendingChannels} counts={channelCounts} recentPosts={posts.slice(0, 4)} profiles={profiles} exchangeBasePath={exchangeBasePath} tradeOpinionsBasePath={tradeOpinionsBasePath} fixedGameId={fixedGameId} />
        </aside>
      </div>

      <AnimatePresence>{channelDrawerOpen && <ChannelDrawer activeChannel={activeChannel} counts={channelCounts} members={presenceMembers} onSelect={(slug) => { setActiveChannel(slug); setChannelDrawerOpen(false); }} onClose={() => setChannelDrawerOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{threadPost && <ThreadDrawer post={threadPost} profile={profiles[threadPost.user_id]} replies={threadReplies} profiles={profiles} user={user} replyText={replyText} setReplyText={setReplyText} replying={replying} onSubmit={createReply} onClose={() => { setThreadPostId(null); setReplyText(""); }} />}</AnimatePresence>
    </section>
  );
}

function ChannelList({ activeChannel, counts, members, onSelect }: { activeChannel: ChannelSlug; counts: Map<ChannelSlug, number>; members: PresenceMember[]; onSelect: (slug: ChannelSlug) => void }) {
  return <div className="space-y-5"><div className="px-2"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">Community spaces</p><p className="mt-1 text-xs font-semibold text-white/45">Pick a room for the conversation.</p></div>{CHANNEL_GROUPS.map((group) => <section key={group.title}><p className="mb-1.5 px-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/25">{group.title}</p><div className="space-y-0.5">{group.channels.map((channel) => { const active = activeChannel === channel.slug; const online = members.filter((member) => member.channel === channel.slug).length; return <button key={channel.slug} onClick={() => onSelect(channel.slug)} className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${active ? "bg-white/[0.09] text-white shadow-sm" : "text-white/45 hover:bg-white/[0.045] hover:text-white/75"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? `bg-gradient-to-br ${channel.accent} text-white` : "bg-white/[0.04]"}`}>{channel.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-black">{channel.label}</span><span className="block truncate text-[9px] font-semibold opacity-45">{online ? `${online} here` : `${counts.get(channel.slug) ?? 0} posts`}</span></span>{online > 0 && <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.6)]"/>}</button>; })}</div></section>)}</div>;
}

function LoungeMessage({ post, profile, currentUserId, reactions, replyCount, now, onReact, onThread, onDelete }: { post: CommunityPost; profile?: CommunityProfile; currentUserId?: string; reactions: ReactionRow[]; replyCount: number; now: number; onReact: (emoji: string) => void; onThread: () => void; onDelete: () => void }) {
  const displayName = profile?.display_name?.trim() || post.display_name;
  const own = post.user_id === currentUserId;
  const grouped = REACTIONS.map((emoji) => ({ emoji, count: reactions.filter((reaction) => reaction.emoji === emoji).length, mine: reactions.some((reaction) => reaction.emoji === emoji && reaction.user_id === currentUserId) }));
  return <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group relative flex gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-[var(--border)] hover:bg-[color-mix(in_srgb,var(--surface-3)_48%,transparent)] sm:px-4 xl:gap-4 xl:px-5 xl:py-4">
    <div className="relative pt-0.5"><ProfileAvatar profile={profile} displayName={displayName}/><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0c1222] bg-emerald-400"/></div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="font-black text-white">{displayName}</span><span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-black text-white/35">{getGameAdapter(post.game_id).icon} {getGameAdapter(post.game_id).shortName}</span>{own && <span className="rounded bg-violet-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-violet-300">you</span>}<span className="text-[10px] font-semibold text-white/25">{formatRelativeTime(post.created_at, now)}</span>{own && <button type="button" onClick={onDelete} className="ml-auto text-[10px] font-black text-white/20 opacity-0 transition hover:text-rose-300 group-hover:opacity-100">Delete</button>}</div>
      {post.content && <p className="mt-1 whitespace-pre-wrap break-words text-[13px] font-medium leading-6 text-white/78 sm:text-sm">{post.content}</p>}
      {post.image_url && <a href={post.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 block w-fit max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-lg"><Image src={post.image_url} alt={`Shared by ${displayName}`} width={1200} height={800} unoptimized className="max-h-[520px] h-auto max-w-full w-auto object-contain"/></a>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">{grouped.filter((item) => item.count > 0).map((item) => <button key={item.emoji} type="button" onClick={() => onReact(item.emoji)} className={`rounded-lg border px-2 py-1 text-[10px] font-black transition ${item.mine ? "border-violet-400/35 bg-violet-400/12 text-violet-200" : "border-white/[0.08] bg-white/[0.035] text-white/55 hover:bg-white/[0.07]"}`}>{item.emoji} {item.count}</button>)}<ReactionPicker onReact={onReact}/><button type="button" onClick={onThread} className={`rounded-lg px-2 py-1 text-[10px] font-black transition ${replyCount ? "bg-blue-400/10 text-blue-300" : "text-white/30 hover:bg-white/[0.05] hover:text-white/60"}`}>↩ {replyCount ? `${replyCount} ${replyCount === 1 ? "reply" : "replies"}` : "Reply"}</button></div>
    </div>
  </motion.article>;
}

function ReactionPicker({ onReact }: { onReact: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="relative"><button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[10px] font-black text-white/30 hover:bg-white/[0.06] hover:text-white/60">＋ react</button>{open && <div className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-xl border border-white/10 bg-[#11182c] p-1.5 shadow-2xl">{REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => { onReact(emoji); setOpen(false); }} className="min-w-8 rounded-lg px-1.5 py-1.5 text-xs font-black hover:bg-white/10">{emoji}</button>)}</div>}</div>;
}

function RightActivityPanel({ scope, user, profile, displayName, presence, activeMembers, trendingChannels, counts, recentPosts, profiles, exchangeBasePath = "/exchange", tradeOpinionsBasePath = "/trade-opinions", fixedGameId }: { scope: CSBTGameScope; user: User | null; profile?: CommunityProfile; displayName: string; presence: PresenceMember[]; activeMembers: PresenceMember[]; trendingChannels: ChannelDefinition[]; counts: Map<ChannelSlug, number>; recentPosts: CommunityPost[]; profiles: Record<string, CommunityProfile>; exchangeBasePath?: string; tradeOpinionsBasePath?: string; fixedGameId?: CSBTGameId }) {
  const actionGame: CSBTGameId = scope === "mm2" ? "mm2" : "adopt-me";
  const actionAdapter = getGameAdapter(actionGame);
  return <div className="space-y-5"><section><p className="text-[9px] font-black uppercase tracking-[.17em] text-white/25">Live now</p><div className="mt-2 grid grid-cols-2 gap-2"><Stat value={String(presence.length)} label="online"/><Stat value={String(activeMembers.length)} label="in channel"/></div></section>
    {user && <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3"><div className="flex items-center gap-3"><ProfileAvatar profile={profile} displayName={displayName} size="lg"/><div className="min-w-0"><p className="truncate text-sm font-black">{displayName}</p><p className="mt-0.5 text-[10px] font-semibold text-emerald-300">● Online in CSBT Lounge</p></div></div><Link href="/profile" className="mt-3 block rounded-xl bg-white/[0.05] px-3 py-2 text-center text-[10px] font-black text-white/55 hover:bg-white/[0.08]">Edit profile</Link></section>}
    <section><p className="text-[9px] font-black uppercase tracking-[.17em] text-white/25">Trending rooms</p><div className="mt-2 space-y-1.5">{trendingChannels.map((channel, index) => <div key={channel.slug} className="flex items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2"><span className="text-[10px] font-black text-white/20">0{index+1}</span><span className="min-w-0 flex-1 truncate text-xs font-black text-white/65"># {channel.label}</span><span className="text-[9px] font-black text-white/25">{counts.get(channel.slug) ?? 0}</span></div>)}</div></section>
    <section><p className="text-[9px] font-black uppercase tracking-[.17em] text-white/25">Quick actions</p><div className="mt-2 grid gap-1.5"><QuickLink href={fixedGameId ? exchangeBasePath : `${exchangeBasePath}?game=${actionGame}`} label="🔄 Find a trade"/><QuickLink href={fixedGameId ? tradeOpinionsBasePath : `${tradeOpinionsBasePath}?game=${actionGame}`} label="🗳️ Ask Trade Opinions"/>{actionGame === "adopt-me" && <QuickLink href="/nich" label="🤖 Ask Nich"/>}<QuickLink href={actionAdapter.valuesHref} label="◇ Check a value"/></div></section>
    <section><p className="text-[9px] font-black uppercase tracking-[.17em] text-white/25">Recent activity</p><div className="mt-2 space-y-2">{recentPosts.map((post) => { const name = profiles[post.user_id]?.display_name || post.display_name; return <div key={post.id} className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400"/><p className="text-[10px] leading-4 text-white/35"><strong className="text-white/60">{name}</strong> posted in #{CHANNEL_MAP.get(post.channel_slug)?.label ?? "general"}</p></div>; })}</div></section>
  </div>;
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"><p className="text-xl font-black">{value}</p><p className="mt-0.5 text-[9px] font-black uppercase tracking-[.12em] text-white/25">{label}</p></div>; }
function QuickLink({ href, label }: { href: string; label: string }) { return <Link href={href} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 text-[11px] font-black text-white/55 transition hover:bg-white/[0.06] hover:text-white">{label}</Link>; }

function ChannelDrawer({ activeChannel, counts, members, onSelect, onClose }: { activeChannel: ChannelSlug; counts: Map<ChannelSlug, number>; members: PresenceMember[]; onSelect: (slug: ChannelSlug) => void; onClose: () => void }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] xl:hidden"><button type="button" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Close channels"/><motion.aside initial={{ x: -30 }} animate={{ x: 0 }} exit={{ x: -30 }} className="absolute inset-y-0 left-0 w-[min(320px,88vw)] overflow-y-auto border-r border-white/10 bg-[#090e1b] p-4 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">CSBT Lounge</p><h3 className="mt-1 text-xl font-black">Channels</h3></div><button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/5 font-black">×</button></div><ChannelList activeChannel={activeChannel} counts={counts} members={members} onSelect={onSelect}/></motion.aside></motion.div>;
}

function ThreadDrawer({ post, profile, replies, profiles, user, replyText, setReplyText, replying, onSubmit, onClose }: { post: CommunityPost; profile?: CommunityProfile; replies: ReplyRow[]; profiles: Record<string, CommunityProfile>; user: User | null; replyText: string; setReplyText: (value: string) => void; replying: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const parentName = profile?.display_name || post.display_name;
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[115]"><button type="button" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close thread"/><motion.aside initial={{ x: 40 }} animate={{ x: 0 }} exit={{ x: 40 }} className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col border-l border-white/10 bg-[#0b1020] shadow-2xl"><header className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-300">Thread</p><h3 className="mt-1 font-black">Replies to {parentName}</h3></div><button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/5 font-black">×</button></header><div className="flex-1 overflow-y-auto p-4"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="flex items-center gap-2"><ProfileAvatar profile={profile} displayName={parentName} size="sm"/><span className="text-sm font-black">{parentName}</span></div>{post.content && <p className="mt-3 text-sm leading-6 text-white/70">{post.content}</p>}</div><div className="my-4 flex items-center gap-3 text-[9px] font-black uppercase tracking-[.15em] text-white/20"><span className="h-px flex-1 bg-white/10"/>{replies.length} replies<span className="h-px flex-1 bg-white/10"/></div><div className="space-y-4">{replies.map((reply) => { const replyProfile = profiles[reply.user_id]; const name = replyProfile?.display_name || reply.display_name; return <div key={reply.id} className="flex gap-3"><ProfileAvatar profile={replyProfile} displayName={name} size="sm"/><div><div className="flex items-baseline gap-2"><span className="text-xs font-black">{name}</span><span className="text-[9px] text-white/20">{formatRelativeTime(reply.created_at)}</span></div><p className="mt-1 text-xs leading-5 text-white/65">{reply.content}</p></div></div>; })}</div></div><div className="border-t border-white/10 p-3">{user ? <form onSubmit={onSubmit} className="flex items-end gap-2 rounded-2xl bg-white/[0.04] p-2"><textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={2} maxLength={MAX_REPLY_LENGTH} placeholder="Reply to thread…" className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-xs text-white outline-none placeholder:text-white/25"/><button disabled={replying || !replyText.trim()} className="rounded-xl bg-blue-500 px-4 py-2.5 text-xs font-black disabled:opacity-35">Reply</button></form> : <p className="rounded-xl bg-white/[0.04] p-3 text-center text-xs font-semibold text-white/35">Sign in to reply.</p>}</div></motion.aside></motion.div>;
}
