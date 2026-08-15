"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "./useAuthSession";

export function useUnreadNotifications() {
  const { supabase, user } = useAuthSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!supabase || !user) {
      queueMicrotask(() => setCount(0));
      return;
    }

    // Capture the narrowed values for async callbacks. TypeScript cannot
    // guarantee that hook-derived nullable values stay non-null inside a
    // nested async function, even though this effect already guarded them.
    const client = supabase;
    const currentUser = user;
    let active = true;

    async function load() {
      const { count: nextCount } = await client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUser.id)
        .is("read_at", null);
      if (active && typeof nextCount === "number") setCount(nextCount);
    }

    void queueMicrotask(() => load());

    const channel = client
      .channel(`csbt-notifications-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${currentUser.id}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [supabase, user]);

  return count;
}
