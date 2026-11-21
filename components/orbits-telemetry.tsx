"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function sessionKey() {
  const key = "orbits-telemetry-session";
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(key, value);
  }
  return value;
}

function deviceClass() {
  if (window.innerWidth < 700) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

export function OrbitsTelemetry() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let disposed = false;

    async function send(action: "start" | "ping" | "end") {
      if (disposed || (document.hidden && action !== "end")) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user?.id) return;
      await supabase.functions.invoke("orbits-telemetry", {
        body: {
          action,
          app: "fellow",
          session_key: sessionKey(),
          page_path: location.pathname + location.search,
          device_class: deviceClass(),
        },
      }).catch(() => {});
    }

    void send("start");
    timer.current = setInterval(() => { void send("ping"); }, 60_000);
    const onVisibility = () => { if (!document.hidden) void send("ping"); };
    const onPageHide = () => { void send("end"); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [supabase]);

  // Navigation history is stored only for server-verified managed practice learners.
  // Pathnames only: never record query strings, form answers, or other websites.
  useEffect(() => {
    if (document.hidden || !/^\/[a-zA-Z0-9/_-]*$/.test(pathname) || pathname.length > 160) return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user?.id) return;
      try {
        await fetch("/api/practice/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pagePath: pathname }),
          cache: "no-store",
        });
      } catch {
        // Navigation tracking must never prevent students using Fellow.
      }
    })();
  }, [pathname, supabase]);

  useEffect(() => {
    void (async () => {
      if (document.hidden) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user?.id) return;
      await supabase.functions.invoke("orbits-telemetry", {
        body: {
          action: "ping",
          app: "fellow",
          session_key: sessionKey(),
          page_path: pathname,
          device_class: deviceClass(),
        },
      }).catch(() => {});
    })();
  }, [pathname, supabase]);

  return null;
}
