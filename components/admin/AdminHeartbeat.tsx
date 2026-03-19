"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function ping() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      await fetch("/api/admin/activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          event_type: "presence",
          event_label: "User active on platform",
          update_last_seen: true,
        }),
      });
    }

    ping();

    const interval = setInterval(() => {
      ping();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}
